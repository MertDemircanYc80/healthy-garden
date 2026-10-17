// Island → Garden: today at a glance, and the plant you tapped.
import { useState } from "react";
import { useRouter } from "expo-router";
import { MARKET_ITEMS } from "@/lib/market";
import { Pressable, Text, View } from "react-native";
import { DropIcon } from "@/components/Icons";
import { Bar, Ring, styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { C, F, R, T } from "@/theme";
import type { Plant, Species, Stage } from "@/types";
import { onTrack } from "@/lib/format";

const NAMES: Record<Species, string> = {
  daisy: "Daisy",
  marigold: "Marigold",
  lavender: "Lavender",
  tulip: "Tulips",
  sunflower: "Sunflower",
  rose: "Rose bush",
  fruit_tree: "Apple tree",
  cherry_tree: "Cherry blossom",
  oak: "Oak",
};

const STAGE: Record<Stage, string> = { seed: "Seed", sprout: "Sprout", young: "Growing", mature: "Budding", blooming: "In bloom" };

export function GardenSection({ selected, onClearSelection, onSelect, onChooseSpot }: { selected: Plant | null; onClearSelection: () => void; onSelect: (plant: Plant) => void; onChooseSpot: () => void }) {
  const { today, goals, plants, inventory, waterAll, waterPlant, fertilizePlant } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(action: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(true);
    try { const result = await action(); setMessage(result.message); }
    finally { setBusy(false); }
  }
  const feedback = message ? <Text accessibilityLiveRegion="polite" style={[u.muted, { marginTop: 10 }]}>{message}</Text> : null;
  const supplies = <Text style={[u.muted, { marginTop: 10 }]}>Watering cans: {inventory.watering_can} · Fertilizer: {inventory.fertilizer}</Text>;
  const thirsty = plants.filter((p) => !p.wateredToday).length;
  const hit = goals.filter(onTrack).length;

  const p = selected ? plants.find((x) => x.id === selected.id) : undefined;
  if (p) {
    const canWater = !p.wateredToday && inventory.watering_can > 0;
    const canFertilize = p.stage !== "blooming" && inventory.fertilizer > 0;
    return (
      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={u.sectionTitle}>{NAMES[p.species]}</Text>
            <Text style={u.sectionHint}>
              {STAGE[p.stage]}
              {p.resting ? ", resting" : ""}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClearSelection} hitSlop={12}>
            <Text style={{ color: C.fern, fontSize: T.small, fontWeight: "600" }}>Done</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 14 }}>
          <Bar value={p.stage === "blooming" ? 1 : (["seed", "sprout", "young", "mature"].indexOf(p.stage) + p.growth) / 4} />
          <Text style={[u.muted, { marginTop: 8 }]}>
            {p.resting
              ? "It missed a couple of days. Water it and it wakes right up — plants here never die."
              : p.stage === "blooming"
                ? "Fully grown. Keep it watered to keep the blooms."
                : "Grows overnight when it's watered and your day brings sunlight."}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy || !canWater}
          onPress={() => { void act(() => waterPlant(p.id)); }}
          style={({ pressed }) => [
            { marginTop: 14, borderRadius: R.pill, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
            { backgroundColor: canWater ? C.sky : C.pineLine, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <DropIcon color={canWater ? C.pine : C.fern} />
          <Text style={{ color: canWater ? C.pine : C.fern, fontWeight: "700", fontSize: T.body }}>{p.wateredToday ? "Watered today" : canWater ? "Water · uses 1 can" : "No watering cans left"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy || !canFertilize} onPress={() => { void act(() => fertilizePlant(p.id)); }} style={{ marginTop: 10, padding: 12, borderRadius: R.pill, alignItems: "center", backgroundColor: canFertilize ? C.moss : C.pineLine }}>
          <Text style={{ color: canFertilize ? C.pine : C.fern, fontWeight: "700" }}>{p.stage === "blooming" ? "Fully grown" : canFertilize ? "Fertilize · uses 1" : "No fertilizer left"}</Text>
        </Pressable>
        {supplies}
        <Text style={u.muted}>One fertilizer adds half a growth stage.</Text>
        {feedback}
      </View>
    );
  }

  return (
    <View>
      <Text style={u.sectionTitle}>{plants.length === 0 ? "Your garden is ready" : "Make room to grow"}</Text>
      <Text style={u.muted}>Tap a highlighted + plot above to choose a plant. You can use an owned plant or buy and plant directly.</Text>
      <Pressable accessibilityRole="button" disabled={plants.length >= 24} onPress={() => { setMessage("Tap any highlighted + plot in the garden above."); onChooseSpot(); }} style={{ backgroundColor: plants.length >= 24 ? C.pineLine : C.moss, borderRadius: R.pill, padding: 12, alignItems: "center", marginVertical: 12 }}>
        <Text style={{ color: C.pine, fontWeight: "700" }}>{plants.length >= 24 ? "Garden full" : "Choose a planting spot"}</Text>
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Ring value={today.sunlight} size={62}>
          <Text style={{ color: C.mist, fontFamily: F.display, fontSize: 18 }}>{Math.round(today.sunlight * 100)}</Text>
        </Ring>
        <View style={{ flex: 1 }}>
          <Text style={u.h}>Sunlight today</Text>
          <Text style={u.muted}>
            {hit} of {goals.length} goals done so far</Text>
          <Text style={u.muted}>Sunlight helps your plants grow tonight.
          </Text>
        </View>
        <View style={{ alignItems: "center", backgroundColor: C.pineRaised, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: C.sun, fontFamily: F.display, fontSize: 20 }}>{today.streak}</Text>
          <Text style={{ color: C.fern, fontSize: T.tiny, fontWeight: "600" }}>day streak</Text>
        </View>
      </View>

      <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={[u.muted, { width: 92 }]}>Garden health</Text>
        <View style={{ flex: 1 }}>
          <Bar value={today.health} />
        </View>
        <Text style={{ color: C.mist, fontWeight: "700", width: 40, textAlign: "right" }}>{Math.round(today.health * 100)}%</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={busy || thirsty === 0 || inventory.watering_can === 0}
        onPress={() => { void act(waterAll); }}
        style={({ pressed }) => [
          { marginTop: 14, borderRadius: R.pill, paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
          { backgroundColor: thirsty && inventory.watering_can ? C.sky : C.pineLine, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <DropIcon color={thirsty && inventory.watering_can ? C.pine : C.fern} />
        <Text style={{ color: thirsty && inventory.watering_can ? C.pine : C.fern, fontWeight: "700", fontSize: T.body }}>
          {!plants.length ? "Plant something first" : !thirsty ? "Everything is watered" : !inventory.watering_can ? "No watering cans left" : `Water ${Math.min(thirsty, inventory.watering_can)} plant(s) · 1 can each`}
        </Text>
      </Pressable>
      {supplies}
      {feedback}
      {!plants.length && <Text style={[u.muted, { marginTop: 14 }]}>Empty inventory? Tap a + plot to buy and plant in one step.</Text>}
      <Text style={[u.h, { marginTop: 18 }]}>Ready to plant</Text>
      {MARKET_ITEMS.filter(item => item.category === "Plants").map(item => <View key={item.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
        <Text style={[u.muted, { flex: 1 }]}>{item.icon} {item.name}: {inventory[item.id]} left</Text>
      </View>)}
      {plants.length > 0 && <Text style={[u.h, { marginTop: 18 }]}>In your garden</Text>}
      {plants.map(plant => <Pressable key={plant.id} accessibilityRole="button" accessibilityLabel={`Care for ${NAMES[plant.species]}, plot ${plant.row * 6 + plant.col + 1}`} onPress={() => { setMessage(""); onSelect(plant); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.pineLine }}>
        <Text style={{ color: C.moss }}>{NAMES[plant.species]} · {STAGE[plant.stage]} · {plant.wateredToday ? "Watered" : "Needs water"} ›</Text>
      </Pressable>)}
      <Text style={[u.muted, { marginTop: 12 }]}>{plants.length} / 24 plots planted. Tap a plant to water or fertilize it.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.navigate("/market")} style={{ paddingVertical: 14 }}><Text style={{ color: C.moss, fontWeight: "700" }}>Open Market</Text></Pressable>
    </View>
  );
}
