// Demo controls: step through the sample week for a demo video, or start over.
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useState } from "react";
import { styles as u } from "@/components/ui";
import { STARTING_COINS } from "@/lib/market";
import { useApp } from "@/state/AppState";
import { C, F, R, T } from "@/theme";

export function DemoSheet({ open, onClose, onShowGuide }: { open: boolean; onClose: () => void; onShowGuide: () => void }) {
  const { demo, today, isDemo, switchMode } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(8,20,12,0.45)", justifyContent: "flex-end", padding: 12 }} onPress={onClose} accessibilityLabel="Close demo controls">
        <Pressable onPress={() => {}} style={{ backgroundColor: C.pine, borderRadius: R.island, maxHeight: "90%" }}>
          <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 26 }}>
          <Text style={{ color: C.mist, fontFamily: F.display, fontSize: T.title }}>{isDemo ? "Demo week" : "Garden settings"}</Text>
          <Text style={[u.muted, { marginTop: 6 }]}>
            {isDemo ? "This garden uses sample data. Its gold and plants are kept separate from your personal garden." : "Your garden follows your local calendar. Watering and fertilizer become available each new day, including after reopening the app."}
          </Text>
          <Text style={[u.muted, { marginTop: 8 }]}>{isDemo ? `Goals and suggestions written by: ${demo.coachSource}.` : "Personal goals are calculated on this device from your recorded totals."}</Text>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 16 }}>
            <Text style={{ color: C.sun, fontFamily: F.display, fontSize: 26 }}>{demo.dateLabel}</Text>
            <Text style={u.muted}>{today.coins} coins</Text>
          </View>

          <Pressable accessibilityRole="button" onPress={() => { void switchMode().then(onClose); }} style={{ paddingVertical: 14 }}>
            <Text style={{ color: C.moss, fontWeight: "700" }}>{isDemo ? "Return to my garden" : "Try the sample garden"}</Text>
          </Pressable>
          {isDemo && <><Pressable
            disabled={!demo.canGoForward}
            onPress={() => {
              demo.nextDay();
              onClose();
            }}
            style={({ pressed }) => ({
              marginTop: 14,
              backgroundColor: demo.canGoForward ? C.moss : C.pineLine,
              borderRadius: R.pill,
              paddingVertical: 13,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: demo.canGoForward ? C.pine : C.fern, fontWeight: "700", fontSize: T.body }}>
              {demo.canGoForward ? "Next day" : "End of the demo week"}
            </Text>
          </Pressable>
          <Text style={[u.muted, { marginTop: 8, textAlign: "center" }]}>
            Finishes today: pays coins for goals hit and grows the plants you watered.
          </Text></>}

          <Pressable accessibilityRole="button" onPress={() => { onClose(); onShowGuide(); }} style={{ paddingVertical: 14 }}><Text style={{ color: C.moss, fontWeight: "700" }}>How to play</Text></Pressable>
          <Pressable
            onPress={() => {
              setConfirmReset(true);
            }}
            style={({ pressed }) => ({ marginTop: 14, alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: C.fern, fontWeight: "600" }}>Reset saved garden</Text>
          </Pressable>
          {confirmReset && <View style={{ marginTop: 12, gap: 12 }}>
            <Text style={u.muted}>Clear garden progress and inventory and restore {STARTING_COINS} gold with an empty garden?</Text>
            <Pressable accessibilityRole="button" onPress={() => { demo.reset(); setConfirmReset(false); onClose(); }} style={{ paddingVertical: 10 }}><Text style={{ color: C.berry, fontWeight: "700" }}>Confirm reset</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirmReset(false)} style={{ paddingVertical: 10 }}><Text style={{ color: C.mist }}>Cancel</Text></Pressable>
          </View>}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
