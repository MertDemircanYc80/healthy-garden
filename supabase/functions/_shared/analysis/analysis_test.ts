// Run: deno test supabase/functions/_shared/analysis/
import { deepStrictEqual as assertEquals, ok as assert } from "node:assert/strict";
import { addDays, bedtimeHours, computeFeatures, weekStart } from "./features.ts";
import { buildUserMessage } from "./prompt.ts";
import { weeklyScore } from "./report.ts";
import { OUTPUT_SCHEMA, sanitize, type RawOutput } from "./schema.ts";
import { goalDaysHit, localToday, runAnalysis, type AnalysisStore, type StoredGoal } from "./run.ts";
import type { HealthDay } from "./types.ts";

const TODAY = "2026-10-16"; // a Friday

/** 30 days where late nights (past 11:30) come with less sleep and fewer steps. */
function dataset(): HealthDay[] {
  const days: HealthDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = addDays(TODAY, -i);
    const late = i % 3 === 0;
    const weekend = [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
    days.push({
      date,
      steps: (late ? 4200 : 7400) - (weekend ? 1500 : 0) + (i % 5) * 100,
      walking_running_km: 4.2,
      active_energy_kcal: 380,
      active_minutes: late ? 15 : 35,
      running_minutes: i % 7 === 2 ? 25 : 0,
      workout_minutes: i % 7 === 2 ? 30 : 0,
      sleep_minutes: late ? 365 : 445,
      bedtime: late ? "00:10" : "23:05",
      wake_time: "07:00",
      daylight_minutes: late ? 8 : 28,
      screen_minutes: 260,
      feed_minutes: late ? 120 : 55,
      long_sessions: late ? 3 : 1,
      driving_minutes: i % 4 === 0 ? 10 : 30,
      app_usage: { Instagram: late ? 80 : 35, TikTok: late ? 40 : 20 },
      nutrition: { energyKcal: 2000, proteinG: i % 7 === 2 ? 55 : 80, waterMl: 1500 },
    });
  }
  return days;
}

Deno.test("dates: week start, bedtime after midnight, local today", () => {
  assertEquals(weekStart("2026-10-16"), "2026-10-12");
  assertEquals(weekStart("2026-10-12"), "2026-10-12");
  assertEquals(bedtimeHours("00:30"), 24.5);
  assertEquals(bedtimeHours("23:15:00"), 23.25);
  assertEquals(localToday("America/Los_Angeles", new Date("2026-10-17T05:00:00Z")), "2026-10-16");
});

Deno.test("features find the real patterns and only those", () => {
  const f = computeFeatures(dataset(), TODAY);
  const text = f.facts.map((x) => x.text).join("\n");
  assert(f.facts.length >= 8, `facts: ${f.facts.length}`);
  assert(/After bedtimes past 11:30 pm .* sleep averaged 6 h 5 min/.test(text), text);
  assert(/The day after a bedtime past 11:30 pm, steps averaged/.test(text), text);
  assert(/Weekend steps average/.test(text), text);
  assert(/Feed app time in the last 7 days by app: Instagram/.test(text), text);
  assert(/On running days logged protein averaged 55 g/.test(text), text);
  const { score } = weeklyScore(f);
  assert(score > 40 && score < 100, `score ${score}`);
});

Deno.test("prompt lists facts, measurable metrics and the goal instruction", () => {
  const f = computeFeatures(dataset(), TODAY);
  const msg = buildUserMessage(f, { wantGoals: true, currentGoals: [], recentInsightTitles: ["Old one"], timezone: "America/Los_Angeles" });
  assert(msg.includes("F1. "));
  assert(msg.includes("Measurable goal metrics: steps, sleep_minutes, bedtime"));
  assert(msg.includes("Write 3 or 4 new goals"));
  assert(msg.includes('"Old one"'));
});

Deno.test("schema obeys Structured Outputs limits", () => {
  const s = JSON.stringify(OUTPUT_SCHEMA);
  for (const banned of ["minimum", "maximum", "minLength", "maxLength", "maxItems", "multipleOf"]) assert(!s.includes(`"${banned}"`), banned);
  const walk = (o: unknown): void => {
    if (o && typeof o === "object") {
      const r = o as Record<string, unknown>;
      if (r.type === "object") assertEquals(r.additionalProperties, false);
      Object.values(r).forEach(walk);
    }
  };
  walk(OUTPUT_SCHEMA);
});

const goodOutput = (f: ReturnType<typeof computeFeatures>): RawOutput => ({
  report_summary: "Steadier week. Late nights are still pulling your sleep down.",
  metric_notes: [{ metric: "sleep_minutes", note: "Best after early nights" }],
  goals: [
    { title: "Phone down by 11:15 pm", metric: "bedtime", target: 23.25, reason: "After late nights you slept 6 h 5 min.", reward_coins: 25, fact_ids: ["F3"] },
    { title: "7,500 steps", metric: "steps", target: 7430, reason: "You average about 6,000.", reward_coins: 20, fact_ids: [] },
    { title: "Sleep 7.5 hours", metric: "sleep_minutes", target: 7.5, reason: "Model answered in hours.", reward_coins: 99, fact_ids: [] },
    { title: "Steps again", metric: "steps", target: 9000, reason: "duplicate metric", reward_coins: 20, fact_ids: [] },
    { title: "Eat less at night", metric: "protein_g", target: 100, reason: "lose weight", reward_coins: 20, fact_ids: [] },
    { title: "Ghost metric", metric: "heart_rate", target: 60, reason: "not allowed", reward_coins: 20, fact_ids: [] },
  ],
  insights: [
    { kind: "pattern", title: "Late scroll, short sleep", body: "On days...", evidence: "10 late nights", action: "Charge your phone outside the bedroom.", metric: "bedtime", fact_ids: [f.facts[0].id] },
    { kind: "pattern", title: "Invented pattern", body: "Made up", evidence: "none", action: null, metric: null, fact_ids: ["F999"] },
    { kind: "praise", title: "Nice mornings", body: "Steady wake time.", evidence: "7 of 7 days", action: "should be dropped for praise", metric: null, fact_ids: [] },
    { kind: "suggestion", title: "You may have insomnia", body: "Talk to someone", evidence: "x", action: null, metric: null, fact_ids: [] },
  ],
  alerts: [
    { level: "celebrate", title: "3 early nights", body: "Nice." },
    { level: "nudge", title: "One more", body: "ok" },
    { level: "nudge", title: "Too many", body: "dropped" },
  ],
});

Deno.test("sanitizer enforces rules the schema can't", () => {
  const f = computeFeatures(dataset(), TODAY);
  const c = sanitize(goodOutput(f), f, { wantGoals: true, weekStart: "2026-10-12" });
  assertEquals(c.goals.map((g) => g.metric), ["bedtime", "steps", "sleep_minutes"]);
  assertEquals(c.goals[0].target, 23.25);
  assertEquals(c.goals[0].direction, "at_most");
  assertEquals(c.goals[1].target, 7500); // rounded to 250
  assertEquals(c.goals[2].target, 450); // 7.5 h → minutes
  assertEquals(c.goals[2].reward_coins, 30); // clamped
  assertEquals(c.insights.map((i) => i.title), ["Late scroll, short sleep", "Nice mornings"]);
  assertEquals(c.insights[1].action, null);
  assertEquals(c.alerts.length, 2);
  assertEquals(c.notes.sleep_minutes, "Best after early nights");
});

Deno.test("goal days hit counts at_most and at_least correctly", () => {
  const days = dataset();
  const bed = goalDaysHit({ week_start: "", title: "", metric: "bedtime", target: 23.25, unit: "", direction: "at_most", reason: "", reward_coins: 0 }, days, "2026-10-12", "2026-10-15");
  assertEquals(bed.total, 4);
  assertEquals(bed.hit, 4 - days.filter((d) => d.date >= "2026-10-12" && d.date <= "2026-10-15" && d.bedtime === "00:10").length);
});

function memoryStore(days: HealthDay[], goals: StoredGoal[] = [], lastRun: Date | null = null) {
  const saved: Parameters<AnalysisStore["save"]>[2][] = [];
  const runs: string[] = [];
  const store: AnalysisStore = {
    timezone: () => Promise.resolve("America/Los_Angeles"),
    healthDays: (_u, from, to) => Promise.resolve(days.filter((d) => d.date >= from && d.date <= to)),
    goalsForWeek: () => Promise.resolve(goals),
    recentInsightTitles: () => Promise.resolve([]),
    lastSuccessfulRun: () => Promise.resolve(lastRun),
    logRun: (_u, status) => {
      runs.push(status);
      return Promise.resolve();
    },
    save: (_u, _t, r) => {
      saved.push(r);
      return Promise.resolve();
    },
  };
  return { store, saved, runs };
}

const NOW = new Date("2026-10-16T19:00:00Z"); // noon in California

Deno.test("full run with Claude: goals, insights, report saved", async () => {
  const days = dataset();
  const { store, saved, runs } = memoryStore(days);
  let prompt = "";
  const llm = (_s: string, u: string) => {
    prompt = u;
    return Promise.resolve({ output: goodOutput(computeFeatures(days, TODAY)), model: "claude-sonnet-5-5" });
  };
  const r = await runAnalysis({ userId: "u1", store, llm, now: NOW });
  assertEquals(r.status, "analyzed");
  assertEquals(runs, ["ok"]);
  assertEquals(saved[0].newGoals.length, 3);
  assertEquals(saved[0].report.period_start, "2026-10-10");
  assert(saved[0].report.metrics.length >= 4);
  assertEquals(saved[0].report.metrics[0].metric, "sleep_minutes");
  assertEquals(saved[0].report.metrics[0].week.length, 7);
  assert(prompt.includes("Today is 2026-10-16"));
});

Deno.test("goals stay put mid-week; recent run is not repeated", async () => {
  const days = dataset();
  const existing: StoredGoal[] = [{ id: "g", source: "ai", status: "active", week_start: "2026-10-12", title: "Steps", metric: "steps", target: 7000, unit: "steps", direction: "at_least", reason: "r", reward_coins: 20 }];
  const { store, saved } = memoryStore(days, existing);
  let asked = "";
  const llm = (_s: string, u: string) => {
    asked = u;
    return Promise.resolve({ output: { ...goodOutput(computeFeatures(days, TODAY)), goals: [] }, model: "m" });
  };
  await runAnalysis({ userId: "u1", store, llm, now: NOW });
  assert(asked.includes("Goals for this week are already set"));
  assert(asked.includes("Steps (steps target 7000): hit"));
  assertEquals(saved[0].newGoals.length, 0);

  const fresh = memoryStore(days, [], new Date(NOW.getTime() - 60 * 60 * 1000));
  assertEquals((await runAnalysis({ userId: "u1", store: fresh.store, llm, now: NOW })).status, "fresh");
  const tooSoon = memoryStore(days, [], new Date(NOW.getTime() - 5 * 60 * 1000));
  assertEquals((await runAnalysis({ userId: "u1", store: tooSoon.store, llm, now: NOW, force: true })).status, "fresh");
});

Deno.test("no API key or little data: starter plan without calling Claude", async () => {
  const { store, saved } = memoryStore(dataset().slice(-2));
  const r = await runAnalysis({ userId: "u1", store, llm: null, now: NOW });
  assertEquals(r.status, "starter");
  assert(saved[0].newGoals.length >= 2, `${saved[0].newGoals.length}`);
  assertEquals(saved[0].insights[0].title, "Give your coach a few days");

  const noKey = memoryStore(dataset());
  const r2 = await runAnalysis({ userId: "u1", store: noKey.store, llm: null, now: NOW });
  assertEquals(r2.status, "starter");
  assertEquals(noKey.saved[0].newGoals.length, 3);
});

Deno.test("Claude failure is logged, nothing saved", async () => {
  const { store, saved, runs } = memoryStore(dataset());
  const r = await runAnalysis({ userId: "u1", store, llm: () => Promise.reject(new Error("Claude API 401: bad key")), now: NOW });
  assertEquals(r.status, "error");
  assertEquals(saved.length, 0);
  assertEquals(runs, ["error"]);
});
