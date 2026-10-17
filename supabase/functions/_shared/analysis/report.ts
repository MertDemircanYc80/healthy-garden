// Deterministic parts of the weekly report: score, change and the 7-day bars.
// The AI only writes the summary sentence and one short note per metric.
import { addDays, type Features, type MetricKey, type MetricStats } from "./features.ts";
import type { ReportMetricRow } from "./types.ts";

interface Component {
  key: MetricKey;
  /** 0..1 for a weekly average */
  score: (avg: number) => number;
}

const COMPONENTS: Component[] = [
  { key: "sleep_minutes", score: (v) => Math.min(1, v / 420) },
  { key: "steps", score: (v) => Math.min(1, v / 7500) },
  { key: "active_minutes", score: (v) => Math.min(1, v / 30) },
  { key: "daylight_minutes", score: (v) => Math.min(1, v / 20) },
  { key: "feed_minutes", score: (v) => (v <= 60 ? 1 : Math.max(0, 60 / v)) },
];

function scoreFrom(stats: Record<MetricKey, MetricStats>, pick: "last7" | "prev7"): number | null {
  const parts = COMPONENTS.map((c) => {
    const v = stats[c.key][pick];
    return v === null ? null : c.score(v);
  }).filter((x): x is number => x !== null);
  if (parts.length < 2) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

export function weeklyScore(f: Features): { score: number; change: number } {
  const now = scoreFrom(f.stats, "last7") ?? 50;
  const before = scoreFrom(f.stats, "prev7");
  return { score: now, change: before === null ? 0 : now - before };
}

const REPORT_METRICS: { key: MetricKey; label: string; unit: string; better: "higher" | "lower"; scale: (v: number) => number; goal?: number }[] = [
  { key: "sleep_minutes", label: "Sleep", unit: "h", better: "higher", scale: (v) => Math.round((v / 60) * 10) / 10, goal: 7 },
  { key: "steps", label: "Steps", unit: "k", better: "higher", scale: (v) => Math.round(v / 100) / 10, goal: 7.5 },
  { key: "feed_minutes", label: "Feed apps", unit: "min", better: "lower", scale: Math.round, goal: 60 },
  { key: "active_minutes", label: "Active", unit: "min", better: "higher", scale: Math.round, goal: 30 },
  { key: "daylight_minutes", label: "Daylight", unit: "min", better: "higher", scale: Math.round, goal: 20 },
  { key: "running_minutes", label: "Running", unit: "min", better: "higher", scale: Math.round },
  { key: "driving_minutes", label: "Driving", unit: "min", better: "lower", scale: Math.round },
];

/** Metrics that have enough data this week to show, in display order (max 6). */
export function reportMetricKeys(f: Features): MetricKey[] {
  return REPORT_METRICS.filter((m) => f.stats[m.key].week.filter((v) => v !== null).length >= 3)
    .map((m) => m.key)
    .slice(0, 6);
}

export function reportMetrics(f: Features, notes: Partial<Record<string, string>>, goalTargets: Partial<Record<string, number>>): ReportMetricRow[] {
  const keys = new Set(reportMetricKeys(f));
  return REPORT_METRICS.filter((m) => keys.has(m.key)).map((m) => {
    const goalRaw = goalTargets[m.key];
    const goal = goalRaw !== undefined ? m.scale(goalRaw) : m.goal;
    return {
      metric: m.key,
      label: m.label,
      unit: m.unit,
      week: f.stats[m.key].week.map((v) => (v === null ? 0 : m.scale(v))),
      ...(goal !== undefined ? { goal } : {}),
      better: m.better,
      note: (notes[m.key] ?? "").trim() || defaultNote(f.stats[m.key], m.label),
    };
  });
}

function defaultNote(s: MetricStats, label: string) {
  if (s.changePct === null) return `${label} this week`;
  if (Math.abs(s.changePct) < 5) return "About the same as last week";
  return `${s.changePct > 0 ? "Up" : "Down"} ${Math.abs(s.changePct)}% from last week`;
}

export function reportPeriod(today: string) {
  return { period_start: addDays(today, -6), period_end: today };
}
