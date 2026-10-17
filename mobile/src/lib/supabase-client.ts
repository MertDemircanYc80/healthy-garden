import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";

/** Shared by the app and the connection check; native session storage is supplied by the app. */
export function createSupabaseClient(options: SupabaseClientOptions<"public"> = {}) {
  // Expo requires direct process.env references to inline public values into the app bundle.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  // Keep the existing demo mode available when the backend isn't configured.
  if (!url && !key) return null;
  if (!url || !key) {
    throw new Error("Set both EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in mobile/.env.local.");
  }

  return createClient(url, key, options);
}
