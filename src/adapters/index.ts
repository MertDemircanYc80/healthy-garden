// Adapter registry. To add a source: create src/adapters/<name>.ts implementing
// DataAdapter, then register it here. Nothing else in the app should change.
import { mockAdapter } from "./mock";
import type { DataAdapter } from "./types";

export const adapters: Record<string, DataAdapter> = {
  mock: mockAdapter,
  // file_import: fileImportAdapter,   // TODO (integration lead): Apple Health / CSV
  // aggregator: aggregatorAdapter,    // TODO (if time): Terra / Open Wearables
};

export function getAdapter(id: string = "mock"): DataAdapter {
  return adapters[id] ?? mockAdapter;
}

export type { DataAdapter } from "./types";
