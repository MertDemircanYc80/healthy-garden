// Turns raw samples/events from any source into per-day numbers, then into DailySummary.
// Pure functions — shared by the browser importer and the server (/api/ingest, /api/summaries).
import { THRESHOLDS } from "@/lib/economy";
import type { DailySummary, DataSource } from "@/lib/types";
import {
  localClock,
  localDay,
  minutesBetween,
  type DailyMetrics,
  type DeviceEvent,
  type HealthSample,
  type SampleType,
} from "./samples";

const MAX_APP_SESSION_MIN = 180; // cap a single feed session (missed "close" events)
const MAX_DRIVE_MIN = 6 * 60;

function addDay(day: string, n: number) {
  const d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10) + n));
  return d.toISOString().slice(0, 10);
}

/** Merge overlapping [start,end] intervals (ms) and return total minutes. */
function unionMinutes(intervals: [number, number][]): number {
  if (!intervals.length) return 0;
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [s, e] = sorted[0];
  for (const [a, b] of sorted.slice(1)) {
    if (a <= e) e = Math.max(e, b);
    else {
      total += e - s;
      [s, e] = [a, b];
    }
  }
  total += e - s;
  return Math.round(total / 60000);
}

/**
 * Quantity types where iPhone and Apple Watch both record the same activity.
 * Summing every source double-counts, so per day we keep the source with the highest total
 * (the Health app does something similar with source priority).
 */
const DEDUPE_BY_SOURCE: SampleType[] = ["steps", "distance_walk_run_km", "active_energy_kcal", "exercise_minutes", "daylight_minutes"];

const NUTRITION: Partial<Record<SampleType, keyof NonNullable<DailyMetrics["nutrition"]>>> = {
  dietary_energy_kcal: "energyKcal",
  protein_g: "proteinG",
  carbs_g: "carbsG",
  fat_g: "fatG",
  water_ml: "waterMl",
};

/** The night a sleep sample belongs to: sleep that ends before 18:00 counts for that day. */
function nightOf(endTs: string) {
  const day = localDay(endTs);
  return localClock(endTs) < "18:00" ? day : addDay(day, 1);
}

export function summarizeSamples(samples: HealthSample[]): Record<string, DailyMetrics> {
  const out: Record<string, DailyMetrics> = {};
  const get = (day: string) => (out[day] ??= {});

  // 1) quantities with source de-duplication
  const perSource: Record<string, Record<string, Record<string, number>>> = {}; // day → type → source → sum
  // 2) sleep intervals per night
  const asleep: Record<string, [number, number][]> = {};
  const inBed: Record<string, [number, number][]> = {};
  const nightBounds: Record<string, { start: string; end: string }> = {};

  for (const s of samples) {
    const day = localDay(s.start);
    if (DEDUPE_BY_SOURCE.includes(s.type)) {
      const bySrc = ((perSource[day] ??= {})[s.type] ??= {});
      bySrc[s.source ?? "unknown"] = (bySrc[s.source ?? "unknown"] ?? 0) + s.value;
    } else if (NUTRITION[s.type]) {
      const n = (get(day).nutrition ??= {});
      const key = NUTRITION[s.type]!;
      n[key] = (n[key] ?? 0) + s.value;
    } else if (s.type === "workout") {
      const m = get(day);
      m.workoutMinutes = (m.workoutMinutes ?? 0) + s.value;
      if (s.workoutType === "running") m.runningMinutes = (m.runningMinutes ?? 0) + s.value;
    } else if (s.type === "sleep_asleep" || s.type === "sleep_in_bed") {
      const night = nightOf(s.end);
      const iv: [number, number] = [new Date(s.start).getTime(), new Date(s.end).getTime()];
      ((s.type === "sleep_asleep" ? asleep : inBed)[night] ??= []).push(iv);
      const b = nightBounds[night];
      if (s.type === "sleep_asleep" || !b) {
        nightBounds[night] = {
          start: !b || new Date(s.start) < new Date(b.start) ? s.start : b.start,
          end: !b || new Date(s.end) > new Date(b.end) ? s.end : b.end,
        };
      }
    }
  }

  const field: Partial<Record<SampleType, keyof DailyMetrics>> = {
    steps: "steps",
    distance_walk_run_km: "walkingRunningKm",
    active_energy_kcal: "activeEnergyKcal",
    exercise_minutes: "exerciseMinutes",
    daylight_minutes: "outdoorMinutes",
  };
  for (const [day, types] of Object.entries(perSource)) {
    for (const [type, bySrc] of Object.entries(types)) {
      const best = Math.max(...Object.values(bySrc));
      const key = field[type as SampleType]!;
      (get(day) as Record<string, number>)[key] = type === "distance_walk_run_km" ? Math.round(best * 100) / 100 : Math.round(best);
    }
  }

  for (const night of new Set([...Object.keys(asleep), ...Object.keys(inBed)])) {
    const minutes = unionMinutes(asleep[night] ?? []) || unionMinutes(inBed[night] ?? []);
    if (!minutes) continue;
    const m = get(night);
    m.sleepMinutes = minutes;
    m.bedtime = localClock(nightBounds[night].start);
    m.wakeTime = localClock(nightBounds[night].end);
  }
  return out;
}

export interface EventDay {
  scrollMinutes: number;
  longSessions: number;
  appUsage: Record<string, number>;
  drivingMinutes: number;
}

/** Pair open/close and start/end events into durations, per local day of the start. */
export function summarizeEvents(events: DeviceEvent[]): Record<string, EventDay> {
  const out: Record<string, EventDay> = {};
  const get = (day: string) => (out[day] ??= { scrollMinutes: 0, longSessions: 0, appUsage: {}, drivingMinutes: 0 });
  const sorted = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const openApp: Record<string, string> = {};
  let driveStart: string | null = null;

  for (const e of sorted) {
    if (e.kind === "app_open" && e.app) {
      openApp[e.app] = e.at; // a second open without close drops the unknown-length session
    } else if (e.kind === "app_close" && e.app && openApp[e.app]) {
      const start = openApp[e.app];
      delete openApp[e.app];
      const mins = Math.min(MAX_APP_SESSION_MIN, minutesBetween(start, e.at));
      if (mins <= 0) continue;
      const d = get(localDay(start));
      d.scrollMinutes += mins;
      d.appUsage[e.app] = (d.appUsage[e.app] ?? 0) + mins;
      if (mins > THRESHOLDS.longSessionMinutes) d.longSessions += 1;
    } else if (e.kind === "driving_start") {
      driveStart = e.at;
    } else if (e.kind === "driving_end" && driveStart) {
      const mins = Math.min(MAX_DRIVE_MIN, minutesBetween(driveStart, e.at));
      if (mins > 0) get(localDay(driveStart)).drivingMinutes += mins;
      driveStart = null;
    }
  }
  for (const d of Object.values(out)) {
    d.scrollMinutes = Math.round(d.scrollMinutes);
    d.drivingMinutes = Math.round(d.drivingMinutes);
    for (const k of Object.keys(d.appUsage)) d.appUsage[k] = Math.round(d.appUsage[k]);
  }
  return out;
}

/** Later sources win field by field (nutrition merged key by key). */
export function mergeMetrics(a: DailyMetrics | undefined, b: DailyMetrics | undefined): DailyMetrics {
  const defined = <T extends object>(o: T | undefined) =>
    Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
  const nutrition = { ...defined(a?.nutrition), ...defined(b?.nutrition) };
  const merged: DailyMetrics = { ...defined(a), ...defined(b) };
  if (Object.keys(nutrition).length) merged.nutrition = nutrition;
  else delete merged.nutrition;
  return merged;
}

export function toDailySummary(day: string, m: DailyMetrics | undefined, ev: EventDay | undefined, source: DataSource): DailySummary {
  const s: DailySummary = {
    date: day,
    steps: m?.steps ?? 0,
    sleepMinutes: m?.sleepMinutes ?? 0,
    bedtime: m?.bedtime ?? null,
    wakeTime: m?.wakeTime ?? null,
    activeMinutes: m?.exerciseMinutes ?? m?.workoutMinutes ?? 0,
    scrollMinutes: ev?.scrollMinutes ?? 0,
    longSessions: ev?.longSessions ?? 0,
    source,
  };
  if (m?.walkingRunningKm !== undefined) s.walkingRunningKm = m.walkingRunningKm;
  if (m?.runningMinutes !== undefined) s.runningMinutes = Math.round(m.runningMinutes);
  if (m?.workoutMinutes !== undefined) s.workoutMinutes = Math.round(m.workoutMinutes);
  if (m?.activeEnergyKcal !== undefined) s.activeEnergyKcal = m.activeEnergyKcal;
  if (m?.outdoorMinutes !== undefined) s.outdoorMinutes = m.outdoorMinutes;
  if (m?.nutrition) s.nutrition = Object.fromEntries(Object.entries(m.nutrition).map(([k, v]) => [k, Math.round(v as number)]));
  if (ev) {
    s.drivingMinutes = ev.drivingMinutes;
    if (Object.keys(ev.appUsage).length) s.appUsage = ev.appUsage;
  }
  return s;
}

/** Everything in one call: samples + daily metrics + events → summaries sorted by date. */
export function buildSummaries(
  input: { samples?: HealthSample[]; daily?: Record<string, DailyMetrics>; events?: DeviceEvent[] },
  source: DataSource,
): DailySummary[] {
  const fromSamples = summarizeSamples(input.samples ?? []);
  const fromEvents = summarizeEvents(input.events ?? []);
  const days = new Set([...Object.keys(fromSamples), ...Object.keys(input.daily ?? {}), ...Object.keys(fromEvents)]);
  return [...days]
    .sort()
    .map((day) => toDailySummary(day, mergeMetrics(fromSamples[day], input.daily?.[day]), fromEvents[day], source));
}
