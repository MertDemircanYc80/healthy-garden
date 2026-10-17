// App state. In demo mode (default until Supabase + Apple Health are live) every section is
// driven by the sample persona in src/demo/simulation.ts: real coach output for that data,
// goals evaluated on each day, and a Next day action that pays coins and grows plants.
// Later: the same shapes load from Supabase (goals, insights, reports, alerts, gardens).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { COACH_SOURCE, coachInsights, coachReport, dateLabel, dayAt, goalsAt, MAX_OFFSET, nextDay, type DemoDay } from "@/demo/simulation";
import { GardenActionError, plantItem, waterPlants, fertilizePlant as applyFertilizer } from "@/lib/gardenActions";
import { goalProgress } from "@/lib/format";
import { STARTING_COINS, purchase, type Inventory, type ItemId } from "@/lib/market";
import { createGardenStore, initialGarden, type SavedGarden } from "@/lib/savedGarden";
import { C } from "@/theme";
import type { Alert, Goal, Insight, Plant, Report, Today } from "@/types";

interface DemoControls {
  dateLabel: string;
  day: DemoDay | undefined;
  canGoForward: boolean;
  coachSource: string;
  nextDay: () => void;
  reset: () => void;
}

type ActionResult = { ok: boolean; message: string };

interface AppState {
  today: Today;
  plants: Plant[];
  goals: Goal[];
  insights: Insight[];
  report: Report;
  alerts: Alert[];
  demo: DemoControls;
  inventory: Inventory;
  buyItem: (id: ItemId) => Promise<{ ok: boolean; message: string }>;
  resetData: () => Promise<boolean>;
  waterPlant: (id: string) => Promise<ActionResult>;
  waterAll: () => Promise<ActionResult>;
  plantOwnedItem: (id: ItemId) => Promise<ActionResult>;
  fertilizePlant: (id: string) => Promise<ActionResult>;
  dismissInsight: (id: string) => void;
  markAlertsRead: () => void;
}

const Ctx = createContext<AppState | null>(null);

const START = initialGarden();
const REPORT = coachReport();

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createGardenStore(AsyncStorage));
  const [saved, setSaved] = useState<SavedGarden | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const sim = saved?.sim ?? START.sim;
  const inventory = saved?.inventory ?? START.inventory;
  const [insights, setInsights] = useState(coachInsights);

  useEffect(() => {
    let active = true;
    const unsubscribe = store.subscribe(state => { if (active) setSaved(state); });
    store.load().then(state => { if (active) setSaved(state); }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; unsubscribe(); };
  }, [store]);

  const setSim = useCallback((change: (s: SavedGarden["sim"]) => SavedGarden["sim"]) => {
    void store.update(state => ({ ...state, sim: change(state.sim) }))
      .then(() => setSaveError(false)).catch(() => setSaveError(true));
  }, [store]);

  const buyItem = useCallback(async (id: ItemId) => {
    try {
      await store.update(state => {
        const bought = purchase(state.sim.coins, state.inventory, id);
        return { ...state, sim: { ...state.sim, coins: bought.coins }, inventory: bought.inventory };
      });
      setSaveError(false);
      return { ok: true, message: "Added to your inventory." };
    } catch (error) {
      const message = error instanceof Error && ["Not enough money.", "This item is not available.", "Your inventory is full for this item."].includes(error.message)
        ? error.message : "Couldn’t save your purchase. No coins were spent. Please try again.";
      return { ok: false, message };
    }
  }, [store]);

  const resetData = useCallback(async () => {
    try {
      await store.reset();
      setInsights(coachInsights());
      setLoadError(false);
      setSaveError(false);
      return true;
    } catch {
      setSaveError(true);
      return false;
    }
  }, [store]);

  const goals = useMemo(() => goalsAt(sim.offset), [sim.offset]);

  const gardenAction = useCallback(async (change: (state: SavedGarden) => SavedGarden, message: string): Promise<ActionResult> => {
    try {
      await store.update(change);
      setSaveError(false);
      return { ok: true, message };
    } catch (error) {
      return { ok: false, message: error instanceof GardenActionError ? error.message : "Couldn’t save that action. No items were used. Please try again." };
    }
  }, [store]);
  const waterPlant = useCallback((id: string) => gardenAction(s => waterPlants(s, id), "Plant watered. Used 1 watering can."), [gardenAction]);
  const waterAll = useCallback(() => gardenAction(s => waterPlants(s), "Watered as many thirsty plants as your watering cans allowed."), [gardenAction]);
  const plantOwnedItem = useCallback((id: ItemId) => gardenAction(s => plantItem(s, id), "Planted in your garden. Used 1 from inventory."), [gardenAction]);
  const fertilizePlant = useCallback((id: string) => gardenAction(s => applyFertilizer(s, id), "Growth boosted. Used 1 fertilizer."), [gardenAction]);
  const dismissInsight = useCallback((id: string) => setInsights((xs) => xs.map((x) => (x.id === id ? { ...x, dismissed: true } : x))), []);
  const markAlertsRead = useCallback(() => setSim((s) => ({ ...s, alerts: s.alerts.map((x) => ({ ...x, read: true })) })), [setSim]);

  const goNext = useCallback(
    () =>
      setSim((s) => {
        const g = goalsAt(s.offset);
        const sunlight = g.length ? g.reduce((sum, x) => sum + goalProgress(x), 0) / g.length : 0;
        return { ...nextDay(s), health: Math.min(1, s.health * 0.7 + sunlight * 0.3) };
      }),
    [setSim],
  );
  const reset = useCallback(() => {
    void resetData();
  }, [resetData]);

  const value = useMemo<AppState>(() => {
    const sunlight = goals.length ? goals.reduce((s, g) => s + goalProgress(g), 0) / goals.length : 0;
    return {
      today: { sunlight, health: sim.health, coins: sim.coins, streak: sim.streak },
      inventory,
      buyItem,
      resetData,
      plants: sim.plants,
      goals,
      insights,
      report: REPORT,
      alerts: sim.alerts,
      demo: {
        dateLabel: dateLabel(sim.offset),
        day: dayAt(sim.offset),
        canGoForward: sim.offset < MAX_OFFSET,
        coachSource: COACH_SOURCE,
        nextDay: goNext,
        reset,
      },
      waterPlant,
      waterAll,
      plantOwnedItem,
      fertilizePlant,
      dismissInsight,
      markAlertsRead,
    };
  }, [sim, inventory, buyItem, resetData, goals, insights, goNext, reset, waterPlant, waterAll, plantOwnedItem, fertilizePlant, dismissInsight, markAlertsRead]);

  if (!saved) return (
    <View style={{ flex: 1, backgroundColor: C.pine, padding: 28, justifyContent: "center", gap: 18 }}>
      <Text style={{ color: C.mist, fontSize: 18 }}>{loadError ? "Your saved garden couldn’t be loaded. It has not been overwritten." : "Opening your garden…"}</Text>
      {!loadError ? <ActivityIndicator color={C.moss} /> : <>
        <Pressable accessibilityRole="button" onPress={() => { setLoadError(false); void store.load().then(setSaved).catch(() => setLoadError(true)); }} style={{ padding: 14, backgroundColor: C.moss, borderRadius: 20 }}><Text>Try again</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setConfirmRecovery(true)}><Text style={{ color: C.berry }}>Reset saved garden</Text></Pressable>
        {confirmRecovery && <><Text style={{ color: C.mist }}>Clear your garden progress and inventory and start with {STARTING_COINS} gold and an empty garden?</Text>
          <Pressable accessibilityRole="button" onPress={() => { void resetData(); }}><Text style={{ color: C.berry }}>Confirm reset</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setConfirmRecovery(false)}><Text style={{ color: C.mist }}>Cancel</Text></Pressable></>}
        {saveError && <Text style={{ color: C.berry }}>Reset could not be saved. Please try again.</Text>}
      </>}
    </View>
  );
  return <Ctx.Provider value={value}>
    <View style={{ flex: 1 }}>
      {saveError && <Text accessibilityRole="alert" style={{ backgroundColor: C.pine, color: C.berry, padding: 16 }}>Couldn’t save that change. Your saved progress is unchanged. Please try again.</Text>}
      {children}
    </View>
  </Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppStateProvider>");
  return v;
}
