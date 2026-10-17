// Demo mode: a sample persona's 37 days of health data + what the coach wrote for them.
// "Next day" steps through the future days so a demo video can show goals being hit,
// coins arriving and plants growing. Pure logic (no React) — tested by scripts/check-demo.ts.
import coach from "@/data/demo-coach.json";
import health from "@/data/demo-health.json";
import type { HealthDayRow } from "@/lib/health/types";
import { onTrack } from "@/lib/format";
import type { Alert, Goal, Insight, Metric, Plant, Report, ReportMetric, Stage } from "@/types";

export type DemoDay = HealthDayRow & { offset: number };

export const DEMO_DAYS = health.days as DemoDay[];
export const DEMO_TODAY: string = health.today;
export const MAX_OFFSET = Math.max(...DEMO_DAYS.map((d) => d.offset));
export const COACH_SOURCE: string = coach.generatedWith;

export function dayAt(offset: number): DemoDay | undefined {
  return DEMO_DAYS.find((d) => d.offset === offset);
}

export function dateLabel(offset: number): string {
  const d = dayAt(offset);
  if (!d) return "";
  return new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "23:40" → 23.67 ; "00:10" → 24.17 (after midnight counts as late). */
export function bedtimeHours(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const v = h + m / 60;
  return v < 12 ? v + 24 : v;
}

export function metricValue(day: DemoDay | undefined, metric: Metric): number | null {
  if (!day) return null;
  switch (metric) {
    case "bedtime":
      return bedtimeHours(day.bedtime);
    case "water_ml":
      return day.nutrition?.waterMl ?? null;
    case "protein_g":
      return day.nutrition?.proteinG ?? null;
    default: {
      const v = day[metric as keyof HealthDayRow];
      return typeof v === "number" ? v : null;
    }
  }
}

/** Monday of the week containing the given offset, as an offset. */
function weekStartOffset(offset: number): number {
  const d = dayAt(offset);
  if (!d) return offset;
  const dow = (new Date(`${d.date}T12:00:00`).getDay() + 6) % 7; // Mon = 0
  return offset - dow;
}

/** The coach's goals evaluated on a given day (current value, days hit so far this week). */
export function goalsAt(offset: number): Goal[] {
  const ws = weekStartOffset(offset);
  return coach.goals.map((g, i) => {
    const base: Goal = {
      id: `g${i + 1}`,
      title: g.title,
      metric: g.metric as Metric,
      target: g.target,
      unit: g.unit,
      direction: g.direction as Goal["direction"],
      current: metricValue(dayAt(offset), g.metric as Metric) ?? 0,
      reason: g.reason,
      reward: g.reward_coins,
      daysHit: 0,
      daysTotal: 7,
    };
    for (let o = ws; o < offset; o++) {
      const v = metricValue(dayAt(o), base.metric);
      if (v !== null && onTrack({ ...base, current: v })) base.daysHit++;
    }
    return base;
  });
}

export function coachInsights(): Insight[] {
  return coach.insights.map((x, i) => ({
    id: `i${i + 1}`,
    kind: x.kind as Insight["kind"],
    title: x.title,
    body: x.body,
    evidence: x.evidence ?? undefined,
    action: x.action ?? undefined,
  }));
}

export function coachReport(): Report {
  const r = coach.report;
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    periodLabel: `${fmt(r.period_start)} – ${fmt(r.period_end)}`,
    score: r.score,
    scoreChange: r.score_change,
    summary: r.summary,
    metrics: r.metrics as ReportMetric[],
  };
}

export function coachAlerts(): Alert[] {
  return coach.alerts.map((a, i) => ({ id: `ca${i + 1}`, level: a.level as Alert["level"], title: a.title, body: a.body, time: "This morning", read: false }));
}

// ---------- Next day ----------

const STAGES: Stage[] = ["seed", "sprout", "young", "mature", "blooming"];
const NAMES: Record<Plant["species"], string> = {
  daisy: "daisies",
  marigold: "marigolds",
  lavender: "lavender",
  tulip: "tulips",
  sunflower: "sunflowers",
  rose: "roses",
  fruit_tree: "apple tree",
  cherry_tree: "cherry blossom",
  oak: "oak",
};

export interface DemoState {
  offset: number;
  coins: number;
  streak: number;
  plants: Plant[];
  alerts: Alert[];
}

/**
 * Finish the current day: pay coins for goals hit, grow watered plants by the day's sunlight,
 * rest the unwatered ones (never die), and move to the next day.
 */
export function nextDay(s: DemoState): DemoState {
  if (s.offset >= MAX_OFFSET) return s;
  const goals = goalsAt(s.offset);
  const hit = goals.filter(onTrack);
  const earned = hit.reduce((sum, g) => sum + g.reward, 0);
  const sunlight = goals.length ? hit.length / goals.length : 0;

  const grown: string[] = [];
  const plants = s.plants.map((p) => {
    if (!p.wateredToday) return { ...p, resting: true };
    if (p.stage === "blooming") return { ...p, wateredToday: false, resting: false };
    let growth = p.growth + 0.35 + 0.65 * sunlight;
    let stage: Stage = p.stage;
    if (growth >= 1) {
      stage = STAGES[Math.min(STAGES.length - 1, STAGES.indexOf(p.stage) + 1)];
      growth = stage === "blooming" ? 1 : growth - 1;
      grown.push(NAMES[p.species]);
    }
    return { ...p, stage, growth, wateredToday: false, resting: false };
  });

  const nextOffset = s.offset + 1;
  const time = `${dateLabel(nextOffset)}, 7:30 am`;
  const news: Alert[] = [
    {
      id: `d${nextOffset}a`,
      level: hit.length >= goals.length / 2 ? "celebrate" : "heads_up",
      title: `Yesterday: ${hit.length} of ${goals.length} goals`,
      body: earned ? `+${earned} coins. ${hit.map((g) => g.title).join(", ")}.` : "A quieter day. Today is a fresh start.",
      time,
      read: false,
    },
  ];
  if (grown.length) {
    news.push({ id: `d${nextOffset}b`, level: "celebrate", title: "Your garden grew", body: `Your ${[...new Set(grown)].slice(0, 3).join(", ")} grew overnight.`, time, read: false });
  }
  const resting = plants.filter((p) => p.resting).length;
  if (resting) {
    news.push({ id: `d${nextOffset}c`, level: "nudge", title: `${resting} plant${resting > 1 ? "s are" : " is"} resting`, body: "Water them today and they wake right up.", time, read: false });
  }

  return {
    offset: nextOffset,
    coins: s.coins + earned,
    streak: hit.length >= 2 ? s.streak + 1 : 0,
    plants,
    alerts: [...news, ...s.alerts.map((a) => ({ ...a, read: true }))].slice(0, 12),
  };
}
