// Read-only readiness check. Never creates an account or writes health data.
import { loadEnvFile } from "node:process";
import { createSupabaseClient } from "../src/lib/supabase-client.ts";
try { loadEnvFile(new URL("../.env.local", import.meta.url)); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const client = createSupabaseClient({
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) },
});
if (!client) throw new Error("Set the public Supabase values in mobile/.env.local.");
const url = process.env.EXPO_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, "");
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim();
const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(15_000) });
if (!settings.ok) throw new Error(`Supabase connection failed (${settings.status}).`);
console.log("✓ Supabase URL and publishable key reach the Auth API");
const config = await settings.json();
let ready = true;
if (!config.external?.anonymous_users) { ready = false; console.error("Setup needed: enable Anonymous Sign-Ins in Supabase Authentication."); }
const { error } = await client.from("health_days").select("date").limit(0);
if (error?.code === "PGRST205") { ready = false; console.error("Setup needed: apply the app schema and health access/privacy migrations."); }
else if (error?.code === "42501") console.log("✓ Signed-out access to health_days is denied");
else if (error) { ready = false; console.error(`Database check failed (${error.code}).`); }
else { ready = false; console.error("Security check failed: signed-out client can query health_days."); }
process.exitCode = ready ? 0 : 1;
