import assert from "node:assert/strict";
import { initialGarden, createGardenStore } from "../src/lib/savedGarden";
import {
  startObservation,
  finishDay,
  openNextDay,
  loadBaseline,
  preparedPlan,
  applyPlan,
  syncDailyGold,
  journeyGoals,
} from "../src/demo/journey";
async function main() {
  let state = startObservation(initialGarden());
  assert.equal(state.sim.coins, 0);
  state = finishDay(state);
  assert.equal(state.sim.coins, 10);
  assert.equal(state.journey.ledger.length, 0);
  assert.equal(finishDay(state), state);
  for (let i = 1; i < 7; i++) {
    state = openNextDay(state);
    assert.equal(state.sim.coins, i * 10);
    state = finishDay(state);
    assert.equal(state.sim.coins, (i + 1) * 10);
  }
  assert.equal(openNextDay(state), state); // Observe seven days before setting goals.
  state = applyPlan(state, preparedPlan(6));
  assert.equal(
    journeyGoals(state.journey)[0].reward,
    preparedPlan(6).goals[0].reward * 2,
  );
  state = finishDay(openNextDay(state));
  assert.equal(state.sim.coins, 130);
  assert.equal(state.journey.dailyRewards!.length, 8);
  const fast = loadBaseline(initialGarden());
  assert.equal(fast.sim.coins, 70);
  assert.equal(syncDailyGold(fast), fast);
  // Existing wallet purchases and goal receipts are preserved during a daily-gold upgrade.
  const legacy = {
    ...fast,
    sim: { ...fast.sim, coins: 17 },
    journey: { ...fast.journey, dailyRewards: undefined },
  };
  let disk = JSON.stringify(legacy),
    writes = 0;
  const storage = {
    getItem: async () => disk,
    setItem: async (_k: string, v: string) => {
      disk = v;
      writes++;
    },
  };
  const upgraded = await createGardenStore(storage).load();
  assert.equal(upgraded.sim.coins, 87);
  assert.equal(writes, 1);
  assert.equal((await createGardenStore(storage).load()).sim.coins, 87);
  assert.equal(writes, 1);
  const failing = createGardenStore({
    ...storage,
    getItem: async () => JSON.stringify(legacy),
    setItem: async () => {
      throw new Error("disk full");
    },
  });
  await assert.rejects(failing.load(), /disk full/);
  assert.equal(JSON.parse(disk).sim.coins, 87);
  console.log(
    "✓ daily observation gold from day 1, 70-gold baseline, doubled goal rewards, no midday/duplicate payout, safe old-save upgrade",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
