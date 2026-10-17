// App data shapes. These mirror the Supabase tables in supabase/migrations/*_app_schema.sql
// so the AI analysis can later fill them without changing the screens.

export type Species =
  | "daisy"
  | "marigold"
  | "lavender"
  | "tulip"
  | "sunflower"
  | "rose"
  | "fruit_tree"
  | "cherry_tree"
  | "oak";

export type Stage = "seed" | "sprout" | "young" | "mature" | "blooming";

export interface Plant {
  id: string;
  species: Species;
  /** Plot in the bed: col 0..BED.cols-1 (left→right), row 0..BED.rows-1 (back→front). */
  col: number;
  row: number;
  stage: Stage;
  growth: number; // 0..1 toward the next stage
  wateredToday: boolean;
  /** Optional for older saves; cleared when the garden advances to the next day. */
  fertilizedToday?: boolean;
  resting: boolean; // skipped days → resting, never dead
  variant?: number; // colour variant for tulips/roses
}

export type Metric =
  | "steps"
  | "sleep_minutes"
  | "bedtime"
  | "active_minutes"
  | "running_minutes"
  | "feed_minutes"
  | "screen_minutes"
  | "daylight_minutes"
  | "driving_minutes"
  | "water_ml"
  | "protein_g";

/** A weekly goal the AI coach sets for this user (table: goals). */
export interface Goal {
  id: string;
  title: string;
  metric: Metric;
  target: number;
  unit: string;
  direction: "at_least" | "at_most";
  current: number;
  /** Why this goal is personal — written by the AI from the user's own data. */
  reason: string;
  reward: number; // coins
  daysHit: number; // this week
  daysTotal: number;
}

export type InsightKind = "pattern" | "suggestion" | "praise";

/** An AI suggestion card (table: insights). */
export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  body: string;
  evidence?: string; // the data behind it, in plain words
  action?: string; // one concrete thing to try
  dismissed?: boolean;
}

export interface ReportMetric {
  metric: Metric;
  label: string;
  unit: string;
  week: number[]; // last 7 days, oldest first
  goal?: number;
  better: "higher" | "lower";
  note: string; // one-line AI read
}

/** Weekly health report (table: reports). */
export interface Report {
  periodLabel: string;
  score: number; // 0..100
  scoreChange: number; // vs last week
  summary: string;
  metrics: ReportMetric[];
}

export type AlertLevel = "nudge" | "heads_up" | "celebrate";

/** Timely alert (table: alerts). */
export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  body: string;
  time: string; // display time
  read: boolean;
}

export interface Today {
  sunlight: number; // 0..1 — share of today's goals on track
  health: number; // 0..1 — 7-day garden health
  coins: number;
  streak: number;
}
