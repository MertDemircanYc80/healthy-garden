import { loadEnvFile } from "node:process";
import { createSupabaseClient } from "../src/lib/supabase-client.ts";

async function main() {
  try {
    loadEnvFile(new URL("../.env.local", import.meta.url));
  } catch (error) {
    // CI can supply the same variables directly without a local env file.
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  const supabase = createSupabaseClient({
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
    },
  });
  if (!supabase) {
    throw new Error("Configure mobile/.env.local using mobile/.env.example before running the connection check.");
  }

  // This read-only SDK request validates the URL and API key without creating users,
  // requiring app tables, or changing data. RLS may return an empty bucket list.
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Supabase connection failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error("Supabase returned an unexpected response.");

  console.log("Supabase connection OK: the client reached Storage with the configured public key.");
  console.log("No data was changed. Anonymous sign-in and the app schema are separate setup steps; see docs/SUPABASE_SETUP.md.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Supabase connection failed.");
  process.exitCode = 1;
});
