import assert from "node:assert/strict";
import { applyTerminalCommand } from "../src/demo/terminal";
import { preparedPlan, observedDays, applyPlan } from "../src/demo/journey";
import {
  createGardenStore,
  decodeGarden,
  initialGarden,
} from "../src/lib/savedGarden";
import { placePlant, waterPlants } from "../src/lib/gardenActions";
import { purchase } from "../src/lib/market";
const week = (n: number, id = `w${n}`) => ({
  id,
  type: "week",
  week: n,
  plan: preparedPlan([6, 13, 20, 27, 29][n - 1]),
});
async function main() {
  let disk: string | null = null;
  let fail = false;
  const store = createGardenStore({
    getItem: async () => disk,
    setItem: async (_k, v) => {
      if (fail) throw new Error("disk full");
      disk = v;
    },
  });
  const execute = (c: unknown) =>
    store.update((s) => applyTerminalCommand(s, c));
  assert.throws(() => applyTerminalCommand(initialGarden(), week(2)), /first/);
  let state = await execute(week(1));
  assert.equal(state.journey.index, 6);
  assert.equal(state.sim.coins, 0);
  assert.equal(observedDays(state.journey).length, 7);
  const live = {
    ...preparedPlan(6),
    source: "live_ai" as const,
    provider: "gemini",
    model: "test",
    cached: false,
  };
  state = await store.update((s) => applyPlan(s, live));
  assert.equal(state.journey.plans.length, 1);
  assert.equal(state.journey.plans[0].source, "live_ai");
  await execute({ id: "open8", type: "next" });
  state = await execute({ id: "end8", type: "finish" });
  assert.equal(state.sim.coins, 25);
  const paid = state.sim.coins;
  await Promise.all(
    Array.from({ length: 8 }, () => execute({ id: "end8", type: "finish" })),
  );
  assert.equal((await store.load()).sim.coins, paid);
  state = await store.update((s) => {
    const bought = purchase(s.sim.coins, s.inventory, "watering_can");
    const planted = placePlant(
      {
        ...s,
        sim: { ...s.sim, coins: bought.coins },
        inventory: bought.inventory,
      },
      "flower",
      { col: 0, row: 0 },
      true,
    );
    return waterPlants(planted, planted.sim.plants[0].id);
  });
  const plantId = state.sim.plants[0].id;
  fail = true;
  await assert.rejects(execute(week(2)), /disk full/);
  assert.equal((await store.load()).journey.index, 7);
  fail = false;
  state = await execute(week(2));
  assert.equal(state.journey.index, 13);
  assert.equal(state.journey.ledger.length, 7);
  assert.equal(state.sim.plants[0].id, plantId);
  assert.equal(state.sim.plants[0].wateredToday, false);
  assert.equal(state.journey.plans.length, 2);
  const balance = state.sim.coins;
  state = await execute(week(2));
  assert.equal(state.sim.coins, balance);
  // A new command ID targeting the same week also must not replay or repay dates.
  state = await execute(week(2, "w2-repeat"));
  assert.equal(state.sim.coins, balance);
  const reloaded = createGardenStore({
    getItem: async () => disk,
    setItem: async (_k, v) => {
      disk = v;
    },
  });
  assert.equal(
    (await reloaded.update((s) => applyTerminalCommand(s, week(2)))).sim.coins,
    balance,
  );
  for (const n of [3, 4, 5]) state = await execute(week(n));
  assert.equal(state.journey.index, 29);
  assert.equal(observedDays(state.journey).length, 30);
  assert.equal(state.journey.ledger.length, 23);
  assert.equal(new Set(state.journey.settled).size, 23);
  assert.throws(
    () => applyTerminalCommand(state, week(1, "rewind")),
    /already past/,
  );
  state = await store.reset();
  assert.equal(state.journey.phase, "empty");
  state = await execute(week(1));
  assert.equal(state.journey.phase, "empty"); // UI reset doesn't reimport an old queue.
  state = await execute({ id: "reset1", type: "reset" });
  state = await execute(week(1, "new-recording"));
  assert.equal(state.journey.index, 6);
  assert.equal(
    decodeGarden(JSON.stringify(state)).terminal!.applied.includes(
      "new-recording",
    ),
    true,
  );
  console.log(
    "✓ terminal weeks → baseline/AI → day rewards → shopping/watering preserved → 30 days, atomic save failure, duplicate/reload safety and reset isolation",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
