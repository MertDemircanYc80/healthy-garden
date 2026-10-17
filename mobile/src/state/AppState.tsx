import { applyTerminalCommand } from "@/demo/terminal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  analyzeCheckpoint,
  applyPlan,
  finishDay,
  journeyGoals,
  latestPlan,
  loadBaseline,
  observedDays,
  openNextDay,
  preparedPlan,
  shortDate,
  snapshot,
  startObservation,
  type Journey,
} from "@/demo/journey";
import {
  GardenActionError,
  plantItem,
  placePlant,
  waterPlants,
  fertilizePlant as applyFertilizer,
} from "@/lib/gardenActions";
import type { GardenPlot } from "@/lib/gardenPlots";
import { purchase, type Inventory, type ItemId } from "@/lib/market";
import {
  createGardenStore,
  initialGarden,
  type SavedGarden,
} from "@/lib/savedGarden";
import { useHealth } from "@/state/Health";
import { C } from "@/theme";
import type { Alert, Goal, Insight, Plant, Today } from "@/types";
import type { HealthDayRow } from "@/lib/health/types";

type ActionResult = { ok: boolean; message: string };
interface AppState {
  today: Today;
  plants: Plant[];
  goals: Goal[];
  insights: Insight[];
  alerts: Alert[];
  journey: Journey;
  reportDays: HealthDayRow[];
  currentDay: HealthDayRow | undefined;
  dataMode: "empty" | "sample" | "device";
  demo: {
    dateLabel: string;
    day: HealthDayRow | undefined;
    canGoForward: boolean;
    coachSource: string;
    terminalStatus: string;
    load: () => Promise<ActionResult>;
    start: () => Promise<ActionResult>;
    analyze: (offline?: boolean) => Promise<ActionResult>;
    finish: () => Promise<ActionResult>;
    nextDay: () => Promise<ActionResult>;
    reset: () => Promise<boolean>;
  };
  inventory: Inventory;
  buyItem: (id: ItemId) => Promise<ActionResult>;
  resetData: () => Promise<boolean>;
  waterPlant: (id: string) => Promise<ActionResult>;
  waterAll: () => Promise<ActionResult>;
  plantOwnedItem: (id: ItemId) => Promise<ActionResult>;
  fertilizePlant: (id: string) => Promise<ActionResult>;
  plantInPlot: (
    id: ItemId,
    plot: GardenPlot,
    buyIfNeeded: boolean,
  ) => Promise<ActionResult>;
  dismissInsight: (id: string) => void;
  markAlertsRead: () => void;
}
const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const health = useHealth();
  const [store] = useState(() => createGardenStore(AsyncStorage));
  const [saved, setSaved] = useState<SavedGarden | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState("");
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    const unsubscribe = store.subscribe((state) => {
      if (active) setSaved(state);
    });
    store
      .load()
      .then((state) => {
        if (active) setSaved(state);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [store]);

  const action = useCallback(
    async (
      change: (state: SavedGarden) => SavedGarden,
      message: string,
    ): Promise<ActionResult> => {
      try {
        await store.update(change);
        setSaveError(false);
        return { ok: true, message };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof GardenActionError
              ? error.message
              : "Couldn’t save. Your previous progress is safe. Try again.",
        };
      }
    },
    [store],
  );
  const resetData = useCallback(async () => {
    try {
      await store.reset();
      setDismissed([]);
      setLoadError(false);
      setSaveError(false);
      return true;
    } catch {
      setSaveError(true);
      return false;
    }
  }, [store]);
  const buyItem = useCallback(
    (id: ItemId) =>
      action((s) => {
        try {
          const bought = purchase(s.sim.coins, s.inventory, id);
          return {
            ...s,
            sim: { ...s.sim, coins: bought.coins },
            inventory: bought.inventory,
          };
        } catch (e) {
          throw new GardenActionError(
            e instanceof Error ? e.message : "Couldn’t buy this item.",
          );
        }
      }, "Added to your inventory."),
    [action],
  );
  const waterPlant = useCallback(
    (id: string) =>
      action((s) => waterPlants(s, id), "Watered. One refill used."),
    [action],
  );
  const waterAll = useCallback(
    () =>
      action(
        (s) => waterPlants(s),
        "Garden watered with your available refills.",
      ),
    [action],
  );
  const plantOwnedItem = useCallback(
    (id: ItemId) => action((s) => plantItem(s, id), "Planted."),
    [action],
  );
  const plantInPlot = useCallback(
    (id: ItemId, plot: GardenPlot, buy: boolean) =>
      action((s) => placePlant(s, id, plot, buy), "Planted."),
    [action],
  );
  const fertilizePlant = useCallback(
    (id: string) => action((s) => applyFertilizer(s, id), "Growth boosted."),
    [action],
  );
  const analyze = useCallback(
    async (offline = false): Promise<ActionResult> => {
      try {
        const previous = await store.load();
        const plan = offline
          ? preparedPlan(previous.journey.index)
          : await analyzeCheckpoint(previous.journey);
        // Reject a response if reset/next-day changed the cutoff while it was in flight.
        await store.update((s) => {
          if (
            s.journey.index !== previous.journey.index ||
            s.journey.phase !== previous.journey.phase
          )
            throw new Error("The day changed. Try again.");
          return applyPlan(s, plan);
        });
        return {
          ok: true,
          message:
            plan.source === "live_ai"
              ? "Your AI plan is ready."
              : "Prepared AI analysis loaded for this checkpoint.",
        };
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : "Analysis unavailable.",
        };
      }
    },
    [store],
  );
  const advance = useCallback(
    () =>
      action((s) => openNextDay(s), "Tomorrow’s data loaded through 14:00."),
    [action],
  );
  const finish = useCallback(async () => {
    const before = await store.load();
    const result = await action(finishDay, "Day complete. Goal rewards saved.");
    // Weekly analysis is a separate saved step; a network error cannot undo a reward.
    if (
      result.ok &&
      before.journey.phase === "midday" &&
      [13, 20, 27, 29].includes(before.journey.index)
    ) {
      const analysis = await analyze();
      if (!analysis.ok)
        return { ok: true, message: `Rewards saved. ${analysis.message}` };
    }
    return result;
  }, [store, action, analyze]);

  const terminalReady = saved !== null;
  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_COACH_URL;
    if (!terminalReady || !url || process.env.EXPO_PUBLIC_DEMO_CONTROL !== "1")
      return;
    const base = url.replace(/\/analyze\/?$/, "");
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_COACH_TOKEN ?? ""}`,
    };
    let stopped = false;
    let pending = false;
    let lastAck = "";
    const poll = async () => {
      if (stopped || pending) return;
      pending = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${base}/demo/commands`, {
          headers,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Demo server unavailable");
        const body = (await response.json()) as { commands?: unknown[] };
        if (!Array.isArray(body.commands) || body.commands.length > 400)
          throw new Error("Invalid command stream");
        let receipt:
          | {
              id: string;
              ok: boolean;
              day: number;
              gold: number;
              message: string;
            }
          | undefined;
        for (const command of body.commands) {
          if (stopped) return;
          const id = (command as { id?: unknown })?.id;
          if (typeof id !== "string") throw new Error("Invalid command ID");
          try {
            const next = await store.update((s) =>
              applyTerminalCommand(s, command),
            );
            receipt = {
              id,
              ok: true,
              day: next.journey.index + 1,
              gold: next.sim.coins,
              message: "Replay saved. Rewards paid once.",
            };
          } catch (error) {
            const current = await store.load();
            receipt = {
              id,
              ok: false,
              day: current.journey.index + 1,
              gold: current.sim.coins,
              message:
                error instanceof Error
                  ? error.message
                  : "Could not save command.",
            };
            break;
          }
        }
        if (receipt && !stopped) {
          const signature = JSON.stringify(receipt);
          if (signature !== lastAck) {
            const ack = await fetch(`${base}/demo/ack`, {
              method: "POST",
              headers,
              body: signature,
              signal: controller.signal,
            });
            if (!ack.ok) throw new Error("Receipt not saved");
            lastAck = signature;
          }
          setTerminalStatus(
            receipt.ok
              ? `Terminal connected · day ${receipt.day}`
              : receipt.message,
          );
        } else if (!stopped)
          setTerminalStatus("Terminal connected · waiting for data");
      } catch {
        if (!stopped)
          setTerminalStatus(
            "Terminal offline · start the coach server on your Mac",
          );
      } finally {
        clearTimeout(timeout);
        pending = false;
      }
    };
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [store, terminalReady]);

  const value = useMemo<AppState>(() => {
    const state = saved ?? initialGarden();
    const j = state.journey;
    const plan = latestPlan(j);
    const goals = journeyGoals(j);
    const sample = j.phase !== "empty";
    const reportDays = sample ? observedDays(j) : health.days;
    const currentDay = sample ? snapshot(j) : (health.today ?? undefined);
    const entries = j.ledger;
    const latest = entries[entries.length - 1];
    return {
      today: {
        sunlight: latest?.goalsTotal ? latest.goalsHit / latest.goalsTotal : 0,
        health: state.sim.health,
        coins: state.sim.coins,
        streak: state.sim.streak,
      },
      plants: state.sim.plants,
      inventory: state.inventory,
      journey: j,
      goals,
      insights: (plan?.insights ?? []).filter((i) => !dismissed.includes(i.id)),
      alerts: state.sim.alerts,
      reportDays,
      currentDay,
      dataMode: sample ? "sample" : reportDays.length ? "device" : "empty",
      demo: {
        dateLabel: sample
          ? `Day ${j.index + 1} · ${shortDate(snapshot(j)!.date)}`
          : "30-day demo",
        day: currentDay,
        canGoForward:
          sample &&
          (!!plan || j.index < 6) &&
          j.index < 29 &&
          j.phase !== "midday",
        coachSource:
          plan?.source === "live_ai"
            ? `${plan.provider === "gemini" ? "Gemini" : "Live AI"}${plan.cached ? " · saved result" : " · live response"}`
            : "Prepared AI · offline replay",
        terminalStatus,
        start: () =>
          action(
            startObservation,
            "Day 1 opened. Complete the day to earn 10 gold.",
          ),
        load: () =>
          action(loadBaseline, "First 7 days loaded. 70 daily gold earned."),
        analyze,
        finish,
        nextDay: advance,
        reset: resetData,
      },
      buyItem,
      resetData,
      waterPlant,
      waterAll,
      plantOwnedItem,
      plantInPlot,
      fertilizePlant,
      dismissInsight: (id) => setDismissed((xs) => [...xs, id]),
      markAlertsRead: () => {
        void action(
          (s) => ({
            ...s,
            sim: {
              ...s.sim,
              alerts: s.sim.alerts.map((a) => ({ ...a, read: true })),
            },
          }),
          "Read.",
        );
      },
    };
  }, [
    saved,
    terminalStatus,
    health.days,
    health.today,
    dismissed,
    action,
    analyze,
    finish,
    advance,
    resetData,
    buyItem,
    waterPlant,
    waterAll,
    plantOwnedItem,
    plantInPlot,
    fertilizePlant,
  ]);

  if (!saved)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.pine,
          padding: 28,
          justifyContent: "center",
          gap: 18,
        }}
      >
        <Text style={{ color: C.mist, fontSize: 18 }}>
          {loadError
            ? "Your saved progress couldn’t be loaded. It has not been overwritten."
            : "Opening your garden…"}
        </Text>
        {!loadError ? (
          <ActivityIndicator color={C.moss} />
        ) : (
          <>
            <Pressable
              onPress={() => {
                setLoadError(false);
                void store
                  .load()
                  .then(setSaved)
                  .catch(() => setLoadError(true));
              }}
            >
              <Text style={{ color: C.moss }}>Try again</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmRecovery(true)}>
              <Text style={{ color: C.berry }}>Reset this demo</Text>
            </Pressable>
            {confirmRecovery && (
              <Pressable
                onPress={() => {
                  void resetData();
                }}
              >
                <Text style={{ color: C.berry }}>
                  Confirm: clear this branch’s demo progress
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    );
  return (
    <Ctx.Provider value={value}>
      <View style={{ flex: 1 }}>
        {saveError && (
          <Text
            accessibilityRole="alert"
            style={{ backgroundColor: C.pine, color: C.berry, padding: 16 }}
          >
            Couldn’t save. Your previous progress is safe.
          </Text>
        )}
        {children}
      </View>
    </Ctx.Provider>
  );
}
export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useApp must be used inside AppStateProvider");
  return value;
}
