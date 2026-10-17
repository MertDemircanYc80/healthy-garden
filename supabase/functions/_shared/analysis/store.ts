// Supabase-backed AnalysisStore. Uses the admin (secret key) client, so every query
// filters by user_id explicitly.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { AnalysisStore, StoredGoal } from "./run.ts";
import type { HealthDay } from "./types.ts";

function check<T>(r: { data: T; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
}

export function supabaseStore(db: SupabaseClient): AnalysisStore {
  return {
    async timezone(userId) {
      const r = await db.from("profiles").select("timezone").eq("id", userId).maybeSingle();
      return check(r, "load profile")?.timezone ?? "America/Los_Angeles";
    },

    async healthDays(userId, from, to) {
      const r = await db.from("health_days").select("*").eq("user_id", userId).gte("date", from).lte("date", to).order("date");
      return (check(r, "load health_days") ?? []) as HealthDay[];
    },

    async goalsForWeek(userId, weekStart) {
      const r = await db
        .from("goals")
        .select("id, week_start, title, metric, target, unit, direction, reason, reward_coins, source, status")
        .eq("user_id", userId)
        .eq("week_start", weekStart)
        .neq("status", "dropped");
      return ((check(r, "load goals") ?? []) as StoredGoal[]).map((g) => ({ ...g, target: Number(g.target) }));
    },

    async recentInsightTitles(userId, sinceDay) {
      const r = await db.from("insights").select("title").eq("user_id", userId).gte("created_at", `${sinceDay}T00:00:00Z`);
      return (check(r, "load insights") ?? []).map((x: { title: string }) => x.title);
    },

    async lastSuccessfulRun(userId) {
      const r = await db.from("ai_runs").select("created_at").eq("user_id", userId).eq("status", "ok").order("created_at", { ascending: false }).limit(1).maybeSingle();
      const row = check(r, "load ai_runs");
      return row ? new Date(row.created_at) : null;
    },

    async logRun(userId, status, days, error) {
      await db.from("ai_runs").insert({ user_id: userId, kind: "daily", status, days_used: days, error: error ?? null });
    },

    async save(userId, today, { newGoals, insights, report, alerts, model }) {
      if (newGoals.length) {
        // Replace this week's active AI goals (user-made goals are never touched).
        check(
          await db.from("goals").update({ status: "dropped" }).eq("user_id", userId).eq("week_start", newGoals[0].week_start).eq("source", "ai").eq("status", "active"),
          "retire old goals",
        );
        check(await db.from("goals").insert(newGoals.map((g) => ({ ...g, user_id: userId, source: "ai" }))), "insert goals");
      }
      if (insights.length) {
        check(await db.from("insights").insert(insights.map((i) => ({ ...i, user_id: userId, model }))), "insert insights");
      }
      check(await db.from("reports").upsert({ ...report, user_id: userId, model }, { onConflict: "user_id,period_start" }), "upsert report");
      if (alerts.length) {
        const r = await db.from("alerts").select("title").eq("user_id", userId).gte("created_at", `${today}T00:00:00Z`);
        const seen = new Set((check(r, "load alerts") ?? []).map((a: { title: string }) => a.title));
        const fresh = alerts.filter((a) => !seen.has(a.title));
        if (fresh.length) check(await db.from("alerts").insert(fresh.map((a) => ({ ...a, user_id: userId }))), "insert alerts");
      }
    },
  };
}
