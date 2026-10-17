import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MARKET_ITEMS, type ItemId } from "@/lib/market";
import { plotNumber, type GardenPlot } from "@/lib/gardenPlots";
import { useApp } from "@/state/AppState";
import { C, F, R, T } from "@/theme";

export function PlantingSheet({ plot, onClose }: { plot: GardenPlot; onClose: () => void }) {
  const { today, inventory, plantInPlot } = useApp();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function plant(id: ItemId, buyIfNeeded: boolean) {
    setBusy(true);
    try {
      const result = await plantInPlot(id, plot, buyIfNeeded);
      if (result.ok) onClose();
      else setError(result.message);
    } finally { setBusy(false); }
  }
  return <Modal transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(8,20,12,0.45)" }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel planting" disabled={busy} onPress={onClose} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
      <View style={{ maxHeight: "80%", width: "100%", maxWidth: 600, alignSelf: "center", backgroundColor: C.pine, borderTopLeftRadius: R.island, borderTopRightRadius: R.island, padding: 20, paddingBottom: Math.max(insets.bottom, 16) }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Text accessibilityRole="header" style={{ color: C.mist, fontFamily: F.display, fontSize: T.title }}>Plant in plot {plotNumber(plot)}</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={{ padding: 12 }}><Text style={{ color: C.moss }}>Cancel</Text></Pressable>
        </View>
        <Text style={{ color: C.sun, fontWeight: "700", marginTop: 6 }}>{today.coins.toLocaleString()} gold available</Text>
        <Text style={{ color: C.fern, fontSize: T.small, lineHeight: 20, marginVertical: 12 }}>Choose a plant. Use one you own, or buy and plant it here in one step.</Text>
        {error !== "" && <Text accessibilityRole="alert" style={{ color: C.berry, marginBottom: 12 }}>{error}</Text>}
        <ScrollView>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {MARKET_ITEMS.filter(item => item.category === "Plants").map(item => {
              const owned = inventory[item.id];
              const canPlant = owned > 0 || today.coins >= item.price;
              return <View key={item.id} style={{ flexBasis: "46%", flexGrow: 1, backgroundColor: C.pineRaised, borderRadius: R.card, padding: 12 }}>
                <Text style={{ fontSize: 30 }}>{item.icon}</Text>
                <Text style={{ color: C.mist, fontWeight: "700", marginTop: 8 }}>{item.name}</Text>
                <Text style={{ color: C.fern, marginVertical: 8 }}>{owned} owned{owned ? " · uses 1" : ` · ${item.price} gold`}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={owned ? `Plant owned ${item.name} in plot ${plotNumber(plot)}` : `Buy and plant ${item.name} for ${item.price} gold in plot ${plotNumber(plot)}`} disabled={busy || !canPlant} onPress={() => { void plant(item.id, owned === 0); }} style={{ paddingVertical: 12, paddingHorizontal: 6, minHeight: 44, alignItems: "center", borderRadius: R.pill, backgroundColor: canPlant ? C.moss : C.pineLine, opacity: busy ? 0.6 : 1 }}>
                  <Text style={{ color: canPlant ? C.pine : C.fern, fontWeight: "700", textAlign: "center" }}>{!canPlant ? "Not enough gold" : owned ? "Plant owned" : "Buy & plant"}</Text>
                </Pressable>
              </View>;
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
