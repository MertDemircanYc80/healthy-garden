// Demo controls: step through the sample week for a demo video, or start over.
import { Modal, Pressable, Text, View } from "react-native";
import { styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { C, F, R, T } from "@/theme";

export function DemoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { demo, today } = useApp();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(8,20,12,0.45)", justifyContent: "flex-end", padding: 12 }} onPress={onClose} accessibilityLabel="Close demo controls">
        <Pressable onPress={() => {}} style={{ backgroundColor: C.pine, borderRadius: R.island, padding: 22, paddingBottom: 26 }}>
          <Text style={{ color: C.mist, fontFamily: F.display, fontSize: T.title }}>Demo week</Text>
          <Text style={[u.muted, { marginTop: 6 }]}>
            This is sample data for a demo persona — 30 days of phone and watch data. On a real iPhone it comes from Apple Health.
          </Text>
          <Text style={[u.muted, { marginTop: 8 }]}>Goals and suggestions written by: {demo.coachSource}.</Text>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 16 }}>
            <Text style={{ color: C.sun, fontFamily: F.display, fontSize: 26 }}>{demo.dateLabel}</Text>
            <Text style={u.muted}>{today.coins} coins</Text>
          </View>

          <Pressable
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
          </Text>

          <Pressable
            onPress={() => {
              demo.reset();
              onClose();
            }}
            style={({ pressed }) => ({ marginTop: 14, alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: C.fern, fontWeight: "600" }}>Start over</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
