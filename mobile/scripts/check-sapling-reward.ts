import assert from "node:assert/strict";
import { initialPersonalGarden } from "../src/lib/dailyCycle";
import { createGardenStore, decodeGarden, type SavedGarden } from "../src/lib/savedGarden";
import { claimSaplingReward, saplingStatus, shiftDate, updateSaplingReward, type SaplingReward } from "../src/lib/saplingReward";
import { monday, reconcilePersonal } from "../src/lib/personalGoals";
import type { HealthDayRow } from "../src/lib/health/types";
import type { Goal } from "../src/types";

async function main() {
  const state: SavedGarden = { ...initialPersonalGarden(), calendarDate: "2026-10-31",
    personal: { startedOn: "2026-10-01", weeks: {}, rewarded: [] },
    sim: { ...initialPersonalGarden().sim, health: 0.8, plants: [{ id: "test", species: "daisy", stage: "seed", col: 0, row: 0, growth: 0, wateredToday: false, resting: false }] } };
  const results: SaplingReward["days"] = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [shiftDate("2026-10-01", i), { completed: i < 24 ? 1 : 0, total: 1 }]));
  const unlocked = updateSaplingReward(state, "2026-10-31", results);
  assert.equal(saplingStatus(unlocked, "2026-10-31").completion, 0.8);
  assert.equal(unlocked.saplingReward?.unlockedOn, "2026-10-31");
  assert.equal(updateSaplingReward(state, "2026-10-30", results).saplingReward?.unlockedOn, undefined);
  assert.equal(updateSaplingReward({ ...state, sim: { ...state.sim, health: 0.79 } }, "2026-10-31", results).saplingReward?.unlockedOn, undefined);
  assert.equal(updateSaplingReward({ ...state, sim: { ...state.sim, plants: [] } }, "2026-10-31", results).saplingReward?.unlockedOn, undefined);
  assert.equal(updateSaplingReward(state, "2026-10-31", { ...results, "2026-10-01": { completed: 0, total: 1 } }).saplingReward?.unlockedOn, undefined);
  assert.equal(updateSaplingReward(state, "2026-10-31", {}).saplingReward?.unlockedOn, undefined);
  const waitingForPlant = updateSaplingReward({ ...state, sim: { ...state.sim, plants: [] } }, "2026-10-31", results);
  assert.equal(updateSaplingReward({ ...waitingForPlant, sim: state.sim }, "2026-10-31", {}).saplingReward?.unlockedOn, "2026-10-31");
  const expired = updateSaplingReward({ ...state, saplingReward: { startedOn: "2026-09-01", days: { "2026-09-01": { completed: 1, total: 1 } } } }, "2026-10-31", {});
  assert.equal(saplingStatus(expired, "2026-10-31").total, 0);
  assert.equal(expired.saplingReward?.unlockedOn, undefined);
  assert.throws(() => claimSaplingReward(state, "2026-10-31"), /still locked/);
  assert.equal(updateSaplingReward(unlocked, "2027-01-01", {}), unlocked);
  assert.equal(decodeGarden(JSON.stringify(unlocked)).saplingReward?.unlockedOn, "2026-10-31");
  assert.equal(decodeGarden(JSON.stringify(state)).saplingReward, undefined);
  for (const reward of [
    { startedOn: "2026-10-01", days: {}, claimedOn: "2026-10-31" },
    { startedOn: "2026-10-01", days: {}, unlockedOn: "2026-10-30" },
    { startedOn: "2026-02-30", days: {} },
    { startedOn: "2026-10-01", days: { "2026-10-02": { completed: 2, total: 1 } } },
  ]) assert.throws(() => decodeGarden(JSON.stringify({ ...state, saplingReward: reward })));

  const goal: Goal = { id: "steps", title: "Walk", metric: "steps", target: 1000, current: 0, unit: "steps", direction: "at_least", reward: 20, reason: "Test", daysHit: 0, daysTotal: 7 };
  const weeks = Object.fromEntries(["2026-10-01", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"].map(startsOn => [monday(startsOn), { startsOn, goals: [goal] }]));
  const rows: HealthDayRow[] = Array.from({ length: 31 }, (_, i) => ({ date: shiftDate("2026-10-01", i), steps: i < 24 || i === 30 ? 1000 : 0, source: "manual" }));
  const planned = { ...state, personal: { ...state.personal!, weeks } };
  const evaluated = reconcilePersonal(planned, rows, "2026-10-31");
  assert.equal(saplingStatus(evaluated, "2026-10-31").total, 30);
  assert.equal(saplingStatus(evaluated, "2026-10-31").completed, 24);
  assert.equal(evaluated.saplingReward?.unlockedOn, "2026-10-31");
  assert.equal(reconcilePersonal(planned, rows.map(r => ({ ...r, source: "demo" })), "2026-10-31").saplingReward?.unlockedOn, undefined);
  const missing = reconcilePersonal(planned, rows.filter(r => r.date !== "2026-10-01"), "2026-10-31");
  assert.equal(saplingStatus(missing, "2026-10-31").total, 30);
  assert.equal(saplingStatus(missing, "2026-10-31").completed, 23);
  assert.equal(missing.saplingReward?.unlockedOn, undefined);

  const data = new Map<string, string>(); let fail = false;
  const storage = { getItem: async (k: string) => data.get(k) ?? null, setItem: async (k: string, v: string) => { if (fail) throw Error("disk"); data.set(k, v); } };
  const store = createGardenStore(storage);
  await store.update(() => missing);
  assert.deepEqual((await createGardenStore(storage).load()).saplingReward, missing.saplingReward);
  await store.update(() => unlocked);
  fail = true;
  await assert.rejects(store.update(s => claimSaplingReward(s, "2026-10-31")));
  assert.equal((await store.load()).saplingReward?.claimedOn, undefined);
  fail = false;
  const claims = await Promise.allSettled([store.update(s => claimSaplingReward(s, "2026-10-31")), store.update(s => claimSaplingReward(s, "2026-10-31"))]);
  assert.equal(claims.filter(r => r.status === "fulfilled").length, 1);
  const restored = createGardenStore(storage);
  assert.equal((await restored.load()).saplingReward?.claimedOn, "2026-10-31");
  const reset = await restored.reset();
  assert.equal(reset.saplingReward?.claimedOn, "2026-10-31");
  assert.equal(reset.sim.coins, 1000);
  await assert.rejects(restored.update(s => claimSaplingReward(s, "2026-11-01")), /already been claimed/);
  assert.equal(claimSaplingReward(unlocked, "2026-10-01").saplingReward?.claimedOn, "2026-10-31");
  const erased = { ...reset, saplingReward: { ...reset.saplingReward!, days: {} } };
  assert.equal(decodeGarden(JSON.stringify(erased)).saplingReward?.claimedOn, "2026-10-31");
  console.log("✓ sapling: 30-day/80%/health gates, missing and sample readings, save validation, persistent progress, permanent unlock, single claim, failed writes, reload and reset");
}
void main();
