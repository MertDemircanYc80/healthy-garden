import { Pressable, Text, View } from "react-native";
import { useSoundPreference } from "@/state/Sounds";
import { SoundIcon } from "./Icons";
import { C, R } from "@/theme";

export function SoundToggle({ top, night }: { top: number; night: boolean }) {
  const { muted, ready, saving, error, toggle } = useSoundPreference();
  return <View style={{ position: "absolute", top, right: 18, alignItems: "flex-end" }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={error ? "Retry saving sound preference" : muted ? "Unmute sounds" : "Mute sounds"}
      accessibilityState={{ disabled: !ready || saving }}
      disabled={!ready || saving}
      onPress={() => { void toggle(); }}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: R.pill, alignItems: "center", justifyContent: "center", opacity: pressed || !ready ? 0.6 : 1, backgroundColor: night ? "rgba(22,48,31,0.75)" : "rgba(255,255,255,0.82)" })}
    >
      <SoundIcon color={night ? C.mist : C.pine} muted={muted} />
    </Pressable>
    {error && <Text accessibilityRole="alert" style={{ width: 125, backgroundColor: C.pine, color: C.mist, padding: 8, borderRadius: 10, fontSize: 12 }}>Sound setting wasn’t saved. Tap to retry.</Text>}
  </View>;
}
