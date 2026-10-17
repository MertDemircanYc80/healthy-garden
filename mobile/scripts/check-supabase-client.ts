import assert from "node:assert/strict";
import { createSupabaseClient } from "../src/lib/supabase-client";

async function main() {
  const names = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] as const;
  const previous = names.map(name => process.env[name]);
  try {
    for (const name of names) delete process.env[name];
    assert.equal(createSupabaseClient(), null);
    process.env.EXPO_PUBLIC_SUPABASE_URL = "  ";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "  ";
    assert.equal(createSupabaseClient(), null);
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    assert.throws(() => createSupabaseClient(), /Set both/);
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-public-key";
    assert.throws(() => createSupabaseClient(), /Set both/);
    process.env.EXPO_PUBLIC_SUPABASE_URL = "not-a-url";
    assert.throws(() => createSupabaseClient());

    process.env.EXPO_PUBLIC_SUPABASE_URL = "  https://example.supabase.co  ";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "  test-public-key  ";
    let calls = 0;
    const client = createSupabaseClient({
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          calls++;
          assert.match(String(input), /^https:\/\/example\.supabase\.co\/rest\/v1\/health_days/);
          assert.equal(new Headers(init?.headers).get("apikey"), "test-public-key");
          return new Response(JSON.stringify({ code: "42501", message: "permission denied" }), {
            status: 403, headers: { "content-type": "application/json" },
          });
        },
      },
    });
    assert.ok(client);
    const { error } = await client.from("health_days").select("date").limit(0);
    assert.equal(error?.code, "42501");
    assert.equal(calls, 1);
    console.log("✓ shared client supports local-only mode, rejects partial/invalid config, trims values and preserves request options/errors");
  } finally {
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
}
void main();
