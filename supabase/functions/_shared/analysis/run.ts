// One analysis run for one user. Storage and the LLM are injected so this is testable
// without Supabase or an API key.
import type { LlmCall } from "./claude.ts";
import { addDays, computeFeatures, value, weekStart, type MetricKey } from "./features.ts";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";
import { ruleBasedCoach } from "./fallback.ts";
import { reportMetrics, reportPeriod, weeklyScore } from "./report.ts";
import { sanitize, starterGoals } from "./schema.ts";
import type { AlertRow, AnalysisResult, GoalRow, HealthDay, InsightRow, ReportRow } from "./types.ts";

export interface StoredGoal extends GoalRow {
  id: string;
  source: "ai" | "user";
  status: string;
}

export interface AnalysisStore {
  timezone(userId: string): Promise<string>;
  healthDays(userId: string, from: string, to: string): Promise<HealthDay[]>;
  goalsForWeek(userId: string, weekStart: string): Promise<StoredGoal[]>;
  recentInsightTitles(userId: string, sinceDay: string): Promise<string[]>;
  lastSuccessfulRun(userId: string): Promise<Date | null>;
  logRun(userId: string, status: "ok" | "error", days: number, error?: string): Promise<void>;
  save(userId: string, today: string, r: { newGoals: GoalRow[]; insights: InsightRow[]; report: ReportRow; alerts: AlertRow[]; model: string | null }): Promise<void>;
}

export function localToday(timezone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function goalDaysHit(goal: GoalRow, days: HealthDay[], from: string, to: string) {
  let hit = 0;
  let total = 0;
  for (const d of days) {
    if (d.date < from || d.date > to) continue;
    const v = value(d, goal.metric as MetricKey);
    if (v === null) continue;
    total++;
    if (goal.direction === "at_least" ? v >= goal.target : v <= goal.target) hit++;
  }
  return { hit, total };
}

export type RunStatus = "analyzed" | "fresh" | "starter" | "error";

export async function runAnalysis(opts: {
  userId: string;
  store: AnalysisStore;
  llm: LlmCall | null; // null → no API key configured: deterministic output only
  force?: boolean;
  weekly?: boolean; // Monday cron: always write new goals
  now?: Date;
  freshForHours?: number;
}): Promise<{ status: RunStatus; result?: AnalysisResult; error?: string }> {
  const { userId, store } = opts;
  const now = opts.now ?? new Date();

  const last = await store.lastSuccessfulRun(userId);
  const ageMin = last ? (now.getTime() - last.getTime()) / 60000 : Infinity;
  if (ageMin < 10 || (!opts.force && ageMin < (opts.freshForHours ?? 6) * 60)) return { status: "fresh" };

  const tz = await store.timezone(userId);
  const today = localToday(tz, now);
  const ws = weekStart(today);
  const days = await store.healthDays(userId, addDays(today, -34), today);
  const f = computeFeatures(days, today);

  const existing = await store.goalsForWeek(userId, ws);
  const activeAi = existing.filter((g) => g.source === "ai" && g.status === "active");
  const wantGoals = opts.weekly || activeAi.length === 0;
  const yesterday = addDays(today, -1);
  const currentGoals = existing.map((g) => {
    const { hit, total } = goalDaysHit(g, days, ws, yesterday);
    return { title: g.title, metric: g.metric, target: g.target, daysHit: hit, daysSoFar: total };
  });
  const { score, change } = weeklyScore(f);
  const goalTargets = Object.fromEntries(existing.map((g) => [g.metric, g.target]));

  try {
    // Not enough data, or no API key: deterministic plan with no AI cost.
    if (f.daysWithAnyData < 3 || !opts.llm) {
      const goals = wantGoals ? starterGoals(f, ws) : [];
      const coach =
        f.daysWithAnyData < 3
          ? {
              summary: "Your garden is just getting started. After a few days of data your coach will have personal suggestions.",
              insights: [{ kind: "suggestion", title: "Give your coach a few days", body: "Keep your phone with you and wear your watch if you have one. Personal suggestions start after about three days.", evidence: null, action: null, metric: null }] as InsightRow[],
              alerts: [] as AlertRow[],
            }
          : ruleBasedCoach(f);
      const report: ReportRow = {
        ...reportPeriod(today),
        score,
        score_change: change,
        summary: coach.summary,
        metrics: reportMetrics(f, {}, { ...goalTargets, ...Object.fromEntries(goals.map((g) => [g.metric, g.target])) }),
      };
      await store.save(userId, today, { newGoals: goals, insights: coach.insights, report, alerts: coach.alerts, model: null });
      await store.logRun(userId, "ok", f.daysWithAnyData);
      return { status: "starter", result: { goals, insights: coach.insights, report, alerts: coach.alerts } };
    }

    const ctx = { wantGoals, currentGoals, recentInsightTitles: await store.recentInsightTitles(userId, addDays(today, -7)), timezone: tz };
    const { output, model } = await opts.llm(SYSTEM_PROMPT, buildUserMessage(f, ctx));
    const clean = sanitize(output, f, { wantGoals, weekStart: ws });

    let goals = clean.goals;
    if (wantGoals && goals.length < 3) goals = starterGoals(f, ws, goals);

    const report: ReportRow = {
      ...reportPeriod(today),
      score,
      score_change: change,
      summary: clean.summary || "Here's your week at a glance.",
      metrics: reportMetrics(f, clean.notes, { ...goalTargets, ...Object.fromEntries(goals.map((g) => [g.metric, g.target])) }),
    };
    await store.save(userId, today, { newGoals: goals, insights: clean.insights, report, alerts: clean.alerts, model });
    await store.logRun(userId, "ok", f.daysWithAnyData);
    return { status: "analyzed", result: { goals, insights: clean.insights, report, alerts: clean.alerts } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await store.logRun(userId, "error", f.daysWithAnyData, msg).catch(() => {});
    return { status: "error", error: msg };
  }
}
