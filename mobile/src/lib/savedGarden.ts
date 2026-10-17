import type { DemoState } from "@/demo/simulation";
import {
  emptyJourney,
  syncDailyGold,
  validatePlan,
  type Journey,
} from "@/demo/journey";
import { GARDEN_SIZE } from "./gardenPlots";
import {
  emptyInventory,
  MARKET_ITEMS,
  STARTING_COINS,
  type Inventory,
} from "./market";

// Separate storage: switching back to main restores the original garden untouched.
export const GARDEN_STORAGE_KEY = "healthgarden:jury:v1";
export interface SavedGarden {
  version: 1;
  sim: DemoState & { health: number };
  inventory: Inventory;
  journey: Journey;
  terminal?: { applied: string[] };
}
export const initialGarden = (): SavedGarden => ({
  version: 1,
  sim: {
    offset: 0,
    coins: STARTING_COINS,
    streak: 0,
    plants: [],
    alerts: [],
    health: 0,
  },
  inventory: emptyInventory(),
  journey: emptyJourney(),
});

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const count = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const fraction = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const species = [
  "daisy",
  "marigold",
  "lavender",
  "tulip",
  "sunflower",
  "rose",
  "fruit_tree",
  "cherry_tree",
  "oak",
];
const stages = ["seed", "sprout", "young", "mature", "blooming"];

/** Never silently overwrite an unreadable save with starting money. */
export function decodeGarden(raw: string): SavedGarden {
  const v: unknown = JSON.parse(raw);
  if (record(v) && v.version === 1 && record(v.sim) && record(v.inventory)) {
    const s = v.sim;
    const inventory = v.inventory;
    const plantsValid =
      Array.isArray(s.plants) &&
      s.plants.every(
        (p) =>
          record(p) &&
          typeof p.id === "string" &&
          species.includes(String(p.species)) &&
          stages.includes(String(p.stage)) &&
          count(p.col) &&
          p.col < GARDEN_SIZE.cols &&
          count(p.row) &&
          p.row < GARDEN_SIZE.rows &&
          fraction(p.growth) &&
          typeof p.wateredToday === "boolean" &&
          (p.fertilizedToday === undefined ||
            typeof p.fertilizedToday === "boolean") &&
          typeof p.resting === "boolean" &&
          (p.variant === undefined || count(p.variant)),
      );
    const alertsValid =
      Array.isArray(s.alerts) &&
      s.alerts.every(
        (a) =>
          record(a) &&
          ["id", "title", "body", "time"].every(
            (k) => typeof a[k] === "string",
          ) &&
          ["nudge", "heads_up", "celebrate"].includes(String(a.level)) &&
          typeof a.read === "boolean",
      );
    const j = v.journey;
    const journeyValid =
      record(j) &&
      Number.isInteger(j.index) &&
      Number(j.index) >= -1 &&
      Number(j.index) <= 29 &&
      ["empty", "baseline", "midday", "complete"].includes(String(j.phase)) &&
      (j.dailyRewards === undefined ||
        (Array.isArray(j.dailyRewards) &&
          j.dailyRewards.every(
            (e) =>
              record(e) &&
              typeof e.date === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
              count(e.amount),
          ) &&
          new Set(j.dailyRewards.map((e) => (e as { date: string }).date))
            .size === j.dailyRewards.length)) &&
      Array.isArray(j.plans) &&
      j.plans.every((p) => {
        try {
          return (
            record(p) &&
            count(p.through) &&
            Number(p.through) <= Number(j.index) &&
            !!validatePlan(p, Number(p.through))
          );
        } catch {
          return false;
        }
      }) &&
      Array.isArray(j.settled) &&
      j.settled.every(
        (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d),
      ) &&
      new Set(j.settled).size === j.settled.length &&
      Array.isArray(j.ledger) &&
      j.ledger.every(
        (e) =>
          record(e) &&
          typeof e.id === "string" &&
          typeof e.date === "string" &&
          count(e.amount) &&
          count(e.goalsHit) &&
          count(e.goalsTotal),
      );
    if (
      count(s.coins) &&
      count(s.offset) &&
      s.offset <= 29 &&
      count(s.streak) &&
      fraction(s.health) &&
      (v.terminal === undefined ||
        (record(v.terminal) &&
          Array.isArray(v.terminal.applied) &&
          v.terminal.applied.length <= 1000 &&
          v.terminal.applied.every(
            (id) => typeof id === "string" && id.length <= 100,
          ))) &&
      journeyValid &&
      plantsValid &&
      alertsValid &&
      MARKET_ITEMS.every((item) => count(inventory[item.id]))
    ) {
      return v as unknown as SavedGarden;
    }
  }
  throw new Error("Saved garden data could not be read.");
}

interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** Serialize all mutations and publish only after saving the complete snapshot succeeds. */
export function createGardenStore(storage: Storage) {
  let current: SavedGarden | null = null;
  let loading: Promise<SavedGarden> | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<(state: SavedGarden) => void>();
  const publish = (next: SavedGarden) => {
    current = next;
    listeners.forEach((listener) => listener(next));
    return next;
  };
  const load = (): Promise<SavedGarden> => {
    if (current) return Promise.resolve(current);
    loading ??= storage
      .getItem(GARDEN_STORAGE_KEY)
      .then(async (raw) => {
        const previous = raw === null ? initialGarden() : decodeGarden(raw);
        const next = syncDailyGold(previous);
        if (next !== previous)
          await storage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(next));
        return publish(next);
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  };
  const enqueue = (operation: () => Promise<SavedGarden>) => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  return {
    load,
    subscribe(listener: (state: SavedGarden) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(change: (state: SavedGarden) => SavedGarden) {
      return enqueue(async () => {
        const previous = await load();
        const next = change(previous);
        if (next === previous) return previous;
        await storage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(next));
        return publish(next);
      });
    },
    reset() {
      return enqueue(async () => {
        const previous = await load().catch(() => null);
        const next = {
          ...initialGarden(),
          ...(previous?.terminal ? { terminal: previous.terminal } : {}),
        };
        await storage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(next));
        return publish(next);
      });
    },
  };
}
