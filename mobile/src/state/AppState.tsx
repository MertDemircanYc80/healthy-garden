// App state. In demo mode (default until Supabase + Apple Health are live) every section is
// driven by the sample persona in src/demo/simulation.ts: real coach output for that data,
// goals evaluated on each day, and a Next day action that pays coins and grows plants.
// Later: the same shapes load from Supabase (goals, insights, reports, alerts, gardens).
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { demoPlants } from "@/data/demo";
import { COACH_SOURCE, coachAlerts, coachInsights, coachReport, dateLabel, dayAt, goalsAt, MAX_OFFSET, nextDay, type DemoDay, type DemoState } from "@/demo/simulation";
import { goalProgress } from "@/lib/format";
import type { Alert, Goal, Insight, Plant, Report, Today } from "@/types";

interface DemoControls {
  dateLabel: string;
  day: DemoDay | undefined;
  canGoForward: boolean;
  coachSource: string;
  nextDay: () => void;
  reset: () => void;
}

interface AppState {
  today: Today;
  plants: Plant[];
  goals: Goal[];
  insights: Insight[];
  report: Report;
  alerts: Alert[];
  demo: DemoControls;
  waterPlant: (id: string) => void;
  waterAll: () => void;
  dismissInsight: (id: string) => void;
  markAlertsRead: () => void;
}

const Ctx = createContext<AppState | null>(null);

const START: DemoState & { health: number } = { offset: 0, coins: 460, streak: 4, plants: demoPlants, alerts: coachAlerts(), health: 0.72 };
const REPORT = coachReport();

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [sim, setSim] = useState(START);
  const [insights, setInsights] = useState(coachInsights);

  const goals = useMemo(() => goalsAt(sim.offset), [sim.offset]);

  // Watering wakes a resting plant right away — coming back is always rewarded.
  const waterPlant = useCallback(
    (id: string) => setSim((s) => ({ ...s, plants: s.plants.map((p) => (p.id === id ? { ...p, wateredToday: true, resting: false } : p)) })),
    [],
  );
  const waterAll = useCallback(() => setSim((s) => ({ ...s, plants: s.plants.map((p) => ({ ...p, wateredToday: true, resting: false })) })), []);
  const dismissInsight = useCallback((id: string) => setInsights((xs) => xs.map((x) => (x.id === id ? { ...x, dismissed: true } : x))), []);
  const markAlertsRead = useCallback(() => setSim((s) => ({ ...s, alerts: s.alerts.map((x) => ({ ...x, read: true })) })), []);

  const goNext = useCallback(
    () =>
      setSim((s) => {
        const g = goalsAt(s.offset);
        const sunlight = g.length ? g.reduce((sum, x) => sum + goalProgress(x), 0) / g.length : 0;
        return { ...nextDay(s), health: Math.min(1, s.health * 0.7 + sunlight * 0.3) };
      }),
    [],
  );
  const reset = useCallback(() => {
    setSim(START);
    setInsights(coachInsights());
  }, []);

  const value = useMemo<AppState>(() => {
    const sunlight = goals.length ? goals.reduce((s, g) => s + goalProgress(g), 0) / goals.length : 0;
    return {
      today: { sunlight, health: sim.health, coins: sim.coins, streak: sim.streak },
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
      dismissInsight,
      markAlertsRead,
    };
  }, [sim, goals, insights, goNext, reset, waterPlant, waterAll, dismissInsight, markAlertsRead]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppStateProvider>");
  return v;
}
