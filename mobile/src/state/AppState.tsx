// App state for the UI phase: demo data + a few local actions.
// Later: load from Supabase (goals, insights, reports, alerts, garden) and write back here.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { demoAlerts, demoGoals, demoInsights, demoPlants, demoReport, demoToday } from "@/data/demo";
import { goalProgress } from "@/lib/format";
import type { Alert, Goal, Insight, Plant, Report, Today } from "@/types";

interface AppState {
  today: Today;
  plants: Plant[];
  goals: Goal[];
  insights: Insight[];
  report: Report;
  alerts: Alert[];
  waterPlant: (id: string) => void;
  waterAll: () => void;
  dismissInsight: (id: string) => void;
  markAlertsRead: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [plants, setPlants] = useState(demoPlants);
  const [insights, setInsights] = useState(demoInsights);
  const [alerts, setAlerts] = useState(demoAlerts);

  // Watering wakes a resting plant right away — coming back is always rewarded.
  const waterPlant = useCallback(
    (id: string) => setPlants((ps) => ps.map((p) => (p.id === id ? { ...p, wateredToday: true, resting: false } : p))),
    [],
  );
  const waterAll = useCallback(() => setPlants((ps) => ps.map((p) => ({ ...p, wateredToday: true, resting: false }))), []);
  const dismissInsight = useCallback((id: string) => setInsights((xs) => xs.map((x) => (x.id === id ? { ...x, dismissed: true } : x))), []);
  const markAlertsRead = useCallback(() => setAlerts((xs) => xs.map((x) => ({ ...x, read: true }))), []);

  // Sunlight = how far along today's goals are (average progress).
  const goals = demoGoals as Goal[];
  const today = useMemo<Today>(() => ({ ...demoToday, sunlight: goals.reduce((s, g) => s + goalProgress(g), 0) / goals.length }), [goals]);

  const value = useMemo<AppState>(
    () => ({ today, plants, goals, insights, report: demoReport as Report, alerts, waterPlant, waterAll, dismissInsight, markAlertsRead }),
    [today, goals, plants, insights, alerts, waterPlant, waterAll, dismissInsight, markAlertsRead],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppStateProvider>");
  return v;
}
