// Moves on-device data into Supabase (health_days) and asks the coach to refresh.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureUser, requestAnalysis, supabase } from "@/lib/supabase";
import { localDay } from "./days";
import { readDays } from "./healthkit";
import type { HealthDayRow } from "./types";

const LAST_SYNC_KEY = "healthgarden:lastHealthSync";
const CACHE_KEY = "healthgarden:healthDays";

/** Columns HealthKit owns. Manual/Shortcut columns (screen time, driving) are never overwritten by a HealthKit sync. */
const HEALTHKIT_COLUMNS: (keyof HealthDayRow)[] = [
  "steps",
  "walking_running_km",
  "active_energy_kcal",
  "active_minutes",
  "running_minutes",
  "workout_minutes",
  "sleep_minutes",
  "bedtime",
  "wake_time",
  "daylight_minutes",
  "nutrition",
];

export async function cachedDays(): Promise<HealthDayRow[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) ?? "[]");
  } catch {
    return [];
  }
}

async function cache(rows: HealthDayRow[]) {
  const old = await cachedDays();
  const byDate = new Map(old.map((r) => [r.date, r]));
  for (const r of rows) byDate.set(r.date, { ...byDate.get(r.date), ...r });
  const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-35);
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged)).catch(() => {});
}

async function upload(rows: HealthDayRow[], columns: (keyof HealthDayRow)[]) {
  if (!supabase || !rows.length) return;
  const userId = await ensureUser();
  if (!userId) return;
  // Every row carries exactly the same keys: a bulk upsert updates only these columns, and
  // the source that owns them is the truth (no data that day → null).
  const payload = rows.map((r) => {
    const out: Record<string, unknown> = { user_id: userId, date: r.date, source: r.source ?? "healthkit" };
    for (const k of columns) out[k] = r[k] ?? null;
    return out;
  });
  const { error } = await supabase.from("health_days").upsert(payload, { onConflict: "user_id,date" });
  if (error) throw new Error(`Couldn't save your health data: ${error.message}`);
}

let running: Promise<SyncResult> | null = null;

export interface SyncResult {
  days: number;
  uploaded: boolean;
  coach: string | null;
}

/** Read Apple Health → cache on device → upload → refresh the coach. Safe to call often. */
export function syncHealth(opts: { days?: number; analyze?: boolean } = {}): Promise<SyncResult> {
  running ??= (async () => {
    try {
      const rows = await readDays(opts.days ?? 14);
      await cache(rows);
      let uploaded = false;
      let coach: string | null = null;
      if (supabase) {
        await upload(rows, HEALTHKIT_COLUMNS);
        uploaded = true;
        if (opts.analyze !== false) coach = await requestAnalysis().catch(() => null);
      }
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()).catch(() => {});
      return { days: rows.length, uploaded, coach };
    } finally {
      running = null;
    }
  })();
  return running;
}

export async function lastSync(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY).catch(() => null);
}

/**
 * Screen time can't be read by apps on iOS, so people type today's number from
 * Settings → Screen Time. Feed apps = social/video feeds (Instagram, TikTok, YouTube, X…).
 */
export async function logScreenTime(input: { feedMinutes?: number; screenMinutes?: number }, day = localDay(new Date())) {
  const row: HealthDayRow = { date: day, source: "manual" };
  if (input.feedMinutes !== undefined) row.feed_minutes = Math.max(0, Math.round(input.feedMinutes));
  if (input.screenMinutes !== undefined) row.screen_minutes = Math.max(0, Math.round(input.screenMinutes));
  await cache([row]);
  const cols = (["feed_minutes", "screen_minutes"] as const).filter((k) => row[k] !== undefined);
  await upload([row], [...cols]);
}
