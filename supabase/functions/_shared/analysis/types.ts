// Row shapes used by the analysis (mirror supabase/migrations/*_app_schema.sql).

export interface HealthDay {
  date: string; // YYYY-MM-DD (user's local day)
  steps: number | null;
  walking_running_km: number | null;
  active_energy_kcal: number | null;
  active_minutes: number | null;
  running_minutes: number | null;
  workout_minutes: number | null;
  sleep_minutes: number | null;
  bedtime: string | null; // "HH:MM" or "HH:MM:SS"
  wake_time: string | null;
  daylight_minutes: number | null;
  screen_minutes: number | null;
  feed_minutes: number | null;
  long_sessions: number | null;
  driving_minutes: number | null;
  app_usage: Record<string, number> | null;
  nutrition: { energyKcal?: number; proteinG?: number; carbsG?: number; fatG?: number; waterMl?: number } | null;
}

export type GoalMetric =
  | "steps"
  | "sleep_minutes"
  | "bedtime"
  | "active_minutes"
  | "running_minutes"
  | "feed_minutes"
  | "screen_minutes"
  | "daylight_minutes"
  | "water_ml"
  | "protein_g";

export const GOAL_METRICS: GoalMetric[] = [
  "steps",
  "sleep_minutes",
  "bedtime",
  "active_minutes",
  "running_minutes",
  "feed_minutes",
  "screen_minutes",
  "daylight_minutes",
  "water_ml",
  "protein_g",
];

export interface GoalRow {
  week_start: string;
  title: string;
  metric: GoalMetric;
  target: number;
  unit: string;
  direction: "at_least" | "at_most";
  reason: string;
  reward_coins: number;
}

export interface InsightRow {
  kind: "pattern" | "suggestion" | "praise";
  title: string;
  body: string;
  evidence: string | null;
  action: string | null;
  metric: string | null;
}

export interface ReportMetricRow {
  metric: string;
  label: string;
  unit: string;
  week: number[];
  goal?: number;
  better: "higher" | "lower";
  note: string;
}

export interface ReportRow {
  period_start: string;
  period_end: string;
  score: number;
  score_change: number;
  summary: string;
  metrics: ReportMetricRow[];
}

export interface AlertRow {
  level: "nudge" | "heads_up" | "celebrate";
  title: string;
  body: string;
}

export interface AnalysisResult {
  goals: GoalRow[]; // empty when this week's goals already exist and shouldn't change
  insights: InsightRow[];
  report: ReportRow;
  alerts: AlertRow[];
}
