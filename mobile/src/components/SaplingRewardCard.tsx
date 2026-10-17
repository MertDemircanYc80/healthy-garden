import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useApp } from "@/state/AppState";
import { SAPLING_REWARD } from "@/lib/saplingReward";
import { C, F, R, T } from "@/theme";

export function SaplingRewardCard() {
  const { sapling, claimSapling, isDemo } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const unlocked = !isDemo && sapling.unlocked;
  const claimed = !isDemo && sapling.claimed;
  const accent = unlocked ? C.sun : C.fern;
  const percent = Math.floor(sapling.completion * 100);
  async function claim() {
    setBusy(true);
    try { const result = await claimSapling(); setMessage(result.message); }
    finally { setBusy(false); }
  }
  return <View style={{ backgroundColor: C.pineRaised, borderRadius: R.card, borderWidth: 1, borderColor: unlocked ? C.sun : C.pineLine, padding: 18, marginBottom: 24 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <Text style={{ color: accent, letterSpacing: 1, fontSize: T.tiny, fontWeight: "700" }}>SPECIAL REWARD</Text>
      <Text style={{ color: accent, fontSize: T.small, fontWeight: "600" }}>{claimed ? "Claimed" : unlocked ? "Unlocked" : "Locked"}</Text>
    </View>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, color: unlocked ? C.mist : C.fern, fontSize: T.title, marginTop: 10 }}>Real Sapling Discount</Text>
    <Text style={{ color: accent, fontFamily: F.display, fontSize: 30, marginTop: 8 }}>{SAPLING_REWARD.discount}% off a sapling</Text>
    <Text style={{ color: C.fern, fontSize: T.small, lineHeight: 19, marginTop: 8 }}>Placeholder reward only. This is a fake code, with no store, payment or real redemption attached.</Text>
    {isDemo ? <Text style={{ color: C.fern, fontSize: T.body, lineHeight: 21, marginTop: 14 }}>Earn this in your personal garden. Sample dates and goals do not count.</Text> : unlocked ? <View style={{ marginTop: 14, padding: 14, backgroundColor: C.pine, borderRadius: 12 }}>
      <Text style={{ color: C.fern, fontSize: T.small }}>Your placeholder code</Text>
      <Text selectable style={{ color: C.sun, fontSize: 19, fontWeight: "700", marginTop: 5 }}>{SAPLING_REWARD.code}</Text>
      {claimed && <Text style={{ color: C.moss, marginTop: 8, fontSize: T.small }}>Claim saved on this device. This reward can only be claimed once.</Text>}
    </View> : <View style={{ marginTop: 16, gap: 10 }}>
      <Text style={{ color: C.fern, fontSize: T.body }}>{sapling.days} / {SAPLING_REWARD.days} days since you started</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Days toward sapling reward" accessibilityValue={{ min: 0, max: 30, now: sapling.days }} style={{ height: 6, backgroundColor: C.pine, borderRadius: 3 }}><View style={{ height: 6, width: `${sapling.days / 30 * 100}%`, backgroundColor: C.fern, borderRadius: 3 }} /></View>
      <Text style={{ color: C.fern, fontSize: T.body }}>{percent}% of goals done · 80% needed</Text>
      <Text style={{ color: C.fern, fontSize: T.small, lineHeight: 19 }}>{sapling.total ? `${sapling.completed} of ${sapling.total} assigned goals met in the last 30 completed days.` : "No completed-day goals yet. Record health totals to build your personal goals."} Today’s goals count after midnight; missing readings don’t count as completed.</Text>
      <Text style={{ color: C.fern, fontSize: T.body }}>Garden health: {Math.floor(sapling.health * 100)}% · 80% needed</Text>
      <Text style={{ color: C.fern, fontSize: T.small }}>Keep at least one plant in your garden, too.</Text>
    </View>}
    <Pressable accessibilityRole="button" accessibilityLabel={claimed ? "Sapling discount claimed" : "Claim sapling discount"} accessibilityState={{ disabled: !unlocked || claimed || busy }} disabled={!unlocked || claimed || busy} onPress={() => { void claim(); }} style={({ pressed }) => ({ minHeight: 44, borderRadius: R.pill, backgroundColor: unlocked && !claimed ? C.moss : C.pineLine, padding: 12, marginTop: 16, alignItems: "center", opacity: pressed || busy ? 0.6 : 1 })}>
      <Text style={{ color: unlocked && !claimed ? C.pine : C.fern, fontWeight: "700" }}>{claimed ? "Claimed" : busy ? "Saving claim…" : unlocked ? "Claim" : "Keep growing to unlock"}</Text>
    </Pressable>
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: C.moss, marginTop: 10, fontSize: T.small, lineHeight: 19 }}>{message}</Text>}
    <Text style={{ color: C.fern, marginTop: 12, fontSize: T.tiny, lineHeight: 16 }}>Saved on this device. Garden resets keep reward progress and claims. Clearing app/browser storage removes this local record.</Text>
  </View>;
}
