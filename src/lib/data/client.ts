"use client";

// Browser helpers for real data: Apple Health import (Web Worker) and Shortcuts sync.
import type { DailySummary } from "@/lib/types";
import type { WorkerMessage } from "./appleHealth.worker";

export function generateSyncToken(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return "hg_" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export interface ImportResult {
  summaries: DailySummary[];
  stats: { recordsSeen: number; samplesKept: number; firstDay: string | null; lastDay: string | null };
}

/** Parse an Apple Health export (.zip or export.xml) off the main thread. */
export function importAppleHealth(file: File, sinceDay: string, onProgress: (fraction: number) => void): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./appleHealth.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const m = e.data;
      if (m.type === "progress") onProgress(m.total ? m.read / m.total : 0);
      else {
        worker.terminate();
        if (m.type === "done") resolve({ summaries: m.summaries, stats: m.stats });
        else reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "Could not read the file."));
    };
    worker.postMessage({ file, sinceDay });
  });
}

/** Pull what the user's Shortcuts sent to /api/ingest. */
export async function fetchSynced(token: string, from: string, to: string): Promise<DailySummary[]> {
  const res = await fetch(`/api/summaries?from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json().catch(() => null)) as { ok: boolean; data?: { summaries: DailySummary[] }; error?: string } | null;
  if (!json?.ok) throw new Error(json?.error ?? `Sync failed (${res.status})`);
  return json.data!.summaries;
}

export async function deleteSynced(token: string): Promise<void> {
  const res = await fetch("/api/ingest", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
  if (!json?.ok) throw new Error(json?.error ?? `Delete failed (${res.status})`);
}
