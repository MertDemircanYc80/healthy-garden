import { coachAlerts, MAX_OFFSET, type DemoState } from "@/demo/simulation";
import { emptyInventory, MARKET_ITEMS, STARTING_COINS, type Inventory } from "./market";

export const GARDEN_STORAGE_KEY = "healthgarden:game:v1";
export interface SavedGarden {
  version: 1;
  sim: DemoState & { health: number };
  inventory: Inventory;
}
export const initialGarden = (): SavedGarden => ({
  version: 1,
  sim: { offset: 0, coins: STARTING_COINS, streak: 4, plants: [], alerts: coachAlerts(), health: 0.72 },
  inventory: emptyInventory(),
});

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const fraction = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const species = ["daisy", "marigold", "lavender", "tulip", "sunflower", "rose", "fruit_tree", "cherry_tree", "oak"];
const stages = ["seed", "sprout", "young", "mature", "blooming"];

/** Never silently overwrite an unreadable save with starting money. */
export function decodeGarden(raw: string): SavedGarden {
  const v: unknown = JSON.parse(raw);
  if (record(v) && v.version === 1 && record(v.sim) && record(v.inventory)) {
    const s = v.sim;
    const inventory = v.inventory;
    const plantsValid = Array.isArray(s.plants) && s.plants.every(p => record(p) &&
      typeof p.id === "string" && species.includes(String(p.species)) && stages.includes(String(p.stage)) &&
      count(p.col) && p.col < 6 && count(p.row) && p.row < 4 && fraction(p.growth) &&
      typeof p.wateredToday === "boolean" && (p.fertilizedToday === undefined || typeof p.fertilizedToday === "boolean") && typeof p.resting === "boolean" && (p.variant === undefined || count(p.variant)));
    const alertsValid = Array.isArray(s.alerts) && s.alerts.every(a => record(a) &&
      ["id", "title", "body", "time"].every(k => typeof a[k] === "string") &&
      ["nudge", "heads_up", "celebrate"].includes(String(a.level)) && typeof a.read === "boolean");
    if (count(s.coins) && count(s.offset) && s.offset <= MAX_OFFSET && count(s.streak) && fraction(s.health) &&
        plantsValid && alertsValid && MARKET_ITEMS.every(item => count(inventory[item.id]))) {
      return v as unknown as SavedGarden;
    }
  }
  throw new Error("Saved garden data could not be read.");
}

interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }

/** Serialize all mutations and publish only after saving the complete snapshot succeeds. */
export function createGardenStore(storage: Storage) {
  let current: SavedGarden | null = null;
  let loading: Promise<SavedGarden> | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<(state: SavedGarden) => void>();
  const publish = (next: SavedGarden) => {
    current = next;
    listeners.forEach(listener => listener(next));
    return next;
  };
  const load = (): Promise<SavedGarden> => {
    if (current) return Promise.resolve(current);
    loading ??= storage.getItem(GARDEN_STORAGE_KEY).then(raw => publish(raw === null ? initialGarden() : decodeGarden(raw))).finally(() => { loading = null; });
    return loading;
  };
  const enqueue = (operation: () => Promise<SavedGarden>) => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  return {
    load,
    subscribe(listener: (state: SavedGarden) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
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
        const next = initialGarden();
        await storage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(next));
        return publish(next);
      });
    },
  };
}
