// Server-side storage for ingested data. Supabase when configured; an in-memory store for
// local development (so a phone on the same Wi-Fi can test Shortcuts against `npm run dev`).
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DailyMetrics, DeviceEvent } from "@/lib/data/samples";
import { mergeMetrics } from "@/lib/data/aggregate";

export interface StoredData {
  daily: Record<string, DailyMetrics>;
  events: DeviceEvent[];
}

export interface IngestStore {
  readonly kind: "supabase" | "memory";
  saveDaily(tokenHash: string, date: string, source: string, metrics: DailyMetrics): Promise<void>;
  saveEvents(tokenHash: string, events: DeviceEvent[]): Promise<void>;
  load(tokenHash: string, from: string, to: string): Promise<StoredData>;
  deleteAll(tokenHash: string): Promise<void>;
}

// ---------- Supabase ----------

class SupabaseStore implements IngestStore {
  readonly kind = "supabase" as const;
  constructor(private db: SupabaseClient) {}

  private async touch(tokenHash: string) {
    const { error } = await this.db
      .from("ingest_devices")
      .upsert({ token_hash: tokenHash, last_seen_at: new Date().toISOString() }, { onConflict: "token_hash" });
    if (error) throw new Error(error.message);
  }

  async saveDaily(tokenHash: string, date: string, source: string, metrics: DailyMetrics) {
    await this.touch(tokenHash);
    const { data: existing } = await this.db
      .from("daily_metrics")
      .select("metrics")
      .eq("token_hash", tokenHash)
      .eq("date", date)
      .eq("source", source)
      .maybeSingle();
    const merged = mergeMetrics(existing?.metrics as DailyMetrics | undefined, metrics);
    const { error } = await this.db
      .from("daily_metrics")
      .upsert({ token_hash: tokenHash, date, source, metrics: merged, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }

  async saveEvents(tokenHash: string, events: DeviceEvent[]) {
    if (!events.length) return;
    await this.touch(tokenHash);
    const rows = events.map((e) => ({ token_hash: tokenHash, kind: e.kind, app: e.app ?? null, at: e.at, at_local: e.at }));
    const { error } = await this.db.from("device_events").insert(rows);
    if (error) throw new Error(error.message);
  }

  async load(tokenHash: string, from: string, to: string): Promise<StoredData> {
    const pad = (day: string, n: number) => {
      const d = new Date(`${day}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const [daily, events] = await Promise.all([
      this.db.from("daily_metrics").select("date, source, metrics").eq("token_hash", tokenHash).gte("date", from).lte("date", to),
      // a day of padding on both sides: UTC vs local days, and sessions crossing midnight
      this.db
        .from("device_events")
        .select("kind, app, at_local")
        .eq("token_hash", tokenHash)
        .gte("at", `${pad(from, -1)}T00:00:00Z`)
        .lte("at", `${pad(to, 1)}T23:59:59Z`)
        .order("at")
        .limit(20000),
    ]);
    if (daily.error) throw new Error(daily.error.message);
    if (events.error) throw new Error(events.error.message);
    const out: StoredData = { daily: {}, events: [] };
    for (const r of daily.data ?? []) out.daily[r.date] = mergeMetrics(out.daily[r.date], r.metrics as DailyMetrics);
    out.events = (events.data ?? []).map((r) => ({ kind: r.kind, app: r.app ?? undefined, at: r.at_local }));
    return out;
  }

  async deleteAll(tokenHash: string) {
    const { error } = await this.db.from("ingest_devices").delete().eq("token_hash", tokenHash);
    if (error) throw new Error(error.message);
  }
}

// ---------- In-memory (dev only) ----------

const mem = globalThis as unknown as { __hgStore?: Map<string, StoredData> };


class MemoryStore implements IngestStore {
  readonly kind = "memory" as const;
  private get map(): Map<string, StoredData> {
    return (mem.__hgStore ??= new Map<string, StoredData>());
  }
  private bucket(t: string) {
    let b = this.map.get(t);
    if (!b) this.map.set(t, (b = { daily: {}, events: [] }));
    return b;
  }
  async saveDaily(t: string, date: string, _source: string, metrics: DailyMetrics) {
    const b = this.bucket(t);
    b.daily[date] = mergeMetrics(b.daily[date], metrics);
  }
  async saveEvents(t: string, events: DeviceEvent[]) {
    this.bucket(t).events.push(...events);
  }
  async load(t: string, from: string, to: string): Promise<StoredData> {
    const b = this.bucket(t);
    const daily = Object.fromEntries(Object.entries(b.daily).filter(([d]) => d >= from && d <= to));
    const events = b.events.filter((e) => e.at.slice(0, 10) >= from && e.at.slice(0, 10) <= to);
    return { daily, events };
  }
  async deleteAll(t: string) {
    this.map.delete(t);
  }
}

/** Returns the configured store, or null when nothing can persist (e.g. production without Supabase). */
export function getStore(): IngestStore | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return new SupabaseStore(createClient(url, key, { auth: { persistSession: false } }));
  if (process.env.NODE_ENV !== "production") return new MemoryStore();
  return null;
}
