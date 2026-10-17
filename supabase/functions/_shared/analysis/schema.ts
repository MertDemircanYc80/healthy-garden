// The JSON shape Claude must return (Structured Outputs) + a strict sanitizer.
// Structured Outputs can't express numeric ranges or list lengths, so those rules live here.
import { bedtimeHours, clock, type Features, type MetricKey } from "./features.ts";
import { GOAL_METRICS, type AlertRow, type GoalMetric, type GoalRow, type InsightRow } from "./types.ts";

const NOTE_METRICS: MetricKey[] = ["sleep_minutes", "steps", "feed_minutes", "active_minutes", "daylight_minutes", "running_minutes", "driving_minutes"];

const str = { type: "string" } as const;
const strOrNull = { anyOf: [{ type: "string" }, { type: "null" }] } as const;

export const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["report_summary", "metric_notes", "goals", "insights", "alerts"],
  properties: {
    report_summary: { ...str, description: "Two sentences max about this week, warm and specific, citing facts." },
    metric_notes: {
      type: "array",
      description: "One short note (max 8 words) per report metric listed in the request.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["metric", "note"],
        properties: { metric: { type: "string", enum: NOTE_METRICS }, note: str },
      },
    },
    goals: {
      type: "array",
      description: "Exactly 3 or 4 goals when goals are requested, otherwise an empty array.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "metric", "target", "reason", "reward_coins", "fact_ids"],
        properties: {
          title: { ...str, description: "Max 6 words, e.g. 'Phone down by 11:15 pm'." },
          metric: { type: "string", enum: GOAL_METRICS },
          target: { type: "number", description: "Per-day target. bedtime = hours on a 24h clock where after-midnight is 24+ (23.25 = 11:15 pm, 24.5 = 12:30 am). sleep in minutes." },
          reason: { ...str, description: "Why this is personal, quoting the user's own numbers from the facts. Max 2 sentences." },
          reward_coins: { type: "integer", description: "10 to 30; harder goals earn more." },
          fact_ids: { type: "array", items: str },
        },
      },
    },
    insights: {
      type: "array",
      description: "2 to 4 insights.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "title", "body", "evidence", "action", "metric", "fact_ids"],
        properties: {
          kind: { type: "string", enum: ["pattern", "suggestion", "praise"] },
          title: { ...str, description: "Max 8 words." },
          body: { ...str, description: "Max 2 sentences." },
          evidence: { ...str, description: "The data behind it in plain words, e.g. '4 of the last 5 late nights'." },
          action: { ...strOrNull, description: "One concrete thing to try in the next 24 hours, or null for praise." },
          metric: strOrNull,
          fact_ids: { type: "array", items: str },
        },
      },
    },
    alerts: {
      type: "array",
      description: "0 to 2 alerts for today.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["level", "title", "body"],
        properties: { level: { type: "string", enum: ["nudge", "heads_up", "celebrate"] }, title: str, body: str },
      },
    },
  },
} as const;

export interface RawOutput {
  report_summary: string;
  metric_notes: { metric: string; note: string }[];
  goals: { title: string; metric: string; target: number; reason: string; reward_coins: number; fact_ids: string[] }[];
  insights: { kind: string; title: string; body: string; evidence: string; action: string | null; metric: string | null; fact_ids: string[] }[];
  alerts: { level: string; title: string; body: string }[];
}

// ---------- goal rules ----------

const GOAL_RULES: Record<GoalMetric, { unit: string; direction: "at_least" | "at_most"; min: number; max: number; round: (v: number) => number }> = {
  steps: { unit: "steps", direction: "at_least", min: 2000, max: 20000, round: (v) => Math.round(v / 250) * 250 },
  sleep_minutes: { unit: "min", direction: "at_least", min: 390, max: 570, round: (v) => Math.round(v / 15) * 15 },
  bedtime: { unit: "", direction: "at_most", min: 21.5, max: 25, round: (v) => Math.round(v * 4) / 4 },
  active_minutes: { unit: "min", direction: "at_least", min: 10, max: 120, round: (v) => Math.round(v / 5) * 5 },
  running_minutes: { unit: "min", direction: "at_least", min: 10, max: 90, round: (v) => Math.round(v / 5) * 5 },
  feed_minutes: { unit: "min", direction: "at_most", min: 15, max: 240, round: (v) => Math.round(v / 5) * 5 },
  screen_minutes: { unit: "min", direction: "at_most", min: 60, max: 480, round: (v) => Math.round(v / 15) * 15 },
  daylight_minutes: { unit: "min", direction: "at_least", min: 10, max: 120, round: (v) => Math.round(v / 5) * 5 },
  water_ml: { unit: "ml", direction: "at_least", min: 1000, max: 3500, round: (v) => Math.round(v / 250) * 250 },
  protein_g: { unit: "g", direction: "at_least", min: 40, max: 180, round: (v) => Math.round(v / 5) * 5 },
};

/** Which goal metrics this user actually has data for (a goal they can't be measured on is useless). */
export function measurableGoalMetrics(f: Features): GoalMetric[] {
  const has = (k: MetricKey) => f.stats[k].daysWithData >= 3;
  return GOAL_METRICS.filter((m) => {
    if (m === "water_ml") return has("water_ml");
    if (m === "protein_g") return has("protein_g");
    return has(m as MetricKey);
  });
}

const clampText = (s: unknown, max: number) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
};

/** Never let the coach set restrictive food targets or talk like a doctor. */
const BLOCKED = /\b(diagnos\w*|disorder|depress\w*|anxiety disorder|insomnia|calorie deficit|lose weight|weight loss|eat less|skip meals?|fasting|bmi|obes\w*)\b/i;

export function sanitize(raw: RawOutput, f: Features, opts: { wantGoals: boolean; weekStart: string }) {
  const factIds = new Set(f.facts.map((x) => x.id));
  const measurable = new Set(measurableGoalMetrics(f));

  const goals: GoalRow[] = [];
  if (opts.wantGoals) {
    const seen = new Set<string>();
    for (const g of raw.goals ?? []) {
      const metric = String(g.metric) as GoalMetric;
      const rule = GOAL_RULES[metric];
      if (!rule || !measurable.has(metric) || seen.has(metric)) continue;
      if (BLOCKED.test(`${g.title} ${g.reason}`)) continue;
      let target = Number(g.target);
      if (!Number.isFinite(target)) continue;
      if (metric === "sleep_minutes" && target <= 12) target *= 60; // model answered in hours
      target = rule.round(Math.min(rule.max, Math.max(rule.min, target)));
      seen.add(metric);
      goals.push({
        week_start: opts.weekStart,
        title: clampText(g.title, 48),
        metric,
        target,
        unit: rule.unit,
        direction: rule.direction,
        reason: clampText(g.reason, 280),
        reward_coins: Math.min(30, Math.max(10, Math.round(Number(g.reward_coins) || 15))),
      });
      if (goals.length === 4) break;
    }
  }

  const insights: InsightRow[] = [];
  for (const i of raw.insights ?? []) {
    if (!["pattern", "suggestion", "praise"].includes(i.kind)) continue;
    const text = `${i.title} ${i.body} ${i.action ?? ""}`;
    if (BLOCKED.test(text)) continue;
    // Patterns must point at a real fact — no invented correlations.
    if (i.kind === "pattern" && !(i.fact_ids ?? []).some((id) => factIds.has(id))) continue;
    insights.push({
      kind: i.kind as InsightRow["kind"],
      title: clampText(i.title, 60),
      body: clampText(i.body, 300),
      evidence: i.evidence ? clampText(i.evidence, 120) : null,
      action: i.kind === "praise" || !i.action ? null : clampText(i.action, 160),
      metric: i.metric ? clampText(i.metric, 40) : null,
    });
    if (insights.length === 4) break;
  }

  const alerts: AlertRow[] = (raw.alerts ?? [])
    .filter((a) => ["nudge", "heads_up", "celebrate"].includes(a.level) && !BLOCKED.test(`${a.title} ${a.body}`))
    .slice(0, 2)
    .map((a) => ({ level: a.level as AlertRow["level"], title: clampText(a.title, 50), body: clampText(a.body, 160) }));

  const notes: Record<string, string> = {};
  for (const n of raw.metric_notes ?? []) notes[n.metric] = clampText(n.note, 60);

  const summary = BLOCKED.test(raw.report_summary ?? "") ? "" : clampText(raw.report_summary, 260);
  return { goals, insights, alerts, notes, summary };
}

// ---------- fallback goals (no AI or AI returned too few) ----------

export function starterGoals(f: Features, weekStart: string, existing: GoalRow[] = []): GoalRow[] {
  const out = [...existing];
  const has = new Set(out.map((g) => g.metric));
  const s = f.stats;
  const push = (g: Omit<GoalRow, "week_start" | "unit" | "direction">) => {
    if (out.length >= 4 || has.has(g.metric)) return;
    const rule = GOAL_RULES[g.metric];
    out.push({ ...g, week_start: weekStart, unit: rule.unit, direction: rule.direction, target: rule.round(Math.min(rule.max, Math.max(rule.min, g.target))) });
    has.add(g.metric);
  };
  const steps = s.steps.last7;
  push({
    title: "A little more walking",
    metric: "steps",
    target: steps ? steps * 1.15 : 6000,
    reason: steps ? `You've averaged ${Math.round(steps).toLocaleString("en-US")} steps a day. About 15% more is one extra short walk.` : "A gentle daily walking goal to start with.",
    reward_coins: 20,
  });
  const sleep = s.sleep_minutes.last7;
  push({
    title: "Seven hours of sleep",
    metric: "sleep_minutes",
    target: Math.max(420, sleep ?? 420),
    reason: sleep ? `You've been sleeping about ${Math.floor(sleep / 60)} h ${Math.round(sleep % 60)} min.` : "Seven hours is a solid baseline for most adults.",
    reward_coins: 25,
  });
  const feed = s.feed_minutes.last7;
  if (feed !== null && feed > 30) {
    push({
      title: "Less time in feed apps",
      metric: "feed_minutes",
      target: Math.max(30, feed * 0.8),
      reason: `Feed apps took about ${Math.round(feed)} minutes a day this week. Cutting a fifth frees up a walk.`,
      reward_coins: 25,
    });
  }
  const bed = s.bedtime.last7;
  push({
    title: "Lights out a bit earlier",
    metric: "bedtime",
    target: bed ? bed - 0.25 : 23,
    reason: bed ? `Your bedtime has averaged ${clock(bed)}. Fifteen minutes earlier is an easy first step.` : "A consistent, slightly earlier bedtime makes the rest easier.",
    reward_coins: 15,
  });
  push({ title: "Some daylight every day", metric: "daylight_minutes", target: 20, reason: "Time outside in daylight helps sleep and mood.", reward_coins: 15 });
  return out.filter((g) => measurableGoalMetrics(f).includes(g.metric) || f.daysWithAnyData < 3);
}

export { GOAL_RULES, bedtimeHours };
