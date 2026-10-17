import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureUser, requestAnalysis, supabase } from "@/lib/supabase";
import { localDay } from "./days";
import { readDays } from "./healthkit";
import { createHealthStore, type PendingHealth } from "./store";
import type { HealthDayRow } from "./types";

export const healthStore = createHealthStore(AsyncStorage);
const HEALTHKIT_COLUMNS: (keyof HealthDayRow)[] = ["steps", "walking_running_km", "active_energy_kcal", "active_minutes", "running_minutes", "workout_minutes", "sleep_minutes", "bedtime", "wake_time", "daylight_minutes", "nutrition"];
async function upload({ row, columns }: PendingHealth) {
  if (!supabase) throw new Error("Cloud syncing is not configured. Your data is saved on this device.");
  const userId = await ensureUser();
  if (!userId) throw new Error("Couldn’t sign in for syncing. Your update is pending on this device.");
  const payload: Record<string, unknown> = { user_id: userId, date: row.date, source: row.source ?? "healthkit" };
  for (const key of columns) payload[key] = row[key] ?? null;
  const { error } = await supabase.from("health_days").upsert(payload, { onConflict: "user_id,date" });
  if (error) throw new Error("Saved on this device. Cloud upload is pending; try syncing again.");
}
export async function retryUploads() {
  if (supabase) await healthStore.flush(upload);
}
let running: Promise<void> | null = null;
export function syncHealth(opts: { days?: number } = {}) {
  running ??= (async () => {
    const before = await healthStore.load();
    if (!before.syncEnabled) return;
    const rows = await readDays(opts.days ?? 14);
    if (!(await healthStore.load()).syncEnabled) return;
    await healthStore.save(rows, HEALTHKIT_COLUMNS);
    await retryUploads();
    if (supabase && (await healthStore.load()).syncEnabled) {
      try { await requestAnalysis(); } catch { throw new Error("Health data synced. Coach refresh failed; try syncing again."); }
    }
  })().finally(() => { running = null; });
  return running;
}
export async function waitForHealthSync() { await running?.catch(() => {}); }
export async function logScreenTime(input: { feedMinutes?: number; screenMinutes?: number }, day = localDay(new Date())) {
  const row: HealthDayRow = { date: day, source: "manual" };
  if (input.feedMinutes !== undefined) row.feed_minutes = input.feedMinutes;
  if (input.screenMinutes !== undefined) row.screen_minutes = input.screenMinutes;
  const columns = (["feed_minutes", "screen_minutes"] as const).filter(k => row[k] !== undefined);
  await healthStore.save([row], columns);
  // Local save succeeded even if upload fails; pending status communicates that separately.
}
