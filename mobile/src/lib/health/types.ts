// One day of health data, exactly the columns of the health_days table.
// Convention: bedtime / sleep_minutes / wake_time describe the night that ENDED on the
// morning of `date` (so last night's sleep belongs to today).
export interface HealthDayRow {
  date: string; // YYYY-MM-DD, phone's local calendar day
  steps?: number | null;
  walking_running_km?: number | null;
  active_energy_kcal?: number | null;
  active_minutes?: number | null;
  running_minutes?: number | null;
  workout_minutes?: number | null;
  sleep_minutes?: number | null;
  bedtime?: string | null; // "HH:MM"
  wake_time?: string | null;
  daylight_minutes?: number | null;
  screen_minutes?: number | null;
  feed_minutes?: number | null;
  long_sessions?: number | null;
  driving_minutes?: number | null;
  app_usage?: Record<string, number> | null;
  nutrition?: { energyKcal?: number; proteinG?: number; carbsG?: number; fatG?: number; waterMl?: number } | null;
  source?: "healthkit" | "manual" | "shortcut" | "demo";
}

export type HealthStatus =
  | { kind: "unavailable"; reason: "expo_go" | "not_ios" | "no_healthkit" }
  | { kind: "not_connected" }
  | { kind: "connected"; lastSync: string | null };
