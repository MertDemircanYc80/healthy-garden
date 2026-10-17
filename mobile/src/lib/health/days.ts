// Pure helpers that turn HealthKit results into per-day rows. No native code here, so this
// file is tested on any machine (scripts/check-health.ts).
import type { HealthDayRow } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day of a Date (the phone's timezone). */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function localClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBack(n: number, now = new Date()): Date {
  const s = startOfLocalDay(now);
  s.setDate(s.getDate() - n);
  return s;
}

export interface Interval {
  start: Date;
  end: Date;
}

/** Total minutes covered by possibly-overlapping intervals (iPhone + Watch + sleep apps overlap). */
export function unionMinutes(intervals: Interval[]): number {
  if (!intervals.length) return 0;
  const xs = intervals.map((i) => [i.start.getTime(), i.end.getTime()] as const).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [s, e] = xs[0];
  for (const [a, b] of xs.slice(1)) {
    if (a <= e) e = Math.max(e, b);
    else {
      total += e - s;
      [s, e] = [a, b];
    }
  }
  total += e - s;
  return Math.round(total / 60000);
}

export interface SleepSample extends Interval {
  /** HealthKit CategoryValueSleepAnalysis: 0 inBed, 1 asleep, 2 awake, 3 core, 4 deep, 5 REM */
  value: number;
}

/**
 * Group sleep into nights, each assigned to the day it ENDS (sleep ending before 6 pm counts
 * for that day; a nap after 6 pm counts for the next morning). Asleep stages are preferred;
 * "in bed" is used only when a night has no stage data (older devices / some apps).
 */
export function sleepByDay(samples: SleepSample[]): Record<string, Pick<HealthDayRow, "sleep_minutes" | "bedtime" | "wake_time">> {
  const nights: Record<string, { asleep: Interval[]; inBed: Interval[] }> = {};
  for (const s of samples) {
    if (s.value === 2) continue; // awake
    const end = s.end;
    const day = end.getHours() < 18 ? localDay(end) : localDay(new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1));
    const n = (nights[day] ??= { asleep: [], inBed: [] });
    (s.value === 0 ? n.inBed : n.asleep).push(s);
  }
  const out: Record<string, Pick<HealthDayRow, "sleep_minutes" | "bedtime" | "wake_time">> = {};
  for (const [day, n] of Object.entries(nights)) {
    const main = mainSession(n.asleep.length ? n.asleep : n.inBed);
    if (!main) continue;
    out[day] = { sleep_minutes: main.minutes, bedtime: localClock(main.start), wake_time: localClock(main.end) };
  }
  return out;
}

/**
 * Split intervals into sessions (gaps over 90 min start a new one) and return the longest —
 * the night's main sleep. Afternoon naps don't move bedtime/wake time or add minutes.
 */
function mainSession(intervals: Interval[]): { start: Date; end: Date; minutes: number } | null {
  if (!intervals.length) return null;
  const xs = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const sessions: Interval[][] = [];
  let cur: Interval[] = [xs[0]];
  let curEnd = xs[0].end.getTime();
  for (const iv of xs.slice(1)) {
    if (iv.start.getTime() - curEnd > 90 * 60000) {
      sessions.push(cur);
      cur = [];
    }
    cur.push(iv);
    curEnd = Math.max(curEnd, iv.end.getTime());
  }
  sessions.push(cur);
  let best: { start: Date; end: Date; minutes: number } | null = null;
  for (const s of sessions) {
    const minutes = unionMinutes(s);
    if (minutes < 30) continue; // ignore tiny fragments
    if (!best || minutes > best.minutes) {
      best = {
        start: new Date(Math.min(...s.map((i) => i.start.getTime()))),
        end: new Date(Math.max(...s.map((i) => i.end.getTime()))),
        minutes,
      };
    }
  }
  return best;
}

export interface DailyTotal {
  start: Date; // start of the bucket (local midnight)
  value: number;
}

/** Statistics-collection buckets → { day: value } with sensible rounding. */
export function totalsByDay(buckets: DailyTotal[], round: (v: number) => number = Math.round): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of buckets) if (Number.isFinite(b.value) && b.value > 0) out[localDay(b.start)] = round(b.value);
  return out;
}

export interface WorkoutLite {
  start: Date;
  minutes: number;
  running: boolean;
}

export function workoutsByDay(ws: WorkoutLite[]): Record<string, { workout: number; running: number }> {
  const out: Record<string, { workout: number; running: number }> = {};
  for (const w of ws) {
    const d = (out[localDay(w.start)] ??= { workout: 0, running: 0 });
    d.workout += w.minutes;
    if (w.running) d.running += w.minutes;
  }
  for (const v of Object.values(out)) {
    v.workout = Math.round(v.workout);
    v.running = Math.round(v.running);
  }
  return out;
}

/** Merge every per-day map into rows, for each day in [from, today]. Missing data stays undefined (never 0). */
export function buildRows(
  from: Date,
  to: Date,
  parts: {
    steps?: Record<string, number>;
    distanceKm?: Record<string, number>;
    activeKcal?: Record<string, number>;
    exerciseMin?: Record<string, number>;
    daylightMin?: Record<string, number>;
    sleep?: ReturnType<typeof sleepByDay>;
    workouts?: ReturnType<typeof workoutsByDay>;
    nutrition?: { energyKcal?: Record<string, number>; proteinG?: Record<string, number>; carbsG?: Record<string, number>; fatG?: Record<string, number>; waterMl?: Record<string, number> };
  },
): HealthDayRow[] {
  const rows: HealthDayRow[] = [];
  for (let d = startOfLocalDay(from); d <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const day = localDay(d);
    const row: HealthDayRow = { date: day, source: "healthkit" };
    const set = <K extends keyof HealthDayRow>(k: K, v: HealthDayRow[K] | undefined) => {
      if (v !== undefined) row[k] = v;
    };
    set("steps", parts.steps?.[day]);
    set("walking_running_km", parts.distanceKm?.[day]);
    set("active_energy_kcal", parts.activeKcal?.[day]);
    set("active_minutes", parts.exerciseMin?.[day]);
    set("daylight_minutes", parts.daylightMin?.[day]);
    const s = parts.sleep?.[day];
    if (s) Object.assign(row, s);
    const w = parts.workouts?.[day];
    if (w) {
      row.workout_minutes = w.workout;
      row.running_minutes = w.running;
    }
    const n = parts.nutrition;
    if (n) {
      const nut: NonNullable<HealthDayRow["nutrition"]> = {};
      for (const k of ["energyKcal", "proteinG", "carbsG", "fatG", "waterMl"] as const) {
        const v = n[k]?.[day];
        if (v !== undefined) nut[k] = v;
      }
      if (Object.keys(nut).length) row.nutrition = nut;
    }
    if (Object.keys(row).length > 2) rows.push(row);
  }
  return rows;
}
