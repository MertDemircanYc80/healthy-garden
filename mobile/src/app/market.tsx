import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { CoinIcon } from "@/components/Icons";
import { MARKET_ITEMS, STARTING_COINS, type ItemId } from "@/lib/market";
import { useApp } from "@/state/AppState";
import { C, F, R, T } from "@/theme";

function ItemIcon({ id, icon }: { id: ItemId; icon: string }) {
  if (id === "watering_can") return <Svg width={42} height={42} viewBox="0 0 48 48" fill="none">
    <Path d="M32 20c12-12 16 10 2 9" stroke={C.sky} strokeWidth={4} />
    <Path d="M14 22 6 14 3 17 12 33M16 18v-4h12v5" stroke={C.sky} strokeWidth={3} strokeLinejoin="round" />
    <Rect x={12} y={20} width={22} height={19} rx={5} fill={C.sky} />
  </Svg>;
  if (id === "fertilizer") return <Svg width={42} height={42} viewBox="0 0 48 48" fill="none">
    <Path d="M15 8h18l-2 7 6 23a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3l6-23Z" fill={C.wood} />
    <Path d="M16 15h16" stroke={C.soilDark} strokeWidth={3} />
    <Path d="M24 34V23m0 6c-8 0-9-7-9-7 8 0 9 7 9 7Zm0-4c0-7 8-7 8-7 0 7-8 7-8 7Z" stroke={C.pine} strokeWidth={2} strokeLinejoin="round" />
  </Svg>;
  return <Text style={{ fontSize: 36 }}>{icon}</Text>;
}

export default function Market() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { today, inventory, buyItem, resetData } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const owned = MARKET_ITEMS.filter(item => inventory[item.id] > 0);

  async function buy(id: ItemId, name: string) {
    setBusy(true);
    const result = await buyItem(id);
    setMessage(result.ok ? `${name} added to your inventory.` : result.message);
    setBusy(false);
  }

  async function reset() {
    setBusy(true);
    const ok = await resetData();
    setMessage(ok ? `Fresh start: ${STARTING_COINS} coins and an empty inventory.` : "Couldn’t save the reset. Your data is unchanged. Try again.");
    if (ok) setConfirmReset(false);
    setBusy(false);
  }

  return <View style={{ flex: 1, backgroundColor: C.pine, paddingTop: insets.top }}>
    <StatusBar style="light" />
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to garden" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={styles.back}>
        <Text style={{ color: C.moss, fontSize: T.body, fontWeight: "600" }}>‹ Back to garden</Text>
      </Pressable>
      <View style={styles.headingRow}>
        <View><Text style={styles.eyebrow}>A LITTLE ROOM TO GROW</Text><Text accessibilityRole="header" style={styles.title}>Market</Text></View>
        <View accessibilityLabel={`${today.coins} coins available`} style={styles.balance}><CoinIcon size={20} /><Text style={styles.balanceText}>{today.coins}</Text></View>
      </View>
      <Text style={styles.muted}>Little additions for your growing garden.</Text>
      <Text accessibilityLiveRegion="polite" style={styles.notice}>{message || "Choose something lovely. Every purchase goes to your inventory."}</Text>
    </View>

    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
      <View style={styles.content}>
        {(["Plants", "Tools & supplies"] as const).map(category => <View key={category} style={{ marginBottom: 24 }}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{category}</Text>
          <View style={styles.grid}>{MARKET_ITEMS.filter(item => item.category === category).map(item => {
            const affordable = today.coins >= item.price;
            return <View key={item.id} style={styles.card}>
              <View style={styles.icon}><ItemIcon id={item.id} icon={item.icon} /></View>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={[styles.muted, { flex: 1, marginTop: 5 }]}>{item.description}</Text>
              <View style={styles.price}><CoinIcon size={15} /><Text style={{ color: C.sun, fontWeight: "700" }}>{item.price} coins</Text></View>
              <Text style={styles.owned}>{inventory[item.id]} in inventory</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Buy ${item.name} for ${item.price} coins`} accessibilityState={{ disabled: busy || !affordable }} disabled={busy || !affordable} onPress={() => { void buy(item.id, item.name); }} style={({ pressed }) => [styles.buy, { backgroundColor: affordable ? C.moss : C.pineLine, opacity: pressed || busy ? 0.6 : 1 }]}>
                <Text style={{ color: affordable ? C.pine : C.fern, fontWeight: "700", textAlign: "center" }}>{affordable ? "Buy" : "Not enough money"}</Text>
              </Pressable>
            </View>;
          })}</View>
        </View>)}

        <View style={styles.inventory}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Your inventory</Text>
          {owned.length === 0 ? <Text style={styles.muted}>Your shed is empty. Purchased plants and supplies will appear here.</Text> : owned.map(item => <View key={item.id} style={styles.inventoryRow}>
            <Text style={{ color: C.mist, fontSize: T.body }}>{item.name}</Text>
            <Text accessibilityLabel={`${item.name}: ${inventory[item.id]} owned`} style={{ color: C.moss, fontWeight: "700" }}>× {inventory[item.id]}</Text>
          </View>)}
          <Text style={[styles.muted, { marginTop: 14 }]}>Kept in your inventory until you’re ready. Buying doesn’t plant or use an item.</Text>
        </View>

        <View style={styles.reset}>
          <Text style={styles.itemName}>A fresh start</Text>
          <Text style={[styles.muted, { marginTop: 6 }]}>For testing: clear inventory and garden demo progress, and restore {STARTING_COINS} coins. Your health data and account stay untouched.</Text>
          {!confirmReset ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmReset(true)} style={styles.resetButton}><Text style={{ color: C.berry, fontWeight: "600" }}>Reset saved garden</Text></Pressable> : <>
            <Text style={[styles.notice, { marginTop: 12 }]}>Clear this device’s saved garden and purchases?</Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void reset(); }} style={styles.resetButton}><Text style={{ color: C.berry, fontWeight: "700" }}>Confirm reset</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmReset(false)} style={styles.resetButton}><Text style={{ color: C.mist }}>Cancel</Text></Pressable>
            </View>
          </>}
          <Text style={styles.muted}>Saved on this device. Progress does not sync between devices.</Text>
        </View>
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, width: "100%", maxWidth: 720, alignSelf: "center" },
  back: { alignSelf: "flex-start", paddingVertical: 14, minHeight: 44 },
  headingRow: { marginTop: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  eyebrow: { color: C.fern, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  title: { color: C.mist, fontFamily: F.display, fontSize: 34, marginTop: 4 },
  balance: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.pineRaised, padding: 12, borderRadius: R.pill },
  balanceText: { color: C.sun, fontFamily: F.display, fontSize: T.title },
  muted: { color: C.fern, fontSize: T.small, lineHeight: 19 },
  notice: { color: C.moss, fontSize: T.small, lineHeight: 19, marginTop: 12 },
  content: { width: "100%", maxWidth: 680, alignSelf: "center" },
  sectionTitle: { color: C.mist, fontFamily: F.display, fontSize: T.title, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "48%", flexGrow: 1, flexBasis: "46%", backgroundColor: C.pineRaised, borderRadius: R.card, padding: 14 },
  icon: { height: 64, alignItems: "center", justifyContent: "center", marginBottom: 8, backgroundColor: C.pine, borderRadius: 16 },
  itemName: { color: C.mist, fontSize: T.heading, fontWeight: "600" },
  price: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  owned: { color: C.fern, fontSize: T.tiny, marginTop: 6, marginBottom: 12 },
  buy: { borderRadius: R.pill, minHeight: 44, paddingHorizontal: 8, paddingVertical: 12, justifyContent: "center" },
  inventory: { backgroundColor: C.pineRaised, borderRadius: R.card, padding: 18 },
  inventoryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.pineLine },
  reset: { marginTop: 28 },
  resetButton: { paddingVertical: 14, minHeight: 44, alignSelf: "flex-start" },
});
