export type GardenSound = "water" | "fertilize" | "plant";
export const SOUND_PREFERENCE_KEY = "healthgarden:sound-muted:v1";
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export interface SoundDriver { play(sound: GardenSound): Promise<void>; stop(): void }

/** One FIFO for all action sounds. Audio failures never affect saved garden actions. */
export function createGardenSounds(storage: Storage, driver: SoundDriver) {
  let state = { muted: true, ready: false, saving: false, error: false };
  const listeners = new Set<() => void>();
  const queue: GardenSound[] = [];
  let playing = false;
  let active = true;
  let loadVersion = 0;
  const publish = () => listeners.forEach(fn => fn());
  const clear = () => { queue.length = 0; driver.stop(); };
  async function drain() {
    if (playing) return;
    playing = true;
    try {
      while (active && state.ready && !state.muted && queue.length) {
        try { await driver.play(queue.shift()!); } catch { /* Audio is optional feedback. */ }
      }
    } finally { playing = false; }
  }
  return {
    snapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    async load() {
      active = true;
      const version = ++loadVersion;
      try {
        const value = await storage.getItem(SOUND_PREFERENCE_KEY);
        if (active && version === loadVersion) state = { ...state, muted: value === "true", ready: true };
      } catch { if (active && version === loadVersion) state = { ...state, ready: true, error: true }; }
      if (active && version === loadVersion) publish();
    },
    async toggle() {
      if (!state.ready || state.saving) return;
      // A failed save can be retried without changing the current audible preference.
      state = { ...state, muted: state.error ? state.muted : !state.muted, saving: true, error: false };
      if (state.muted) clear();
      publish();
      try { await storage.setItem(SOUND_PREFERENCE_KEY, String(state.muted)); }
      catch { state = { ...state, error: true }; }
      state = { ...state, saving: false }; publish();
    },
    play(sound: GardenSound) {
      if (!active || !state.ready || state.muted) return;
      queue.push(sound); void drain();
    },
    clear,
    dispose() { active = false; loadVersion++; clear(); },
  };
}
