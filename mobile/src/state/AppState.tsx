// App state. In demo mode (default until Supabase + Apple Health are live) every section is
// driven by the sample persona in src/demo/simulation.ts: real coach output for that data,
// goals evaluated on each day, and a Next day action that pays coins and grows plants.
// Later: the same shapes load from Supabase (goals, insights, reports, alerts, gardens).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, AppState as RNAppState, Pressable, Text, View } from "react-native";
import { COACH_SOURCE, coachInsights, coachReport, dateLabel, dayAt, goalsAt, MAX_OFFSET, nextDay, type DemoDay } from "@/demo/simulation";
import { GardenActionError, plantItem, placePlant, waterPlants, fertilizePlant as applyFertilizer } from "@/lib/gardenActions";
import type { GardenPlot } from "@/lib/gardenPlots";
import { goalProgress } from "@/lib/format";
import { STARTING_COINS, purchase, type Inventory, type ItemId } from "@/lib/market";
import { createGardenStore, initialGarden, type SavedGarden } from "@/lib/savedGarden";
import { localDay } from "@/lib/health/days";
import { DEMO_GARDEN_KEY, MODE_KEY, initialPersonalGarden, rollGardenDay } from "@/lib/dailyCycle";
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
  isDemo: boolean;
  switchMode: () => Promise<void>;
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
  plantInPlot: (id: ItemId, plot: GardenPlot, buyIfNeeded: boolean) => Promise<ActionResult>;
  dismissInsight: (id: string) => void;
  markAlertsRead: () => void;
}

const Ctx = createContext<AppState | null>(null);

const START = initialGarden();
const REPORT = coachReport();

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [stores] = useState(() => ({ personal: createGardenStore(AsyncStorage, undefined, initialPersonalGarden), demo: createGardenStore(AsyncStorage, DEMO_GARDEN_KEY) }));
  const [mode, setMode] = useState<"personal" | "demo" | null>(null);
  const store = stores[mode ?? "personal"];
  const isDemo = mode === "demo";
  const [saved, setSaved] = useState<SavedGarden | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const sim = saved?.sim ?? START.sim;
  const inventory = saved?.inventory ?? START.inventory;
  const [insights, setInsights] = useState(coachInsights);

  useEffect(() => {
    let active = true;
    if (!mode) {
      AsyncStorage.getItem(MODE_KEY).then(value => { if (active) setMode(value === "demo" ? "demo" : "personal"); }).catch(() => { if (active) setLoadError(true); });
      return () => { active = false; };
    }
    const unsubscribe = store.subscribe(state => { if (active) setSaved(state); });
    store.load().then(state => { if (active) setSaved(state); }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; unsubscribe(); };
  }, [store, mode]);

  const switchMode = useCallback(async () => {
    try {
      const next = isDemo ? "personal" : "demo";
      await stores[next].load();
      await AsyncStorage.setItem(MODE_KEY, next);
      setSaved(null); setMode(next); setLoadError(false);
    } catch { setSaveError(true); }
  }, [isDemo, stores]);
  useEffect(() => {
    if (mode !== "personal") return;
    const tick = () => { void store.update(s => rollGardenDay(s, localDay(new Date()))).catch(() => setSaveError(true)); };
    tick();
    const timer = setInterval(tick, 15000);
    const sub = RNAppState.addEventListener("change", s => { if (s === "active") tick(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [store, mode]);

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

  const goals = useMemo(() => isDemo ? goalsAt(sim.offset) : [], [sim.offset, isDemo]);

  const gardenAction = useCallback(async (change: (state: SavedGarden) => SavedGarden, message: string): Promise<ActionResult> => {
    try {
      await store.update(state => change(isDemo ? state : rollGardenDay(state, localDay(new Date()))));
      setSaveError(false);
      return { ok: true, message };
    } catch (error) {
      return { ok: false, message: error instanceof GardenActionError ? error.message : "Couldn’t save that action. No items were used. Please try again." };
    }
  }, [store, isDemo]);
  const waterPlant = useCallback((id: string) => gardenAction(s => waterPlants(s, id), "Plant watered. Used 1 watering can."), [gardenAction]);
  const waterAll = useCallback(() => gardenAction(s => waterPlants(s), "Watered as many thirsty plants as your watering cans allowed."), [gardenAction]);
  const plantOwnedItem = useCallback((id: ItemId) => gardenAction(s => plantItem(s, id), "Planted in your garden. Used 1 from inventory."), [gardenAction]);
  const plantInPlot = useCallback((id: ItemId, plot: GardenPlot, buyIfNeeded: boolean) => gardenAction(s => placePlant(s, id, plot, buyIfNeeded), "Planted in your chosen plot."), [gardenAction]);
  const fertilizePlant = useCallback((id: string) => gardenAction(s => applyFertilizer(s, id), "Growth boosted. Used 1 fertilizer."), [gardenAction]);
  const dismissInsight = useCallback((id: string) => setInsights((xs) => xs.map((x) => (x.id === id ? { ...x, dismissed: true } : x))), []);
  const markAlertsRead = useCallback(() => setSim((s) => ({ ...s, alerts: s.alerts.map((x) => ({ ...x, read: true })) })), [setSim]);

  const goNext = useCallback(
    () =>
      isDemo && setSim((s) => {
        const g = goalsAt(s.offset);
        const sunlight = g.length ? g.reduce((sum, x) => sum + goalProgress(x), 0) / g.length : 0;
        return { ...nextDay(s), health: Math.min(1, s.health * 0.7 + sunlight * 0.3) };
      }),
    [setSim, isDemo],
  );
  const reset = useCallback(() => {
    void resetData();
  }, [resetData]);

  const value = useMemo<AppState>(() => {
    const sunlight = goals.length ? goals.reduce((s, g) => s + goalProgress(g), 0) / goals.length : 0;
    return {
      isDemo, switchMode,
      today: { sunlight, health: sim.health, coins: sim.coins, streak: sim.streak },
      inventory,
      buyItem,
      resetData,
      plants: sim.plants,
      goals,
      insights: isDemo ? insights : [],
      report: isDemo ? REPORT : { periodLabel: "Your data", score: 0, scoreChange: 0, summary: "Your report will use the health data saved on this device. Not medical advice.", metrics: [] },
      alerts: sim.alerts,
      demo: {
        dateLabel: isDemo ? dateLabel(sim.offset) : saved?.calendarDate ?? localDay(new Date()),
        day: isDemo ? dayAt(sim.offset) : undefined,
        canGoForward: isDemo && sim.offset < MAX_OFFSET,
        coachSource: isDemo ? COACH_SOURCE : "your saved health data",
        nextDay: goNext,
        reset,
      },
      waterPlant,
      waterAll,
      plantOwnedItem,
      plantInPlot,
      fertilizePlant,
      dismissInsight,
      markAlertsRead,
    };
  }, [isDemo, switchMode, saved?.calendarDate, sim, inventory, buyItem, resetData, goals, insights, goNext, reset, waterPlant, waterAll, plantOwnedItem, plantInPlot, fertilizePlant, dismissInsight, markAlertsRead]);

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
