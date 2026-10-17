// Supabase client for the app. Values come from mobile/.env.local:
//   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
// Without them the app keeps running with on-device data and optional sample mode.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createSupabaseClient } from "./supabase-client";

export const supabase = createSupabaseClient({
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

export const isBackendConfigured = () => supabase !== null;

/** No login screen: every install becomes an anonymous user the first time it opens. */
export async function ensureUser(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`Couldn't start your garden account: ${error.message}`);
  return signed.user?.id ?? null;
}

/** Ask the coach (Edge Function "analyze") to refresh goals, insights, report and alerts. */
export async function requestAnalysis(force = false): Promise<string> {
  if (!supabase) return "offline";
  const { data, error } = await supabase.functions.invoke("analyze", { body: { force } });
  if (error) throw new Error("Your coach couldn't update right now.");
  const status = (data as { status?: string })?.status;
  if (status === "error") throw new Error("Your coach could not update right now.");
  return status ?? "ok";
}
