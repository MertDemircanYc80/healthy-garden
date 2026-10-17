import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bar, styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { C, R } from "@/theme";
import { GARDEN_PLOTS } from "@/lib/gardenPlots";
import type { Plant } from "@/types";
export function GardenSection({
  selected,
  onClearSelection,
}: {
  selected: Plant | null;
  onClearSelection: () => void;
  onSelect: (plant: Plant) => void;
  onChooseSpot: () => void;
}) {
  const { plants, inventory, waterPlant, fertilizePlant } = useApp();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const p = plants.find((x) => x.id === selected?.id);
  async function act(fn: () => Promise<{ message: string }>) {
    setBusy(true);
    try {
      setMessage((await fn()).message);
    } finally {
      setBusy(false);
    }
  }
  if (!p)
    return (
      <View style={{ paddingTop: 4 }}>
        <Text style={u.sectionTitle}>
          {plants.length ? "A little more life" : "Room for something good"}
        </Text>
        <Text style={[u.muted, { marginTop: 6 }]}>
          {plants.length
            ? `${plants.length} of ${GARDEN_PLOTS.length} plots growing. Tap a plant to care for it.`
            : "Earn gold from your goals. Tap a garden plot to plant."}
        </Text>
      </View>
    );
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={u.sectionTitle}>{p.species.replace(/_/g, " ")}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onClearSelection}
          style={{ padding: 10 }}
        >
          <Text style={{ color: C.moss }}>Done</Text>
        </Pressable>
      </View>
      <Bar
        value={
          p.stage === "blooming"
            ? 1
            : (["seed", "sprout", "young", "mature"].indexOf(p.stage) +
                p.growth) /
              4
        }
      />
      <Text style={u.muted}>
        {p.stage === "blooming"
          ? "In bloom"
          : p.resting
            ? "Resting · water to wake it up"
            : "Growing a little each day"}
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          disabled={busy || p.wateredToday}
          onPress={() => {
            void act(() =>
              inventory.watering_can
                ? waterPlant(p.id)
                : Promise.resolve({
                    message: "Get a water refill in the Market.",
                  }),
            );
            if (!inventory.watering_can) router.navigate("/market");
          }}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: R.pill,
            alignItems: "center",
            backgroundColor: p.wateredToday ? C.pineLine : C.sky,
          }}
        >
          <Text
            style={{
              color: p.wateredToday ? C.fern : C.pine,
              fontWeight: "700",
            }}
          >
            {p.wateredToday ? "Watered" : "Water"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy || p.fertilizedToday || p.stage === "blooming"}
          onPress={() => {
            void act(() => fertilizePlant(p.id));
          }}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: R.pill,
            alignItems: "center",
            backgroundColor: C.pineLine,
          }}
        >
          <Text style={{ color: C.moss }}>Boost growth</Text>
        </Pressable>
      </View>
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={u.muted}>
          {message}
        </Text>
      )}
    </View>
  );
}
