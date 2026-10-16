// Healthy Garden game engine — the whole core loop as PURE functions (state in → state out).
// No React, no storage, no network: the UI calls these through GameProvider, and the
// backend can later persist the same state (or reuse these functions in API routes).
import { mockSummary } from "@/adapters/mock";
import {
  DAILY_COIN_CAP,
  DEMO_BOOST,
  GARDEN_GRID,
  IMPACT_MILESTONE_COINS,
  SHOP_ITEMS,
  WELCOME_GIFT,
} from "@/lib/economy";
import { advanceDay, gardenHealth, stageFor } from "@/lib/garden";
import { evaluateTasks, sunlightFor } from "@/lib/tasks";
import type { DailySummary, GardenPlant, ShopItemId, TaskKey, TaskProgress } from "@/lib/types";

// ---------- State ----------

export type ActiveSource = "mock" | "apple_health" | "shortcut";

export interface Profile {
  name: string;
  stepGoal: number;
  bedtimeTarget: string; // "HH:MM"
  /** Where today's numbers come from. Real sources fill `imported`. */
  dataSource: ActiveSource;
}

export interface SyncInfo {
  /** Personal token the iOS Shortcuts send as "Authorization: Bearer <token>". Never shared in URLs. */
  token: string;
  lastSyncAt?: string;
  lastImportAt?: string;
  importedRange?: { from: string; to: string };
}

export interface LedgerEntry {
  id: string;
  day: string; // game day YYYY-MM-DD
  amount: number; // + earned, - spent
  reason: string;
  kind: "task" | "purchase" | "gift";
}

/** Manual / demo adjustments layered on top of the data source for one day. */
export interface DayAdjust {
  steps: number;
  sleepMinutes: number;
  scrollMinutes: number;
  offlineHours: number;
}

export interface ImpactRecord {
  id: string;
  day: string;
  partner: string;
  location: string;
  species: string;
}

export interface GameState {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  /** The game's current day. Advances with "skip a day" (demo) or real time. */
  day: string;
  adjust: Record<string, DayAdjust>;
  /** Coins already paid per task per day — makes payouts idempotent. */
  awarded: Record<string, Partial<Record<TaskKey, number>>>;
  ledger: LedgerEntry[];
  inventory: Partial<Record<ShopItemId, number>>;
  plants: GardenPlant[];
  /** Daily care score (0..1) for finished days — feeds the 7-day health meter. */
  history: Record<string, number>;
  impact: ImpactRecord[];
  nextId: number;
  /** Real data by day from Apple Health import and/or Shortcuts sync. */
  imported?: Record<string, DailySummary>;
  sync?: SyncInfo;
}

export type ActionResult = { state: GameState; ok: true; message: string } | { state: GameState; ok: false; error: string };

const done = (state: GameState, message: string): ActionResult => ({ state, ok: true, message });
const nope = (state: GameState, error: string): ActionResult => ({ state, ok: false, error });

// ---------- Date helpers (game days are plain YYYY-MM-DD strings) ----------

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const noon = (day: string) => new Date(`${day}T12:00:00`);

// ---------- Setup ----------

export function createInitialState(today: string): GameState {
  return {
    version: 1,
    onboarded: false,
    profile: { name: "", stepGoal: 8000, bedtimeTarget: "23:00", dataSource: "mock" },
    day: today,
    adjust: {},
    awarded: {},
    ledger: [],
    inventory: {},
    plants: [],
    history: {},
    impact: [],
    nextId: 1,
  };
}

function newId(state: GameState, prefix: string): [string, GameState] {
  return [`${prefix}${state.nextId}`, { ...state, nextId: state.nextId + 1 }];
}

function addItems(state: GameState, itemId: ShopItemId, qty: number): GameState {
  const current = state.inventory[itemId] ?? 0;
  return { ...state, inventory: { ...state.inventory, [itemId]: Math.max(0, current + qty) } };
}

export function onboard(state: GameState, profile: Profile): ActionResult {
  let s: GameState = { ...state, onboarded: true, profile };
  for (const g of WELCOME_GIFT) s = addItems(s, g.itemId, g.quantity);
  return done(s, `Welcome, ${profile.name}! Here's a watering can and your first seed 🌼`);
}

// ---------- Data for a day ----------

const NO_ADJUST: DayAdjust = { steps: 0, sleepMinutes: 0, scrollMinutes: 0, offlineHours: 0 };

export const emptySummary = (day: string, source: DailySummary["source"]): DailySummary => ({
  date: day,
  steps: 0,
  sleepMinutes: 0,
  bedtime: null,
  wakeTime: null,
  activeMinutes: 0,
  scrollMinutes: 0,
  longSessions: 0,
  source,
});

/** Raw data for a day from the active source (before demo/manual adjustments). */
function baseSummary(state: GameState, day: string): DailySummary {
  if (state.profile.dataSource === "mock") {
    // Demo data: the current day starts like a morning (sleep final, steps/scroll partial)
    // so the demo has room to show progress live.
    const m = mockSummary(day);
    const isToday = day === state.day;
    return {
      ...m,
      steps: Math.round(m.steps * (isToday ? 0.3 : 1)),
      scrollMinutes: Math.round(m.scrollMinutes * (isToday ? 0.5 : 1)),
    };
  }
  return state.imported?.[day] ?? emptySummary(day, state.profile.dataSource);
}

/** True when some source actually measured scrolling on this day. */
export function hasScrollData(state: GameState, day: string): boolean {
  if (state.profile.dataSource === "mock") return true;
  const d = state.imported?.[day];
  return !!d && (d.appUsage !== undefined || d.scrollMinutes > 0 || d.longSessions > 0);
}

/** A day's numbers = active source + demo/manual adjustments. */
export function summaryFor(state: GameState, day: string): DailySummary {
  const base = baseSummary(state, day);
  const a = state.adjust[day] ?? NO_ADJUST;
  return {
    ...base,
    steps: Math.max(0, base.steps + a.steps),
    sleepMinutes: Math.max(0, base.sleepMinutes + a.sleepMinutes),
    scrollMinutes: Math.max(0, base.scrollMinutes + a.scrollMinutes),
  };
}

export function scrollBaseline(state: GameState, day: string): number | null {
  const prev = Array.from({ length: 7 }, (_, i) => addDays(day, -(i + 1)))
    .filter((d) => hasScrollData(state, d))
    .map((d) => summaryFor(state, d));
  if (prev.length === 0) return null;
  return prev.reduce((sum, d) => sum + d.scrollMinutes, 0) / prev.length;
}

export interface TaskView extends TaskProgress {
  awarded: number;
  claimable: number;
}

export function tasksFor(state: GameState, day: string): TaskView[] {
  const summary = summaryFor(state, day);
  const tasks = evaluateTasks(summary, {
    scrollBaselineMinutes: scrollBaseline(state, day),
    bedtimeTarget: state.profile.bedtimeTarget,
    offlineHours: (state.adjust[day] ?? NO_ADJUST).offlineHours,
    hasScrollData: hasScrollData(state, day) || (state.adjust[day]?.scrollMinutes ?? 0) !== 0,
  });
  const paid = state.awarded[day] ?? {};
  return tasks.map((t) => {
    const awarded = paid[t.key] ?? 0;
    return { ...t, awarded, claimable: t.completed ? Math.max(0, t.reward - awarded) : 0 };
  });
}

// ---------- Selectors ----------

export const balanceOf = (s: GameState) => s.ledger.reduce((sum, e) => sum + e.amount, 0);

export const earnedFromTasksOn = (s: GameState, day: string) =>
  s.ledger.filter((e) => e.day === day && e.kind === "task").reduce((sum, e) => sum + e.amount, 0);

export const lifetimeEarned = (s: GameState) =>
  s.ledger.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);

export function todayView(s: GameState) {
  const tasks = tasksFor(s, s.day);
  const sunlight = sunlightFor(tasks);
  const pastDays = Object.keys(s.history).sort().slice(-6);
  const health = gardenHealth([...pastDays.map((d) => s.history[d]), sunlight]);
  return {
    day: s.day,
    summary: summaryFor(s, s.day),
    tasks,
    sunlight,
    health,
    balance: balanceOf(s),
    earnedToday: earnedFromTasksOn(s, s.day),
    claimableTotal: tasks.reduce((sum, t) => sum + t.claimable, 0),
  };
}

export function impactProgress(s: GameState) {
  const earned = lifetimeEarned(s);
  const reached = Math.floor(earned / IMPACT_MILESTONE_COINS);
  return {
    earned,
    reached,
    redeemed: s.impact.length,
    canRedeem: reached > s.impact.length,
    towardNext: (earned % IMPACT_MILESTONE_COINS) / IMPACT_MILESTONE_COINS,
  };
}

// ---------- Actions ----------

/** Collect coins for one completed task. Idempotent and capped per day. */
export function claimTask(state: GameState, key: TaskKey): ActionResult {
  const task = tasksFor(state, state.day).find((t) => t.key === key);
  if (!task || task.claimable <= 0) return nope(state, "Nothing to collect for this task yet.");

  const room = DAILY_COIN_CAP - earnedFromTasksOn(state, state.day);
  if (room <= 0) return nope(state, `Daily limit of ${DAILY_COIN_CAP} coins reached — rest is part of living well 🌙`);

  const amount = Math.min(task.claimable, room);
  const [id, s0] = newId(state, "tx");
  let s = s0;
  const dayAwards = { ...(s.awarded[s.day] ?? {}), [key]: task.awarded + amount };
  s = {
    ...s,
    awarded: { ...s.awarded, [s.day]: dayAwards },
    ledger: [...s.ledger, { id, day: s.day, amount, reason: task.title, kind: "task" }],
  };
  return done(s, `+${amount} coins · ${task.title}`);
}

export function claimAll(state: GameState): ActionResult {
  let s = state;
  let total = 0;
  for (const t of tasksFor(state, state.day)) {
    if (t.claimable <= 0) continue;
    const r = claimTask(s, t.key);
    if (!r.ok) break;
    total += balanceOf(r.state) - balanceOf(s);
    s = r.state;
  }
  return total > 0 ? done(s, `+${total} coins collected`) : nope(state, "Nothing to collect yet.");
}

export function buy(state: GameState, itemId: ShopItemId): ActionResult {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return nope(state, "Unknown item.");
  if (item.type === "tool" && (state.inventory[itemId] ?? 0) > 0) return nope(state, `You already own a ${item.name}.`);
  const balance = balanceOf(state);
  if (balance < item.price) return nope(state, `You need ${item.price - balance} more coins for ${item.name}.`);

  const [id, s0] = newId(state, "tx");
  let s = s0;
  s = { ...s, ledger: [...s.ledger, { id, day: s.day, amount: -item.price, reason: item.name, kind: "purchase" }] };
  s = addItems(s, itemId, 1);
  return done(s, `${item.emoji} ${item.name} added to your bag`);
}

export const plantAt = (s: GameState, x: number, y: number) => s.plants.find((p) => p.gridX === x && p.gridY === y);

export function plant(state: GameState, itemId: ShopItemId, x: number, y: number): ActionResult {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item?.growthDays) return nope(state, "That item can't be planted.");
  if ((state.inventory[itemId] ?? 0) < 1) return nope(state, `You don't have a ${item.name}. Visit the shop!`);
  if (x < 0 || y < 0 || x >= GARDEN_GRID.cols || y >= GARDEN_GRID.rows) return nope(state, "That spot is outside the garden.");
  if (plantAt(state, x, y)) return nope(state, "Something is already growing there.");

  const [id, s0] = newId(state, "p");
  let s = s0;
  const p: GardenPlant = {
    id,
    itemId,
    gridX: x,
    gridY: y,
    growthPoints: 0,
    stage: "seed",
    isDormant: false,
    wateredToday: false,
    fertilizedUntil: null,
    plantedAt: noon(s.day).toISOString(),
  };
  s = addItems({ ...s, plants: [...s.plants, p] }, itemId, -1);
  return done(s, `${item.name.replace(" seed", "").replace(" sapling", "")} planted — give it some water 💧`);
}

function updatePlant(s: GameState, id: string, fn: (p: GardenPlant) => GardenPlant): GameState {
  return { ...s, plants: s.plants.map((p) => (p.id === id ? fn(p) : p)) };
}

export function water(state: GameState, plantId: string): ActionResult {
  const p = state.plants.find((x) => x.id === plantId);
  if (!p) return nope(state, "Plant not found.");
  if ((state.inventory.watering_can ?? 0) < 1) return nope(state, "You need a watering can first (Shop).");
  if (p.wateredToday) return nope(state, "Already watered today 💧");
  // Watering wakes a resting plant right away — returning is always rewarded.
  return done(updatePlant(state, plantId, (x) => ({ ...x, wateredToday: true, isDormant: false })), "Watered 💧");
}

export function fertilize(state: GameState, plantId: string): ActionResult {
  const p = state.plants.find((x) => x.id === plantId);
  if (!p) return nope(state, "Plant not found.");
  if ((state.inventory.fertilizer ?? 0) < 1) return nope(state, "No fertilizer in your bag (Shop).");
  if (p.stage === "blooming") return nope(state, "This plant is already fully grown 🌸");
  const until = `${addDays(state.day, 1)}T00:00:00`;
  if (p.fertilizedUntil && new Date(p.fertilizedUntil) > noon(state.day)) return nope(state, "Already fertilized today.");
  const s = addItems(updatePlant(state, plantId, (x) => ({ ...x, fertilizedUntil: until })), "fertilizer", -1);
  return done(s, "Fertilized — double growth tonight 🧪");
}

export type BoostKind = "steps" | "sleep" | "scroll" | "offline";

/** Demo boost / manual log. "offline" is also the real manual input for offline hours. */
export function boost(state: GameState, kind: BoostKind): ActionResult {
  const a = { ...(state.adjust[state.day] ?? NO_ADJUST) };
  if (kind === "steps") a.steps += DEMO_BOOST.steps;
  if (kind === "sleep") a.sleepMinutes += DEMO_BOOST.sleepMinutes;
  if (kind === "scroll") a.scrollMinutes += DEMO_BOOST.scrollMinutes;
  if (kind === "offline") {
    if (a.offlineHours >= 3) return nope(state, "3 offline hours logged today — that's the max.");
    a.offlineHours += DEMO_BOOST.offlineHours;
  }
  const labels = { steps: "+1,000 steps", sleep: "+1 hour of sleep", scroll: "−30 min scrolling", offline: "Offline hour logged 📵" };
  return done({ ...state, adjust: { ...state.adjust, [state.day]: a } }, labels[kind]);
}

/** End the current day: grow the garden, record health, move to tomorrow. */
export function skipDay(state: GameState): ActionResult {
  const tasks = tasksFor(state, state.day);
  const sunlight = sunlightFor(tasks);
  const now = noon(state.day);
  const plants = state.plants.map((p) => advanceDay(p, sunlight, now));
  const grew = plants.filter((p, i) => p.growthPoints > state.plants[i].growthPoints).length;
  const resting = plants.filter((p) => p.isDormant).length;
  const s: GameState = {
    ...state,
    plants,
    history: { ...state.history, [state.day]: sunlight },
    day: addDays(state.day, 1),
  };
  const parts = [`A new day ☀️`];
  if (grew) parts.push(`${grew} plant${grew > 1 ? "s" : ""} grew`);
  if (resting) parts.push(`${resting} resting`);
  return done(s, parts.join(" · "));
}

// ---------- Data sources ----------

/** Merge real daily summaries (Apple Health import or Shortcuts sync) and switch to that source. */
export function importSummaries(state: GameState, summaries: DailySummary[], source: Exclude<ActiveSource, "mock">, at: string): ActionResult {
  if (!summaries.length) return nope(state, "No days with data were found in that file.");
  const imported = { ...(state.imported ?? {}) };
  for (const s of summaries) {
    const prev = imported[s.date];
    // Keep fields from other sources; the newest source wins where both have a value.
    imported[s.date] = prev ? { ...prev, ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)), source } : { ...s, source };
  }
  const days = summaries.map((s) => s.date).sort();
  const sync: SyncInfo = {
    ...(state.sync ?? { token: "" }),
    ...(source === "apple_health" ? { lastImportAt: at, importedRange: { from: days[0], to: days[days.length - 1] } } : { lastSyncAt: at }),
  };
  return done(
    { ...state, imported, sync, profile: { ...state.profile, dataSource: source } },
    `${summaries.length} day${summaries.length > 1 ? "s" : ""} of real data added 🌿`,
  );
}

export function setDataSource(state: GameState, source: ActiveSource): ActionResult {
  if (source !== "mock" && !Object.keys(state.imported ?? {}).length) {
    return nope(state, "Import Apple Health data or run a Shortcut first.");
  }
  const label = { mock: "Demo data", apple_health: "Apple Health", shortcut: "iPhone Shortcuts" }[source];
  return done({ ...state, profile: { ...state.profile, dataSource: source } }, `Using ${label}`);
}

export function setSyncToken(state: GameState, token: string): GameState {
  return { ...state, sync: { ...(state.sync ?? {}), token } };
}

export function clearImported(state: GameState): ActionResult {
  return done(
    { ...state, imported: {}, sync: state.sync ? { token: state.sync.token } : undefined, profile: { ...state.profile, dataSource: "mock" } },
    "Imported health data deleted from this device",
  );
}

const PARTNER = "Tree-planting partner (prototype)";
const SITES = [
  { location: "Santa Cruz Mountains, California", species: "Coast redwood" },
  { location: "Sierra Nevada foothills, California", species: "Ponderosa pine" },
  { location: "Madagascar mangrove coast", species: "Red mangrove" },
  { location: "Kenya highlands", species: "Croton" },
];

/** Mocked real-world planting: no payment happens, the certificate is labelled a prototype. */
export function redeemImpact(state: GameState): ActionResult {
  if (!impactProgress(state).canRedeem) return nope(state, `Earn ${IMPACT_MILESTONE_COINS} coins to unlock a real tree.`);
  const [id, s0] = newId(state, "tree");
  let s = s0;
  const site = SITES[s.impact.length % SITES.length];
  s = { ...s, impact: [...s.impact, { id, day: s.day, partner: PARTNER, ...site }] };
  return done(s, `🌳 A ${site.species} is being planted for you!`);
}

/** Seeded demo account for the pitch (plan §21): a garden that already looks alive. */
export function loadShowcase(today: string): GameState {
  let s = createInitialState(today);
  s = onboard(s, { name: "Demo", stepGoal: 8000, bedtimeTarget: "23:00", dataSource: "mock" }).state;
  const garden: [ShopItemId, number, number, number, boolean][] = [
    ["oak_sapling", 0, 0, 8, false],
    ["cherry_sapling", 7, 0, 8, false],
    ["fruit_sapling", 3, 0, 7, false],
    ["sunflower_seed", 1, 0, 5, false],
    ["sunflower_seed", 2, 0, 5, false],
    ["sunflower_seed", 5, 0, 3, false],
    ["rose_bush", 6, 1, 6, false],
    ["rose_bush", 4, 1, 4, false],
    ["tulip_bulb", 1, 2, 4, false],
    ["tulip_bulb", 2, 2, 4, false],
    ["tulip_bulb", 3, 2, 3, false],
    ["lavender_seed", 5, 2, 4, false],
    ["lavender_seed", 6, 2, 4, false],
    ["daisy_seed", 0, 3, 3, false],
    ["daisy_seed", 1, 3, 3, false],
    ["marigold_seed", 2, 3, 3, false],
    ["marigold_seed", 4, 3, 2, false],
    ["daisy_seed", 6, 3, 1, true],
    ["tulip_bulb", 7, 3, 1, false],
  ];
  for (const [itemId, x, y, points, dormant] of garden) {
    const item = SHOP_ITEMS.find((i) => i.id === itemId)!;
    s = addItems(s, itemId, 1);
    s = plant(s, itemId, x, y).state;
    const p = s.plants[s.plants.length - 1];
    s = updatePlant(s, p.id, (q) => ({ ...q, growthPoints: points, stage: stageFor(points, item.growthDays!), isDormant: dormant }));
  }
  for (let i = 1; i <= 6; i++) s.history[addDays(today, -i)] = [1, 0.67, 1, 1, 0.33, 1][i - 1];
  s = addItems(s, "fertilizer", 2);
  s = addItems(s, "sunflower_seed", 1);
  // 460 coins: close to the 500 milestone, so one live task on stage unlocks a real tree.
  const [id, withId] = newId(s, "tx");
  return {
    ...withId,
    ledger: [...withId.ledger, { id, day: addDays(today, -6), amount: 460, reason: "Past week of healthy days", kind: "task" }],
  };
}
