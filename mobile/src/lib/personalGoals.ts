import type { Goal, Metric } from "@/types";
import type { HealthDayRow } from "./health/types";
import type { SavedGarden } from "./savedGarden";
import { goalProgress, onTrack } from "./format";
import { rollGardenDay } from "./dailyCycle";

export interface PersonalProgress {
  startedOn: string;
  weeks: Record<string, { startsOn: string; goals: Goal[] }>;
  /** Idempotency keys only; never a user-facing transaction history. */
  rewarded: string[];
}
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0,10);
export function monday(date: string) {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}
function value(row: HealthDayRow | undefined, metric: Metric): number | null {
  if (!row || row.source === "demo") return null;
  const found = row[metric as keyof HealthDayRow];
  return typeof found === "number" && Number.isFinite(found) ? found : null;
}
const RULES: { metric: Metric; title: string; unit: string; direction: Goal["direction"]; reward: number; target: (average: number) => number }[] = [
  { metric:"steps", title:"A little more walking", unit:"steps", direction:"at_least", reward:20, target:n => Math.min(15000, Math.max(1000, Math.round(n * 1.15 / 500) * 500)) },
  { metric:"active_minutes", title:"Make room for movement", unit:"min", direction:"at_least", reward:20, target:n => Math.min(60, Math.max(5, Math.round(n * 1.1 / 5) * 5)) },
  { metric:"feed_minutes", title:"A little less feed time", unit:"min", direction:"at_most", reward:25, target:n => Math.max(0, Math.round(n * 0.8)) },
  { metric:"daylight_minutes", title:"Some daylight each day", unit:"min", direction:"at_least", reward:15, target:n => Math.min(60, Math.max(5, Math.round(n / 5) * 5)) },
];
/** Simple local goals from observed totals. No sample values or invented missing readings. */
function makeGoals(days: HealthDayRow[], date: string): Goal[] {
  const previous = days.filter(d => d.date >= addDays(date,-7) && d.date < date && d.source !== "demo");
  return RULES.flatMap(rule => {
    const values = previous.map(d => value(d,rule.metric)).filter((v): v is number => v !== null);
    if (!values.length) return [];
    const average = values.reduce((a,b)=>a+b,0) / values.length;
    return [{ id:`personal:${monday(date)}:${rule.metric}`, title:rule.title, metric:rule.metric, target:rule.target(average),
      unit:rule.unit, direction:rule.direction, reward:rule.reward, current:0, currentAvailable:false,
      reason:`Based on ${values.length} recorded day(s) in the previous week, averaging ${Math.round(average)} ${rule.unit}. This target stays fixed for the week. Not medical advice.`, daysHit:0, daysTotal:7 }];
  });
}
export function personalGoalsAt(progress: PersonalProgress | undefined, days: HealthDayRow[], date: string): Goal[] {
  const plan = progress?.weeks[monday(date)];
  if (!plan || date < plan.startsOn) return [];
  const row = days.find(d => d.date === date);
  return plan.goals.map(g => {
    const current = value(row,g.metric);
    return { ...g, current:current ?? 0, currentAvailable:current !== null,
      daysHit:days.filter(d => d.date >= plan.startsOn && d.date < date && value(d,g.metric) !== null && onTrack({...g,current:value(d,g.metric)!,currentAvailable:true})).length,
    };
  });
}
export function sunlightFor(goals: Goal[]) {
  return goals.length ? goals.reduce((sum,g)=>sum+goalProgress(g),0) / goals.length : 0;
}
/** Persist targets and reward keys in the same transaction as gold. */
export function reconcilePersonal(state: SavedGarden, days: HealthDayRow[], date: string): SavedGarden {
  if (state.calendarDate && date < state.calendarDate) return state;
  let progress: PersonalProgress = state.personal ?? { startedOn:date, weeks:{}, rewarded:[] };
  let changed = !state.personal;
  const week = monday(date);
  if (!progress.weeks[week] || progress.weeks[week].goals.length === 0) {
    const goals = makeGoals(days,date);
    if (goals.length || !progress.weeks[week]) {
      progress = { ...progress, weeks:{...progress.weeks,[week]:{startsOn:date,goals}} };
      changed = true;
    }
  }
  const rewarded = new Set(progress.rewarded);
  let earned = 0;
  for (const day of days) {
    if (day.date < progress.startedOn || day.date > date || day.source === "demo") continue;
    for (const goal of personalGoalsAt(progress,days,day.date)) {
      // Limits can still be exceeded during today, so settle them only after the date closes.
      if (goal.direction === "at_most" && day.date === date) continue;
      const key = `${day.date}:${goal.metric}`;
      if (onTrack(goal) && !rewarded.has(key)) { earned += goal.reward; rewarded.add(key); }
    }
  }
  if (earned) { progress = {...progress,rewarded:[...rewarded]}; changed = true; }
  let next = state;
  if (state.calendarDate && state.calendarDate < date) {
    // Use the completed day's real sunlight for overnight growth.
    const previousSun = sunlightFor(personalGoalsAt(progress,days,state.calendarDate));
    next = rollGardenDay({...state,sim:{...state.sim,health:previousSun}},date);
  } else next = rollGardenDay(state,date);
  const health = sunlightFor(personalGoalsAt(progress,days,date));
  let streak = 0;
  for (let d = addDays(date,-1); d >= progress.startedOn; d = addDays(d,-1)) {
    if (!personalGoalsAt(progress,days,d).some(onTrack)) break;
    streak++;
  }
  if (!changed && next === state && health === state.sim.health && streak === state.sim.streak) return state;
  return {...next,personal:progress,sim:{...next.sim,health,streak,coins:next.sim.coins+earned}};
}
