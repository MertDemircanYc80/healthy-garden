// Read-only readiness check. Never creates an account or writes health data.
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";
try { loadEnvFile(".env.local"); } catch { /* CI may provide environment values directly. */ }
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Set the public Supabase values in mobile/.env.local.");
const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const settings = await fetch(`${url}/auth/v1/settings`,{headers:{apikey:key}});
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
