// Raw data model: what any source (Apple Health export, iOS Shortcuts, Chrome extension,
// future native app) can send us BEFORE it is turned into a DailySummary.
// Timestamps are ISO 8601 WITH the user's offset, e.g. "2026-10-16T07:30:00-07:00",
// so the user's local calendar day is simply the first 10 characters.

export type SampleType =
  | "steps"
  | "distance_walk_run_km"
  | "active_energy_kcal"
  | "exercise_minutes"
  | "daylight_minutes"
  | "sleep_asleep" // value ignored; duration = end - start
  | "sleep_in_bed"
  | "workout" // value = minutes; workoutType says which
  | "dietary_energy_kcal"
  | "protein_g"
  | "carbs_g"
  | "fat_g"
  | "water_ml";

export type WorkoutType = "running" | "walking" | "cycling" | "hiking" | "swimming" | "other";

export interface HealthSample {
  type: SampleType;
  start: string;
  end: string;
  value: number;
  /** Device/app that recorded it (e.g. "Apple Watch", "iPhone"). Used to avoid double counting. */
  source?: string;
  workoutType?: WorkoutType;
}

export type DeviceEventKind = "app_open" | "app_close" | "driving_start" | "driving_end";

export interface DeviceEvent {
  kind: DeviceEventKind;
  at: string;
  app?: string; // for app_open / app_close
}

/** Pre-aggregated daily numbers (what an iOS Shortcut can easily compute and send). */
export interface DailyMetrics {
  steps?: number;
  walkingRunningKm?: number;
  activeEnergyKcal?: number;
  exerciseMinutes?: number;
  runningMinutes?: number;
  workoutMinutes?: number;
  outdoorMinutes?: number;
  sleepMinutes?: number;
  bedtime?: string; // "HH:MM"
  wakeTime?: string; // "HH:MM"
  nutrition?: {
    energyKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    waterMl?: number;
  };
}

export const localDay = (ts: string) => ts.slice(0, 10);
export const localClock = (ts: string) => ts.slice(11, 16);

/** Minutes between two offset timestamps (Date handles the offsets). */
export const minutesBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000;

/** "2024-05-01 07:30:00 -0700" (Apple export) → "2024-05-01T07:30:00-07:00" */
export function fromAppleDate(s: string): string {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/.exec(s.trim());
  if (!m) return s;
  return `${m[1]}T${m[2]}${m[3]}${m[4]}:${m[5]}`;
}
