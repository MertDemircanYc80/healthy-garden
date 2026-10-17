// Edge Function "analyze": turns a user's recent health_days into personal goals, coach
// insights, a weekly report and alerts (Claude), and stores them for the app to read.
//
// Two ways to call it:
//  1. From the app, as the signed-in user:
//       POST /functions/v1/analyze   Authorization: Bearer <user access token>   body: {"force": false}
//  2. From the nightly / Monday schedule (pg_cron + pg_net):
//       POST /functions/v1/analyze   x-cron-secret: <CRON_SECRET>   body: {"weekly": true|false}
//
// Secrets (supabase secrets set ...): ANTHROPIC_API_KEY (optional — without it the function
// returns a deterministic starter plan), CRON_SECRET, optional ANALYZE_MODEL.
// Deploy with --no-verify-jwt (this function verifies user tokens itself so cron can call it).
import { createClient } from "npm:@supabase/supabase-js@2";
import { claudeClient, DEFAULT_MODEL } from "../_shared/analysis/claude.ts";
import { runAnalysis } from "../_shared/analysis/run.ts";
import { supabaseStore } from "../_shared/analysis/store.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

function secretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      if (keys.default) return keys.default;
      const first = Object.values(keys)[0];
      if (first) return first;
    } catch {
      /* fall through to legacy */
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("No Supabase secret key available to the function");
  return legacy;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const store = supabaseStore(admin);
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const llm = apiKey ? claudeClient(apiKey, Deno.env.get("ANALYZE_MODEL") || DEFAULT_MODEL) : null;
  const body = await req.json().catch(() => ({}));

  // ---- scheduled run for every recently active user ----
  const cronSecret = Deno.env.get("CRON_SECRET");
  const givenCron = req.headers.get("x-cron-secret");
  if (givenCron !== null) {
    if (!cronSecret || !timingSafeEqual(givenCron, cronSecret)) return json({ error: "Not allowed" }, 401);
    const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const { data, error } = await admin.from("health_days").select("user_id").gte("updated_at", since).limit(5000);
    if (error) return json({ error: error.message }, 500);
    const users = [...new Set((data ?? []).map((r: { user_id: string }) => r.user_id))].slice(0, 300);
    const counts: Record<string, number> = {};
    // a few at a time to stay inside rate limits
    for (let i = 0; i < users.length; i += 3) {
      const batch = await Promise.all(users.slice(i, i + 3).map((userId) => runAnalysis({ userId, store, llm, weekly: !!body.weekly, freshForHours: 12 })));
      for (const r of batch) counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return json({ users: users.length, ...counts });
  }

  // ---- the signed-in user asks for their own analysis ----
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in first" }, 401);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth?.user) return json({ error: "Session expired. Restart the app." }, 401);

  const result = await runAnalysis({ userId: auth.user.id, store, llm, force: !!body.force });
  if (result.status === "error") {
    console.error("analyze failed", auth.user.id, result.error);
    return json({ status: "error", error: "Your coach couldn't finish right now. Try again in a few minutes." }, 502);
  }
  return json({ status: result.status });
});
