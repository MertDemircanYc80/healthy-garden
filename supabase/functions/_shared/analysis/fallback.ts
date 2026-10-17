// Rule-based coach for when no Anthropic API key is configured (or Claude is down).
// Uses only the computed signals, so every number it shows is real.
import { clock, fmt, LABEL, HIGHER_IS_BETTER, type Features, type MetricKey } from "./features.ts";
import type { AlertRow, InsightRow } from "./types.ts";

const hm = (min: number) => fmt("sleep_minutes", min);

export function ruleBasedCoach(f: Features): { insights: InsightRow[]; alerts: AlertRow[]; summary: string } {
  const s = f.signals;
  const candidates: InsightRow[] = [];

  if (s.lateSleep) {
    candidates.push({
      kind: "pattern",
      title: "Late nights cost you sleep",
      body: `After bedtimes past 11:30 pm you slept ${hm(s.lateSleep.lateAvg)} on average, versus ${hm(s.lateSleep.earlyAvg)} after earlier nights.`,
      evidence: `${s.lateSleep.lateNights} late nights in the last 30 days`,
      action: "Put your phone on the charger outside your bedroom by 11 pm tonight.",
      metric: "bedtime",
    });
  }
  if (s.feedBedtime && s.feedBedtime.heavyBed > s.feedBedtime.lightBed) {
    const top = s.topApps?.[0]?.app;
    candidates.push({
      kind: "pattern",
      title: "Heavy scrolling days end later",
      body: `On days with more than ${s.feedBedtime.threshold} minutes in feed apps, you went to bed around ${clock(s.feedBedtime.heavyBed)}, versus ${clock(s.feedBedtime.lightBed)} on lighter days.`,
      evidence: s.topApps ? `Last 7 days: ${s.topApps.map((a) => `${a.app} ${a.minutes} min`).join(", ")}` : null,
      action: top ? `Set a 9 pm app limit for ${top} in Screen Time.` : "Set a 9 pm limit for your feed apps in Screen Time.",
      metric: "feed_minutes",
    });
  }
  if (s.lateSteps && !s.lateSleep) {
    candidates.push({
      kind: "pattern",
      title: "Late nights, slower days",
      body: `The day after a late night you walked ${fmt("steps", s.lateSteps.lateAvg)}, versus ${fmt("steps", s.lateSteps.earlyAvg)} after earlier nights.`,
      evidence: null,
      action: "Aim for lights out before 11:30 pm tonight.",
      metric: "steps",
    });
  }
  if (s.weekend && s.weekend.weekendAvg < s.weekend.weekdayAvg) {
    candidates.push({
      kind: "suggestion",
      title: "Give your weekend a walk",
      body: `Weekends average ${fmt("steps", s.weekend.weekendAvg)}, versus ${fmt("steps", s.weekend.weekdayAvg)} on weekdays.`,
      evidence: "Last 30 days",
      action: "Plan one walk or run for Saturday morning.",
      metric: "steps",
    });
  }
  if (s.shortDrives) {
    candidates.push({
      kind: "suggestion",
      title: "Swap a short drive for a walk",
      body: `On ${s.shortDrives.days} of the last 7 days you drove 15 minutes or less in total. Some of those trips could be a walk.`,
      evidence: `${s.shortDrives.days} short-drive days this week`,
      action: "Walk your next short trip and water your garden with the steps.",
      metric: "driving_minutes",
    });
  }
  if (s.runProtein && s.runProtein.runAvg < s.runProtein.otherAvg - 10) {
    candidates.push({
      kind: "suggestion",
      title: "More protein on run days",
      body: `On running days you logged about ${Math.round(s.runProtein.runAvg)} g of protein, versus ${Math.round(s.runProtein.otherAvg)} g on other days.`,
      evidence: "From meals logged in Apple Health",
      action: "Add eggs, yogurt or beans to the meal after your next run.",
      metric: "protein_g",
    });
  }

  // One piece of praise: the metric that improved most in the right direction.
  const keys: MetricKey[] = ["sleep_minutes", "steps", "active_minutes", "daylight_minutes", "feed_minutes"];
  const best = keys
    .map((k) => ({ k, c: f.stats[k].changePct }))
    .filter((x): x is { k: MetricKey; c: number } => x.c !== null && (HIGHER_IS_BETTER[x.k] ? x.c >= 8 : x.c <= -8))
    .sort((a, b) => Math.abs(b.c) - Math.abs(a.c))[0];
  const praise: InsightRow | null = best
    ? {
        kind: "praise",
        title: `${LABEL[best.k]} ${HIGHER_IS_BETTER[best.k] ? "up" : "down"} ${Math.abs(best.c)}%`,
        body: `Compared with the week before, your ${LABEL[best.k].toLowerCase()} moved the right way. Your garden is getting more sunlight for it.`,
        evidence: "This week vs last week",
        action: null,
        metric: best.k,
      }
    : null;

  const insights = [...candidates.slice(0, praise ? 3 : 4), ...(praise ? [praise] : [])];

  const alerts: AlertRow[] = [];
  if (s.lateSleep) alerts.push({ level: "heads_up", title: "Wind-down tonight", body: "Lights out before 11:30 pm keeps tomorrow's sleep goal in reach." });
  if (praise) alerts.push({ level: "celebrate", title: praise.title, body: "Nice work this week." });

  const sleep = f.stats.sleep_minutes.last7;
  const steps = f.stats.steps.last7;
  const parts: string[] = [];
  if (sleep !== null && steps !== null) parts.push(`This week you averaged ${hm(sleep)} of sleep and ${fmt("steps", steps)} a day.`);
  if (s.lateSleep) parts.push("Late nights are the habit pulling your sleep down the most.");
  else if (praise) parts.push(`${praise.title} from last week.`);
  const summary = parts.join(" ") || "Here's your week at a glance.";

  return { insights, alerts: alerts.slice(0, 2), summary };
}
