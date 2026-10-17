// Island → Garden: today at a glance, and the plant you tapped.
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

export function GardenSection({ selected, onClearSelection }: { selected: Plant | null; onClearSelection: () => void }) {
  const { today, goals, plants, waterAll, waterPlant } = useApp();
  const thirsty = plants.filter((p) => !p.wateredToday).length;
  const hit = goals.filter(onTrack).length;

  if (selected) {
    const p = plants.find((x) => x.id === selected.id) ?? selected;
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
          <Pressable onPress={onClearSelection} hitSlop={12}>
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
          disabled={p.wateredToday}
          onPress={() => waterPlant(p.id)}
          style={({ pressed }) => [
            { marginTop: 14, borderRadius: R.pill, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
            { backgroundColor: p.wateredToday ? C.pineLine : C.sky, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <DropIcon color={p.wateredToday ? C.fern : C.pine} />
          <Text style={{ color: p.wateredToday ? C.fern : C.pine, fontWeight: "700", fontSize: T.body }}>{p.wateredToday ? "Watered today" : "Water"}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
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
        disabled={thirsty === 0}
        onPress={waterAll}
        style={({ pressed }) => [
          { marginTop: 14, borderRadius: R.pill, paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
          { backgroundColor: thirsty ? C.sky : C.pineLine, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <DropIcon color={thirsty ? C.pine : C.fern} />
        <Text style={{ color: thirsty ? C.pine : C.fern, fontWeight: "700", fontSize: T.body }}>
          {thirsty ? `Water ${thirsty} plant${thirsty > 1 ? "s" : ""}` : "Everything is watered"}
        </Text>
      </Pressable>
    </View>
  );
}
