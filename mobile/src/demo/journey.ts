// The jury replay is isolated from the original demo and its saved progress.
import dataset from "@/data/month-health.json";
import prepared from "@/data/month-coach.json";
import type { Goal, Insight, Plant, Stage } from "@/types";
import type { HealthDayRow } from "@/lib/health/types";
import type { SavedGarden } from "@/lib/savedGarden";

export type MonthDay = HealthDayRow & {
  sedentary_minutes: number;
  calories_burned: number | null;
};
export type Plan = {
  through: number;
  source: "prepared_ai" | "live_ai";
  summary: string;
  provider?: string;
  model?: string;
  generatedAt?: string;
  cached?: boolean;
  goals: Omit<Goal, "current" | "daysHit" | "daysTotal">[];
  insights: Insight[];
};
export type Journey = {
  index: number;
  phase: "empty" | "baseline" | "midday" | "complete";
  plans: Plan[];
  settled: string[];
  ledger: {
    id: string;
    date: string;
    amount: number;
    goalsHit: number;
    goalsTotal: number;
  }[];
};
export const MONTH = dataset.days as MonthDay[];
export const SOURCES = dataset.sources;
export const emptyJourney = (): Journey => ({
  index: -1,
  phase: "empty",
  plans: [],
  settled: [],
  ledger: [],
});
export const latestPlan = (j: Journey) => j.plans[j.plans.length - 1];
export const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

/** Replay snapshot at 14:00; sleep already ended, cumulative totals are partial. */
export function snapshot(j: Journey): MonthDay | undefined {
  const day = MONTH[j.index];
  if (!day || j.phase === "empty") return undefined;
  if (j.phase !== "midday") return day;
  const part = (v: number | null | undefined) =>
    v == null ? v : Math.round(v * 0.55);
  return {
    ...day,
    steps: part(day.steps),
    active_minutes: part(day.active_minutes),
    daylight_minutes: part(day.daylight_minutes),
    sedentary_minutes: part(day.sedentary_minutes)!,
    calories_burned: part(day.calories_burned) ?? null,
    feed_minutes: part(day.feed_minutes),
    screen_minutes: part(day.screen_minutes),
    app_usage: Object.fromEntries(
      Object.entries(day.app_usage ?? {}).map(([k, v]) => [k, part(v)!]),
    ),
    nutrition: {
      ...day.nutrition,
      energyKcal: part(day.nutrition?.energyKcal) ?? undefined,
    },
  };
}

export function observedDays(j: Journey): MonthDay[] {
  const current = snapshot(j);
  return current ? [...MONTH.slice(0, j.index), current] : [];
}

export function valueFor(
  day: HealthDayRow | undefined,
  metric: string,
): number | null {
  if (!day) return null;
  if (metric.startsWith("app:"))
    return day.app_usage?.[metric.slice(4)] ?? null;
  if (metric === "energy_kcal") return day.nutrition?.energyKcal ?? null;
  if (metric === "water_ml") return day.nutrition?.waterMl ?? null;
  if (metric === "protein_g") return day.nutrition?.proteinG ?? null;
  const value = (day as unknown as Record<string, unknown>)[metric];
  return typeof value === "number" ? value : null;
}

export function journeyGoals(j: Journey): Goal[] {
  const plan =
    [...j.plans].reverse().find((p) => p.through < j.index) ?? latestPlan(j);
  if (!plan) return [];
  // A plan only evaluates days AFTER its analysis cutoff (no retrospective rewards).
  const started = j.index > plan.through;
  return plan.goals.map((g) => ({
    ...g,
    current: started ? (valueFor(snapshot(j), g.metric) ?? 0) : 0,
    daysTotal: Math.min(7, 29 - plan.through),
    daysHit: MONTH.slice(
      plan.through + 1,
      j.index + (j.phase === "complete" ? 1 : 0),
    ).filter((day) => {
      const v = valueFor(day, g.metric);
      return (
        v !== null &&
        (g.direction === "at_least" ? v >= g.target : v <= g.target)
      );
    }).length,
  }));
}

export function loadBaseline(state: SavedGarden): SavedGarden {
  if (state.journey.phase !== "empty") return state;
  return {
    ...state,
    sim: { ...state.sim, offset: 6 },
    journey: { ...emptyJourney(), index: 6, phase: "baseline" },
  };
}

export function preparedPlan(through: number): Plan {
  const plan = prepared.plans.find((p) => p.through === through);
  if (!plan) throw new Error("No prepared analysis for this checkpoint.");
  return JSON.parse(JSON.stringify(plan)) as Plan;
}

export function applyPlan(state: SavedGarden, plan: Plan): SavedGarden {
  if (
    state.journey.phase === "midday" ||
    plan.through !== state.journey.index ||
    plan.through < 6
  )
    throw new Error("Finish the day before analyzing it.");
  const plans = state.journey.plans.filter((p) => p.through !== plan.through);
  return {
    ...state,
    journey: { ...state.journey, plans: [...plans, plan] },
  };
}

/** Final totals first, then one reward transaction per date. Never pay limit goals at midday. */
export function finishDay(state: SavedGarden): SavedGarden {
  const j = state.journey;
  if (j.phase !== "midday") return state;
  const date = MONTH[j.index].date;
  if (j.settled.includes(date)) return state;
  const complete = { ...j, phase: "complete" as const };
  const goals = journeyGoals(complete);
  const hit = goals.filter((g) =>
    g.direction === "at_least" ? g.current >= g.target : g.current <= g.target,
  );
  const earned = hit.reduce((sum, g) => sum + g.reward, 0);
  const health = goals.length ? hit.length / goals.length : 0;
  return {
    ...state,
    sim: {
      ...state.sim,
      coins: state.sim.coins + earned,
      health: state.sim.health * 0.6 + health * 0.4,
      streak: hit.length >= 2 ? state.sim.streak + 1 : 0,
      alerts: [
        {
          id: `reward-${date}`,
          level: "celebrate" as const,
          title: `${earned} gold earned`,
          body: `${hit.length} of ${goals.length} goals completed.`,
          time: shortDate(date),
          read: false,
        },
        ...state.sim.alerts,
      ].slice(0, 8),
    },
    journey: {
      ...complete,
      settled: [...j.settled, date],
      ledger: [
        ...j.ledger,
        {
          id: `reward-${date}`,
          date,
          amount: earned,
          goalsHit: hit.length,
          goalsTotal: goals.length,
        },
      ],
    },
  };
}

const STAGES: Stage[] = ["seed", "sprout", "young", "mature", "blooming"];
function grow(plant: Plant, sunlight: number): Plant {
  if (!plant.wateredToday)
    return { ...plant, resting: true, fertilizedToday: false };
  const progress = plant.growth + 0.35 + 0.65 * sunlight;
  const stage =
    progress >= 1
      ? STAGES[Math.min(4, STAGES.indexOf(plant.stage) + 1)]
      : plant.stage;
  return {
    ...plant,
    stage,
    growth: stage === "blooming" ? 1 : progress >= 1 ? progress - 1 : progress,
    wateredToday: false,
    fertilizedToday: false,
    resting: false,
  };
}

/** Explicitly separate opening tomorrow from finishing today, including the 30th day. */
export function openNextDay(state: SavedGarden): SavedGarden {
  const j = state.journey;
  if (
    j.index >= 29 ||
    j.phase === "empty" ||
    j.phase === "midday" ||
    !latestPlan(j)
  )
    return state;
  const entry = j.ledger.find((x) => x.date === MONTH[j.index].date);
  const sunlight = entry?.goalsTotal ? entry.goalsHit / entry.goalsTotal : 0;
  const index = j.index + 1;
  return {
    ...state,
    sim: {
      ...state.sim,
      offset: index,
      plants:
        j.phase === "complete"
          ? state.sim.plants.map((p) => grow(p, sunlight))
          : state.sim.plants,
    },
    journey: { ...j, index, phase: "midday" },
  };
}

export function validatePlan(value: unknown, through: number): Plan {
  const p = value as Plan | null;
  const allowed = [
    "steps",
    "sleep_minutes",
    "feed_minutes",
    "daylight_minutes",
    "active_minutes",
  ];
  if (
    !p ||
    p.through !== through ||
    !["prepared_ai", "live_ai"].includes(p.source) ||
    typeof p.summary !== "string" ||
    !p.summary.trim() ||
    p.summary.length > 1800 ||
    [p.provider, p.model, p.generatedAt].some(
      (s) => s !== undefined && (typeof s !== "string" || s.length > 200),
    ) ||
    (p.cached !== undefined && typeof p.cached !== "boolean") ||
    !Array.isArray(p.goals) ||
    p.goals.length < 2 ||
    p.goals.length > 4 ||
    !Array.isArray(p.insights) ||
    p.insights.length > 5 ||
    p.goals.some(
      (g) =>
        !g ||
        typeof g.id !== "string" ||
        !allowed.includes(g.metric) ||
        !Number.isFinite(g.target) ||
        g.target <= 0 ||
        g.target > (g.metric === "steps" ? 20000 : 600) ||
        (g.metric === "sleep_minutes" && (g.target < 360 || g.target > 540)) ||
        (g.metric === "feed_minutes"
          ? g.direction !== "at_most" || g.target < 30 || g.target > 240
          : g.direction !== "at_least") ||
        !Number.isSafeInteger(g.reward) ||
        g.reward < 5 ||
        g.reward > 50 ||
        !["at_least", "at_most"].includes(g.direction) ||
        [g.title, g.reason, g.unit].some(
          (s) => typeof s !== "string" || s.length > 1000,
        ),
    ) ||
    new Set(p.goals.map((g) => g.id)).size !== p.goals.length ||
    p.insights.some(
      (i) =>
        !i ||
        typeof i.id !== "string" ||
        !["pattern", "suggestion", "praise"].includes(i.kind) ||
        [i.title, i.body].some(
          (s) => typeof s !== "string" || s.length > 1800,
        ) ||
        [i.evidence, i.action].some(
          (s) => s != null && (typeof s !== "string" || s.length > 1800),
        ),
    )
  )
    throw new Error(
      "The coach returned an invalid plan. Your previous plan is safe.",
    );
  return p;
}

/** Optional live model gateway; secrets stay on the computer, never in Expo's bundle. */
export async function analyzeCheckpoint(j: Journey): Promise<Plan> {
  const url = process.env.EXPO_PUBLIC_COACH_URL;
  if (!url) return preparedPlan(j.index);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_COACH_TOKEN ?? ""}`,
      },
      body: JSON.stringify({
        through: j.index,
        days: MONTH.slice(0, j.index + 1),
        previous: latestPlan(j) ?? null,
      }),
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        "Live coach unavailable. You can use the prepared analysis from demo controls.",
      );
    return {
      ...validatePlan(await response.json(), j.index),
      source: "live_ai",
    };
  } finally {
    clearTimeout(timeout);
  }
}
