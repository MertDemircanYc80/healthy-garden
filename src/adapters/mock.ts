// Mock adapter (plan §8.1, REQUIRED): 14 days of seeded, realistic data.
// Deterministic, so every teammate sees the same numbers.
import type { DailySummary } from "@/lib/types";
import type { DataAdapter } from "./types";

/** Tiny seeded PRNG (mulberry32) so data is stable across machines. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function mockSummary(date: string): DailySummary {
  const seed = Number(date.replaceAll("-", ""));
  const r = rng(seed);
  const sleepMinutes = Math.round(330 + r() * 150); // 5.5h – 8h
  const bedMin = (23 * 60 + Math.round(-45 + r() * 120)) % (24 * 60); // ~22:15 – 00:45
  const wakeMin = (bedMin + sleepMinutes) % (24 * 60);
  const toClock = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  return {
    date,
    steps: Math.round(2_000 + r() * 9_000),
    sleepMinutes,
    bedtime: toClock(bedMin),
    wakeTime: toClock(wakeMin),
    activeMinutes: Math.round(10 + r() * 60),
    scrollMinutes: Math.round(60 + r() * 150),
    longSessions: Math.floor(r() * 6),
    source: "mock",
  };
}

export const mockAdapter: DataAdapter = {
  id: "mock",
  label: "Demo data",
  async getSummaries(_userId, from, to) {
    const out: DailySummary[] = [];
    const d = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);
    while (d <= end) {
      out.push(mockSummary(isoDate(d)));
      d.setDate(d.getDate() + 1);
    }
    return out;
  },
};
