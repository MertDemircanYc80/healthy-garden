import type { SavedGarden } from "./savedGarden";

export const SAPLING_REWARD = { days: 30, completion: 0.8, health: 0.8, discount: 20, code: "DEMO-SAPLING-20" } as const;
export interface SaplingReward {
  startedOn: string;
  /** Aggregate goal counts only, for the most recent 30 completed local days. */
  days: Record<string, { completed: number; total: number }>;
  unlockedOn?: string;
  claimedOn?: string;
}
export const shiftDate = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const elapsed = (start: string, end: string) => Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000));
export function saplingStatus(state: SavedGarden, today: string) {
  const reward = state.saplingReward;
  const start = reward?.startedOn ?? state.personal?.startedOn ?? state.calendarDate ?? today;
  const windowStart = shiftDate(today, -SAPLING_REWARD.days);
  const counts = Object.entries(reward?.days ?? {}).filter(([date]) => date >= windowStart && date < today);
  const completed = counts.reduce((n, [, day]) => n + day.completed, 0);
  const total = counts.reduce((n, [, day]) => n + day.total, 0);
  const completion = total ? completed / total : 0;
  const days = Math.min(SAPLING_REWARD.days, elapsed(start, today));
  const healthy = state.sim.plants.length > 0 && state.sim.health >= SAPLING_REWARD.health;
  return { days, completed, total, completion, health: state.sim.health, healthy,
    unlocked: !!reward?.unlockedOn, claimed: !!reward?.claimedOn,
    eligible: days >= SAPLING_REWARD.days && total > 0 && completion >= SAPLING_REWARD.completion && healthy };
}
/** Freeze the entitlement once earned. Goal rows are already evaluated by the personal-goal engine. */
export function updateSaplingReward(state: SavedGarden, today: string, results: SaplingReward["days"]): SavedGarden {
  if (state.saplingReward?.unlockedOn) return state;
  const startedOn = state.saplingReward?.startedOn ?? state.personal?.startedOn ?? state.calendarDate ?? today;
  const days = Object.fromEntries(Object.entries({ ...state.saplingReward?.days, ...results })
    .filter(([date]) => date >= startedOn && date >= shiftDate(today, -SAPLING_REWARD.days) && date < today));
  let reward: SaplingReward = { startedOn, days };
  if (saplingStatus({ ...state, saplingReward: reward }, today).eligible) reward = { ...reward, unlockedOn: today };
  if (JSON.stringify(state.saplingReward) === JSON.stringify(reward)) return state;
  return { ...state, saplingReward: reward };
}
export function claimSaplingReward(state: SavedGarden, today: string): SavedGarden {
  if (!state.saplingReward?.unlockedOn) throw new Error("The sapling reward is still locked.");
  if (state.saplingReward.claimedOn) throw new Error("This sapling discount has already been claimed.");
  // Keep receipts ordered even if the device clock moves backwards after unlocking.
  const claimedOn = today < state.saplingReward.unlockedOn ? state.saplingReward.unlockedOn : today;
  return { ...state, saplingReward: { ...state.saplingReward, claimedOn } };
}
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const date = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(`${x}T00:00:00Z`)) && new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10) === x;
export function validSaplingReward(x: unknown): x is SaplingReward {
  if (!record(x) || !date(x.startedOn) || !record(x.days) || Object.keys(x.days).length > 30) return false;
  if (x.unlockedOn !== undefined && (!date(x.unlockedOn) || elapsed(x.startedOn, x.unlockedOn) < 30)) return false;
  if (x.claimedOn !== undefined && (!date(x.claimedOn) || !date(x.unlockedOn) || x.claimedOn < x.unlockedOn)) return false;
  const startedOn = x.startedOn;
  return Object.entries(x.days).every(([key, v]) => date(key) && key >= startedOn && record(v) &&
    typeof v.total === "number" && Number.isSafeInteger(v.total) && v.total >= 0 && v.total <= 4 &&
    typeof v.completed === "number" && Number.isSafeInteger(v.completed) && v.completed >= 0 && v.completed <= v.total);
}
