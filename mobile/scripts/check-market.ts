import assert from "node:assert/strict";
import { purchase, emptyInventory } from "../src/lib/market";
import { createGardenStore, decodeGarden, GARDEN_STORAGE_KEY, initialGarden, type SavedGarden } from "../src/lib/savedGarden";
import { nextDay } from "../src/demo/simulation";

function memoryStorage(raw: string | null = null) {
  let saved = raw;
  let fail = false;
  return {
    getItem: async (key: string) => { assert.equal(key, GARDEN_STORAGE_KEY); return saved; },
    setItem: async (key: string, value: string) => { assert.equal(key, GARDEN_STORAGE_KEY); if (fail) throw new Error("Disk full"); saved = value; },
    failWrites(value: boolean) { fail = value; },
    raw: () => saved,
  };
}
function buy(state: SavedGarden): SavedGarden {
  const result = purchase(state.sim.coins, state.inventory, "flower");
  return { ...state, sim: { ...state.sim, coins: result.coins }, inventory: result.inventory };
}

async function main() {
  const inventory = emptyInventory();
  assert.deepEqual(purchase(20, inventory, "flower"), { coins: 0, inventory: { ...inventory, flower: 1 } });
  assert.equal(inventory.flower, 0);
  assert.throws(() => purchase(19, inventory, "flower"), /Not enough money/);
  console.log("✓ exact funds succeed, insufficient funds fail, input state is unchanged");

  const storage = memoryStorage();
  const store = createGardenStore(storage);
  assert.equal((await store.load()).sim.coins, 460);
  assert.equal(storage.raw(), null, "startup must not overwrite storage");
  const seen: number[] = [];
  const unsubscribe = store.subscribe(s => seen.push(s.sim.coins));
  await store.update(buy);
  await store.update(buy);
  assert.deepEqual(seen, [440, 420]);
  unsubscribe();
  const reopened = await createGardenStore(storage).load();
  assert.equal(reopened.sim.coins, 420);
  assert.equal(reopened.inventory.flower, 2);
  console.log("✓ purchases update subscribers and survive a new store instance");

  const small = initialGarden(); small.sim.coins = 60;
  const concurrent = createGardenStore(memoryStorage(JSON.stringify(small)));
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => concurrent.update(buy)));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 3);
  assert.equal((await concurrent.load()).sim.coins, 0);
  assert.equal((await concurrent.load()).inventory.flower, 3);
  assert.equal(decodeGarden(JSON.stringify(await concurrent.load())).sim.coins, 0);
  console.log("✓ rapid purchases serialize without overspending; zero balance restores correctly");

  storage.failWrites(true);
  await assert.rejects(store.update(buy), /Disk full/);
  assert.equal((await store.load()).sim.coins, 420);
  assert.equal((await store.load()).inventory.flower, 2);
  await assert.rejects(store.reset(), /Disk full/);
  storage.failWrites(false);
  await store.update(buy);
  assert.equal((await store.load()).sim.coins, 400);
  console.log("✓ failed saves and resets leave money/inventory intact; later transactions recover");

  await store.update(s => ({ ...s, sim: { ...nextDay(s.sim), health: s.sim.health } }));
  const afterDay = await createGardenStore(storage).load();
  assert.equal(afterDay.sim.offset, 1);
  assert.equal(afterDay.inventory.flower, 3);
  assert.equal(afterDay.sim.coins, (await store.load()).sim.coins);
  await Promise.all([store.update(buy), store.reset()]);
  assert.deepEqual(await createGardenStore(storage).load(), initialGarden());
  console.log("✓ daily rewards preserve inventory; ordered reset persists starting values");

  const corrupted = memoryStorage('{"version":1}');
  const broken = createGardenStore(corrupted);
  await assert.rejects(broken.load());
  assert.equal(corrupted.raw(), '{"version":1}');
  await broken.reset();
  assert.deepEqual(await broken.load(), initialGarden());
  const invalid = initialGarden(); invalid.inventory.tree = -1;
  assert.throws(() => decodeGarden(JSON.stringify(invalid)));
  assert.throws(() => decodeGarden("not json"));
  console.log("✓ corrupt saves are preserved until explicit reset; invalid counts are rejected");
  console.log("All market checks passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
