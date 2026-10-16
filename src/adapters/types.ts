// Data adapter contract (plan §8.1).
// The app ONLY talks to DailySummary. Each source (mock, file import, aggregator,
// Chrome extension) is a plug-in that implements this interface.
import type { DailySummary } from "@/lib/types";

export interface DataAdapter {
  id: DailySummary["source"];
  label: string;
  /** Return summaries for the inclusive date range, oldest first. */
  getSummaries(userId: string, from: string, to: string): Promise<DailySummary[]>;
}
