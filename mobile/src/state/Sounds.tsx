import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from "expo-audio";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { createGardenSounds, type GardenSound, type SoundDriver } from "@/lib/gardenSounds";

const VOLUME = 0.28;
function createDriver(players: Record<GardenSound, AudioPlayer>): SoundDriver {
  let stopCurrent = () => {};
  return {
    stop: () => stopCurrent(),
    play(sound) {
      const player = players[sound];
      return new Promise<void>(resolve => {
        let done = false;
        let fading = false;
        let fade: ReturnType<typeof setInterval> | undefined;
        let monitor: ReturnType<typeof setInterval> | undefined;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          if (fade) clearInterval(fade);
          if (monitor) clearInterval(monitor);
          try { player.pause(); } catch { /* Player may already be released on unmount. */ }
          stopCurrent = () => {};
          resolve();
        };
        // Unavailable media or a browser autoplay block must never hold the queue forever.
        const timeout = setTimeout(finish, 2000);
        stopCurrent = () => {
          if (done || fading) return;
          fading = true;
          let step = 0;
          fade = setInterval(() => {
            try { player.volume = VOLUME * Math.max(0, 1 - ++step / 4); } catch { finish(); }
            if (step === 4) finish();
          }, 12);
        };
        player.volume = VOLUME;
        void player.seekTo(0).then(() => {
          if (done || fading) return;
          player.play();
          monitor = setInterval(() => {
            try {
              const status = player.currentStatus;
              // Native snapshots report didJustFinish only in events; also check the ended position.
              if (status.didJustFinish || (status.duration > 0 && !status.playing && status.currentTime >= status.duration - 0.01)) finish();
            } catch { finish(); }
          }, 25);
        }).catch(finish);
      });
    },
  };
}
const Context = createContext<ReturnType<typeof createGardenSounds> | null>(null);
export function SoundsProvider({ children }: { children: React.ReactNode }) {
  // Metro requires static asset references for native and web bundles.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const water = useAudioPlayer(require("../../assets/sounds/water.wav"), { updateInterval: 50 });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fertilize = useAudioPlayer(require("../../assets/sounds/fertilize.wav"), { updateInterval: 50 });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const plant = useAudioPlayer(require("../../assets/sounds/plant.wav"), { updateInterval: 50 });
  const sounds = useMemo(() => createGardenSounds(AsyncStorage, createDriver({ water, fertilize, plant })), [water, fertilize, plant]);
  useEffect(() => {
    void sounds.load();
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: "mixWithOthers" }).catch(() => {});
    const sub = AppState.addEventListener("change", status => { if (status !== "active") sounds.clear(); });
    const hide = () => { if (document.hidden) sounds.clear(); };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", hide);
    return () => {
      sub.remove(); sounds.dispose();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", hide);
    };
  }, [sounds]);
  return <Context.Provider value={sounds}>{children}</Context.Provider>;
}
export function useGardenSounds() {
  const sounds = useContext(Context);
  if (!sounds) throw new Error("SoundsProvider is missing");
  return sounds;
}
export function useSoundPreference() {
  const sounds = useGardenSounds();
  const preference = useSyncExternalStore(sounds.subscribe, sounds.snapshot, sounds.snapshot);
  return { ...preference, toggle: sounds.toggle };
}
