// Persistent personal garden with a separate sample garden for demonstrations.
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
import { DEMO_GARDEN_KEY, initialPersonalGarden, rollGardenDay } from "@/lib/dailyCycle";
import { watchLocalDate } from "@/lib/localDateClock";
import { useHealth } from "@/state/Health";
import { personalGoalsAt, reconcilePersonal } from "@/lib/personalGoals";
import { useGardenSounds } from "@/state/Sounds";
import type { GardenSound } from "@/lib/gardenSounds";
import { saplingStatus, claimSaplingReward, updateSaplingReward } from "@/lib/saplingReward";
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
  clearPersonalGoals: () => Promise<void>;
  today: Today;
  plants: Plant[];
  goals: Goal[];
  insights: Insight[];
  report: Report;
  alerts: Alert[];
  demo: DemoControls;
  inventory: Inventory;
  sapling: ReturnType<typeof saplingStatus>;
  claimSapling: () => Promise<ActionResult>;
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
  const health = useHealth();
  const sounds = useGardenSounds();
  const [stores] = useState(() => ({ personal: createGardenStore(AsyncStorage, undefined, initialPersonalGarden), demo: createGardenStore(AsyncStorage, DEMO_GARDEN_KEY) }));
  // Sample mode is a preview for this session, never the persisted startup mode.
  const [mode, setMode] = useState<"personal" | "demo">("personal");
  const [localDate, setLocalDate] = useState(() => localDay(new Date()));
  const store = stores[mode];
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
    const unsubscribe = store.subscribe(state => { if (active) setSaved(state); });
    store.load().then(state => { if (active) setSaved(state); }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; unsubscribe(); };
  }, [store, mode]);

  const switchMode = useCallback(async () => {
    try {
      const next = isDemo ? "personal" : "demo";
      await stores[next].load();
      setSaved(null); setMode(next); setLoadError(false);
    } catch { setSaveError(true); }
  }, [isDemo, stores]);
  useEffect(() => {
    if (mode !== "personal") return;
    let active = true;
    const clock = watchLocalDate(date => {
      setLocalDate(date);
      void store.update(s => health.ready ? reconcilePersonal(s, health.days, date) : rollGardenDay(s, date))
        .then(() => { if (active) setSaveError(false); })
        .catch(() => { if (active) setSaveError(true); });
    });
    const sub = RNAppState.addEventListener("change", s => { if (s === "active") clock.check(); });
    // Browser focus also covers returning from another window after sleep.
    if (typeof window !== "undefined") window.addEventListener?.("focus", clock.check);
    return () => {
      active = false; clock.stop(); sub.remove();
      if (typeof window !== "undefined") window.removeEventListener?.("focus", clock.check);
    };
  }, [store, mode, health.days, health.ready]);

  const clearPersonalGoals = useCallback(async () => {
    await stores.personal.update(s => ({ ...s, ...(s.saplingReward ? { saplingReward: { ...s.saplingReward, days: {} } } : {}), personal: { startedOn: localDay(new Date()), weeks: {}, rewarded: s.personal?.rewarded ?? [] }, sim: { ...s.sim, health: 0, streak: 0, alerts: [] } }));
  }, [stores]);

  const claimSapling = useCallback(async (): Promise<ActionResult> => {
    if (isDemo) return { ok: false, message: "Use your personal garden to earn this reward." };
    try {
      await stores.personal.update(s => claimSaplingReward(health.ready ? reconcilePersonal(s, health.days, localDay(new Date())) : s, localDay(new Date())));
      return { ok: true, message: "Your placeholder discount is claimed. No real purchase or redemption was made." };
    } catch (error) {
      const message = error instanceof Error && ["The sapling reward is still locked.", "This sapling discount has already been claimed."].includes(error.message)
        ? error.message : "Couldn’t save your claim. Please try again.";
      return { ok: false, message };
    }
  }, [isDemo, stores, health.ready, health.days]);

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

  const goals = useMemo(() => isDemo ? goalsAt(sim.offset) : personalGoalsAt(saved?.personal, health.days, localDate), [sim.offset, isDemo, saved?.personal, localDate, health.days]);

  const gardenAction = useCallback(async (change: (state: SavedGarden) => SavedGarden, message: string, sound: GardenSound): Promise<ActionResult> => {
    try {
      await store.update(state => {
        const date = localDay(new Date());
        const next = change(isDemo ? state : health.ready ? reconcilePersonal(state, health.days, date) : rollGardenDay(state, date));
        // Planting can satisfy the final reward condition in this same saved action.
        return isDemo ? next : updateSaplingReward(next, date, {});
      });
      setSaveError(false);
      sounds.play(sound);
      return { ok: true, message };
    } catch (error) {
      return { ok: false, message: error instanceof GardenActionError ? error.message : "Couldn’t save that action. No items were used. Please try again." };
    }
  }, [store, isDemo, health.days, health.ready, sounds]);
  const waterPlant = useCallback((id: string) => gardenAction(s => waterPlants(s, id), "Plant watered. Used 1 watering can.", "water"), [gardenAction]);
  const waterAll = useCallback(() => gardenAction(s => waterPlants(s), "Watered as many thirsty plants as your watering cans allowed.", "water"), [gardenAction]);
  const plantOwnedItem = useCallback((id: ItemId) => gardenAction(s => plantItem(s, id), "Planted in your garden. Used 1 from inventory.", "plant"), [gardenAction]);
  const plantInPlot = useCallback((id: ItemId, plot: GardenPlot, buyIfNeeded: boolean) => gardenAction(s => placePlant(s, id, plot, buyIfNeeded), "Planted in your chosen plot.", "plant"), [gardenAction]);
  const fertilizePlant = useCallback((id: string) => gardenAction(s => applyFertilizer(s, id), "Growth boosted. Used 1 fertilizer.", "fertilize"), [gardenAction]);
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
      isDemo, switchMode, clearPersonalGoals,
      today: { sunlight, health: sim.health, coins: sim.coins, streak: sim.streak },
      inventory,
      sapling: saplingStatus(saved ?? START, localDate),
      claimSapling,
      buyItem,
      resetData,
      plants: sim.plants,
      goals,
      insights: isDemo ? insights : [],
      report: isDemo ? REPORT : { periodLabel: "Your data", score: 0, scoreChange: 0, summary: health.days.length ? `${health.days.length} day(s) of totals saved on this device. Today’s sunlight is based on your personal goals. Not medical advice.` : "No personal health totals yet. Connect Apple Health or record feed time below. Not medical advice.", metrics: [] },
      alerts: sim.alerts,
      demo: {
        dateLabel: isDemo ? dateLabel(sim.offset) : localDate,
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
  }, [saved, claimSapling, clearPersonalGoals, health.days.length, isDemo, switchMode, localDate, sim, inventory, buyItem, resetData, goals, insights, goNext, reset, waterPlant, waterAll, plantOwnedItem, plantInPlot, fertilizePlant, dismissInsight, markAlertsRead]);

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
