// Builds "today" for a user: summary + evaluated tasks + sunlight.
// Used by GET /api/tasks/today and by server-rendered screens.
// STATUS: reads the mock adapter. Backend lead: switch to Supabase daily_summaries.
import { connection } from "next/server";
import { getAdapter } from "@/adapters";
import { isoDate } from "@/adapters/mock";
import { evaluateTasks, sunlightFor } from "./tasks";

export async function getToday(userId: string, source = "mock") {
  await connection(); // "today" depends on the request time — never prerender it
  const adapter = getAdapter(source);
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const days = await adapter.getSummaries(userId, isoDate(weekAgo), isoDate(today));
  const summary = days[days.length - 1];
  const previous = days.slice(0, -1);
  const baseline = previous.length
    ? previous.reduce((s, d) => s + d.scrollMinutes, 0) / previous.length
    : null;

  const tasks = evaluateTasks(summary, {
    scrollBaselineMinutes: baseline,
    bedtimeTarget: "23:00", // TODO: from users.bedtime_target
    offlineHours: 1, // TODO: from extension / manual input
  });

  return { date: summary.date, summary, tasks, sunlight: sunlightFor(tasks) };
}
