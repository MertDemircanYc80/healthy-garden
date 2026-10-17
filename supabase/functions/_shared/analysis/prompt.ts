// The instructions Claude gets. Keep the rules here; numbers come only from features.ts.
import { clock, type Features } from "./features.ts";
import { reportMetricKeys } from "./report.ts";
import { measurableGoalMetrics } from "./schema.ts";

export const SYSTEM_PROMPT = `You are the coach inside Healthy Garden, an app where healthy daily habits grow a virtual garden.
You turn one person's own health data into a short, warm, specific weekly plan.

Hard rules:
- Use ONLY the numbered facts you are given. Never invent numbers, dates, apps or patterns. When you cite a number, copy it from a fact and list that fact's id in fact_ids.
- Every goal must be personal: its reason quotes the user's own numbers. Prefer small, achievable steps (about 10-20% better than their current average), not ideal targets.
- Pick goals only from the measurable metrics listed. Cover different areas (e.g. sleep, movement, screen time) rather than three versions of one.
- Patterns describe what happened together in their data. Say "on days when..." — never claim one thing causes another.
- You are not a doctor. No diagnoses, no medical or mental-health conditions, no supplements or medication advice. If sleep is consistently under 6 hours, gently suggest it may be worth talking to a professional.
- Food: never suggest eating less, calorie limits, weight loss or skipping meals. You may encourage protein, water, fruit and vegetables, regular meals.
- Tone: kind, plain, never guilt or shame. Short sentences. Second person ("you"). No emojis.
- Garden language is welcome but light (one mention at most), e.g. "your garden gets more sunlight".`;

export interface PromptContext {
  wantGoals: boolean;
  /** This week's existing goals with how many days were hit so far. */
  currentGoals: { title: string; metric: string; target: number; daysHit: number; daysSoFar: number }[];
  /** Titles of insights shown in the last 7 days — avoid repeating them. */
  recentInsightTitles: string[];
  timezone: string;
}

export function buildUserMessage(f: Features, ctx: PromptContext): string {
  const lines: string[] = [];
  lines.push(`Today is ${f.today} (${ctx.timezone}). Days with any data in the last 30: ${f.daysWithAnyData}.`);
  lines.push("");
  lines.push("Facts:");
  for (const fact of f.facts) lines.push(`${fact.id}. ${fact.text}`);
  if (!f.facts.length) lines.push("(very little data yet)");
  lines.push("");
  lines.push(`Measurable goal metrics: ${measurableGoalMetrics(f).join(", ") || "none"}.`);
  lines.push(`Report metrics needing a note: ${reportMetricKeys(f).join(", ") || "none"}.`);
  lines.push("");
  if (ctx.currentGoals.length) {
    lines.push("This week's goals so far:");
    for (const g of ctx.currentGoals) {
      const t = g.metric === "bedtime" ? clock(g.target) : g.target;
      lines.push(`- ${g.title} (${g.metric} target ${t}): hit ${g.daysHit} of ${g.daysSoFar} days`);
    }
    lines.push("");
  }
  lines.push(
    ctx.wantGoals
      ? "Write 3 or 4 new goals for this week. If a previous goal was hit most days, raise it a little; if it was hit rarely, make it easier."
      : "Goals for this week are already set: return an empty goals array.",
  );
  if (ctx.recentInsightTitles.length) lines.push(`Don't repeat these recent insights: ${ctx.recentInsightTitles.map((t) => `"${t}"`).join(", ")}.`);
  lines.push("Write 2-4 insights (at least one pattern if a fact supports it, at most one praise), 0-2 alerts for today, a report summary and the metric notes.");
  return lines.join("\n");
}
