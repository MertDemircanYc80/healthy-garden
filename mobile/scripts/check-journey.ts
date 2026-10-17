import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initialGarden,
  createGardenStore,
  decodeGarden,
  GARDEN_STORAGE_KEY,
} from "../src/lib/savedGarden";
import {
  MONTH,
  emptyJourney,
  loadBaseline,
  preparedPlan,
  applyPlan,
  journeyGoals,
  observedDays,
  snapshot,
  finishDay,
  openNextDay,
  validatePlan,
} from "../src/demo/journey";
import { placePlant, waterPlants } from "../src/lib/gardenActions";
import { purchase } from "../src/lib/market";

async function main() {
  let state = initialGarden();
  assert.equal(state.sim.coins, 0);
  assert.deepEqual(state.sim.plants, []);
  assert.equal(state.sim.health, 0);
  assert.deepEqual(journeyGoals(state.journey), []);
  assert.deepEqual(observedDays(emptyJourney()), []);
  assert.deepEqual(state.sim.alerts, []);
  assert.notEqual(GARDEN_STORAGE_KEY, "healthgarden:game:v1");
  assert.equal(MONTH.length, 30);
  assert.equal(new Set(MONTH.map((d) => d.date)).size, 30);
  const raw = JSON.parse(
    readFileSync(
      new URL("../../datasets/pmdata-p01-month.json", import.meta.url),
      "utf8",
    ),
  );
  for (let i = 0; i < 30; i++)
    for (const key of [
      "steps",
      "sleep_minutes",
      "active_minutes",
      "sedentary_minutes",
    ])
      assert.equal(
        MONTH[i][key as keyof (typeof MONTH)[number]],
        raw.days[i][key],
      );
  console.log(
    "✓ empty start, isolated original save, and 30 real wearable days with explicit fictional additions",
  );
  state = loadBaseline(state);
  assert.equal(observedDays(state.journey).length, 7);
  assert.equal(state.journey.index, 6);
  assert.equal(journeyGoals(state.journey).length, 0);
  assert.equal(state.sim.coins, 70);
  state = applyPlan(state, preparedPlan(6));
  assert.equal(journeyGoals(state.journey).length, 4);
  assert.throws(() => applyPlan(state, preparedPlan(13)), /Finish the day/);
  const planBefore = JSON.stringify(state.journey.plans);
  state = openNextDay(state);
  assert.equal(state.journey.index, 7);
  assert.equal(state.journey.phase, "midday");
  assert.equal(snapshot(state.journey)!.sleep_minutes, MONTH[7].sleep_minutes);
  assert.equal(
    snapshot(state.journey)!.steps,
    Math.round(MONTH[7].steps! * 0.55),
  );
  assert.equal(observedDays(state.journey).length, 8);
  assert.equal(openNextDay(state), state);
  assert.equal(state.sim.coins, 70);
  assert.equal(state.journey.ledger.length, 0);
  assert.equal(JSON.stringify(state.journey.plans), planBefore);
  console.log(
    "✓ first-week cutoff, no future-day leak, partial snapshots, and no midday/retrospective rewards",
  );
  const midday = state;
  state = finishDay(state);
  const reward = state.sim.coins;
  assert.equal(reward, 130);
  assert.equal(state.journey.dailyRewards!.length, 8);
  assert.equal(state.journey.ledger[0].amount, 50);
  assert.equal(finishDay(state), state);
  assert.equal(state.journey.ledger.length, 1);
  assert.equal(state.journey.ledger[0].date, MONTH[7].date);
  state = placePlant(state, "flower", { col: 6, row: 4 }, true);
  let bought = purchase(state.sim.coins, state.inventory, "watering_can");
  state = {
    ...state,
    inventory: bought.inventory,
    sim: { ...state.sim, coins: bought.coins },
  };
  state = waterPlants(state, state.sim.plants[0].id);
  assert.equal(state.inventory.watering_can, 0);
  assert.throws(
    () => waterPlants(state, state.sim.plants[0].id),
    /already watered/,
  );
  state = openNextDay(state);
  assert.ok(
    state.sim.plants[0].growth > 0 || state.sim.plants[0].stage !== "seed",
  );
  assert.equal(state.sim.plants[0].wateredToday, false);
  console.log(
    "✓ end-of-day reward, buy → plant → refill → direct watering → overnight growth",
  );
  let persisted = JSON.stringify(midday);
  let fail = true;
  const storage = {
    getItem: async () => persisted,
    setItem: async (_key: string, value: string) => {
      if (fail) throw new Error("Disk full");
      persisted = value;
    },
  };
  const store = createGardenStore(storage);
  await assert.rejects(store.update(finishDay), /Disk full/);
  assert.equal((await store.load()).sim.coins, 70);
  fail = false;
  await Promise.all(Array.from({ length: 8 }, () => store.update(finishDay)));
  const restored = await createGardenStore(storage).load();
  assert.equal(restored.sim.coins, reward);
  assert.equal(restored.journey.ledger.length, 1);
  assert.equal(finishDay(restored), restored);
  console.log(
    "✓ concurrent and repeated payouts are idempotent, survive reload, and preserve state on storage errors",
  );
  const dailyHits: number[] = [];
  while (true) {
    state = finishDay(state);
    if ([13, 20, 27, 29].includes(state.journey.index))
      state = applyPlan(state, preparedPlan(state.journey.index));
    const last = state.journey.ledger.at(-1)!;
    dailyHits.push(last.goalsHit);
    if (state.journey.index === 29) break;
    if (state.sim.plants.length && state.sim.coins >= 5) {
      bought = purchase(state.sim.coins, state.inventory, "watering_can");
      state = {
        ...state,
        inventory: bought.inventory,
        sim: { ...state.sim, coins: bought.coins },
      };
      state = waterPlants(state, state.sim.plants[0].id);
    }
    state = openNextDay(state);
  }
  assert.equal(state.journey.ledger.length, 23);
  assert.equal(state.journey.settled.length, 23);
  assert.equal(new Set(state.journey.ledger.map((e) => e.id)).size, 23);
  assert.equal(state.journey.plans.length, 5);
  assert.equal(state.sim.plants[0].stage, "blooming");
  assert.equal(state.journey.ledger.at(-1)!.date, MONTH[29].date);
  assert.equal(openNextDay(state), state);
  assert.equal(finishDay(state), state);
  assert.ok(dailyHits.some((n) => n < 4));
  assert.ok(dailyHits.some((n) => n >= 2));
  assert.deepEqual(decodeGarden(JSON.stringify(state)), state);
  assert.throws(() =>
    validatePlan(
      {
        ...preparedPlan(6),
        goals: [{ ...preparedPlan(6).goals[0], reward: 999999 }],
      },
      6,
    ),
  );
  const bad = structuredClone(state);
  bad.journey.settled.push(bad.journey.settled[0]);
  assert.throws(() => decodeGarden(JSON.stringify(bad)));
  console.log(
    `✓ all 30 days, final-day payout, 5 analyses, real successes/misses and blooming garden (${state.sim.coins} gold left)`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
