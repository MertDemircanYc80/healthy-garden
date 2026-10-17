import type { HealthDayRow } from "./types";
import { validateHealthRow } from "./validation";

export const HEALTH_STORAGE_KEY = "healthgarden:health:v2";
interface Storage { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> }
export interface PendingHealth { row: HealthDayRow; columns: (keyof HealthDayRow)[]; revision: number }
export interface HealthSnapshot {
  version: 2;
  days: HealthDayRow[];
  pending: PendingHealth[];
  revision: number;
  lastRead: string | null;
  lastUpload: string | null;
  syncEnabled: boolean;
}
const empty = (): HealthSnapshot => ({ version: 2, days: [], pending: [], revision: 0, lastRead: null, lastUpload: null, syncEnabled: true });

/** One durable snapshot; network acknowledgements cannot erase a newer local edit. */
export function createHealthStore(storage: Storage) {
  let current: HealthSnapshot | null = null;
  let loading: Promise<HealthSnapshot> | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  let flushing: Promise<void> | null = null;
  const listeners = new Set<(s: HealthSnapshot) => void>();
  async function read(): Promise<HealthSnapshot> {
    if (current) return current;
    const raw = await storage.getItem(HEALTH_STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as HealthSnapshot;
      if (s.version !== 2 || !Array.isArray(s.days) || !Array.isArray(s.pending) || !Number.isSafeInteger(s.revision) || typeof s.syncEnabled !== "boolean") throw new Error("Saved health data could not be read. It has not been overwritten.");
      s.days.forEach(validateHealthRow);
      s.pending.forEach(p => { validateHealthRow(p.row); if (!Array.isArray(p.columns) || !Number.isSafeInteger(p.revision)) throw new Error("Invalid pending health update."); });
      current = s;
    } else {
      const legacy = await storage.getItem("healthgarden:healthDays");
      const days: HealthDayRow[] = legacy ? JSON.parse(legacy) : [];
      if (!Array.isArray(days)) throw new Error("Saved health data could not be read.");
      days.forEach(validateHealthRow);
      current = { ...empty(), days, revision: 1, pending: days.map(row => ({ row, revision: 1, columns: Object.keys(row).filter(k => k !== "date" && k !== "source") as (keyof HealthDayRow)[] })) };
    }
    return current;
  }
  function load() { return loading ??= read().finally(() => { loading = null; }); }
  function update(change: (s: HealthSnapshot) => HealthSnapshot) {
    const work = queue.then(async () => {
      const next = change(await load());
      await storage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(next));
      current = next;
      listeners.forEach(fn => fn(next));
      return next;
    });
    queue = work.catch(() => {});
    return work;
  }
  return {
    load,
    subscribe(fn: (s: HealthSnapshot) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    save(rows: HealthDayRow[], columns: (keyof HealthDayRow)[]) {
      rows.forEach(validateHealthRow);
      return update(s => {
        const byDate = new Map(s.days.map(d => [d.date, d]));
        const pending = new Map(s.pending.map(p => [p.row.date, p]));
        const revision = s.revision + 1;
        for (const row of rows) {
          const merged = { ...pending.get(row.date)?.row, ...byDate.get(row.date), ...row };
          // A source can explicitly clear its own missing values without touching manual fields.
          for (const key of columns) if (row[key] === undefined) delete merged[key];
          byDate.set(row.date, merged);
          if (s.syncEnabled) {
            const previous = pending.get(row.date);
            pending.set(row.date, { row: merged, columns: [...new Set([...(previous?.columns ?? []), ...columns])], revision });
          }
        }
        return { ...s, revision, days: [...byDate.values()].sort((a,b) => a.date.localeCompare(b.date)).slice(-35), pending: [...pending.values()], lastRead: new Date().toISOString() };
      });
    },
    flush(upload: (p: PendingHealth) => Promise<void>) {
      flushing ??= (async () => {
        while (true) {
          await queue;
          const s = await load();
          const p = s.pending[0];
          if (!s.syncEnabled || !p) return;
          await upload(p);
          await update(latest => ({ ...latest, pending: latest.pending.filter(x => x.row.date !== p.row.date || x.revision !== p.revision), lastUpload: new Date().toISOString() }));
        }
      })().finally(() => { flushing = null; });
      return flushing;
    },
    async setSyncEnabled(enabled: boolean) {
      // Stop the queue before waiting for any request already in flight.
      await update(s => ({ ...s, syncEnabled: enabled, pending: enabled ? s.pending : [] }));
      if (!enabled) await flushing?.catch(() => {});
    },
    async clear() {
      await this.setSyncEnabled(false);
      await update(() => ({ ...empty(), syncEnabled: false }));
      // Overwrite legacy caches as well, so old data cannot reappear on migration.
      await storage.setItem("healthgarden:healthDays", "[]");
      await storage.setItem("healthgarden:lastHealthSync", "");
    },
  };
}
