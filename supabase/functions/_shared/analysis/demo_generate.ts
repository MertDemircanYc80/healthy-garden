// Runs the real coach pipeline on the demo persona and saves what it wrote for the app's demo mode.
//
//   cd supabase/functions
//   ANTHROPIC_API_KEY=sk-ant-... deno run --allow-read --allow-write --allow-env --allow-net _shared/analysis/demo_generate.ts
//
// Without ANTHROPIC_API_KEY it writes the deterministic starter plan (no AI) so the app still works.
// The key is read from the environment only — never pass it as an argument or commit it.
import { claudeClient, DEFAULT_MODEL } from "./claude.ts";
import { runAnalysis, type AnalysisStore } from "./run.ts";
import type { AlertRow, GoalRow, HealthDay, InsightRow, ReportRow } from "./types.ts";

const DATA = new URL("../../../../mobile/src/data/demo-health.json", import.meta.url);
const OUT = new URL("../../../../mobile/src/data/demo-coach.json", import.meta.url);

const { today, days } = JSON.parse(await Deno.readTextFile(DATA)) as { today: string; days: (HealthDay & { offset: number })[] };
const past = days.filter((d) => d.offset <= 0);

let saved: { newGoals: GoalRow[]; insights: InsightRow[]; report: ReportRow; alerts: AlertRow[]; model: string | null } | null = null;
const store: AnalysisStore = {
  timezone: () => Promise.resolve("America/Los_Angeles"),
  healthDays: (_u, from, to) => Promise.resolve(past.filter((d) => d.date >= from && d.date <= to)),
  goalsForWeek: () => Promise.resolve([]),
  recentInsightTitles: () => Promise.resolve([]),
  lastSuccessfulRun: () => Promise.resolve(null),
  logRun: (_u, status, _d, error) => {
    if (status === "error") console.error("analysis error:", error);
    return Promise.resolve();
  },
  save: (_u, _t, r) => {
    saved = r;
    return Promise.resolve();
  },
};

const key = Deno.env.get("ANTHROPIC_API_KEY");
const model = Deno.env.get("ANALYZE_MODEL") || DEFAULT_MODEL;
const result = await runAnalysis({
  userId: "demo",
  store,
  llm: key ? claudeClient(key, model) : null,
  weekly: true,
  now: new Date(`${today}T19:00:00Z`), // noon in California on the demo day
});

if (result.status === "error" || !saved) {
  console.error(`Failed: ${result.error ?? result.status}`);
  Deno.exit(1);
}
const out = {
  today,
  generatedWith: saved!.model ? `Claude (${saved!.model})` : "rule-based coach (no AI key yet)",
  goals: saved!.newGoals,
  insights: saved!.insights,
  report: saved!.report,
  alerts: saved!.alerts,
};
await Deno.writeTextFile(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote demo-coach.json — ${out.goals.length} goals, ${out.insights.length} insights, ${out.alerts.length} alerts, via ${out.generatedWith}`);
