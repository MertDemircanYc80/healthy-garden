import assert from "node:assert/strict";
import { purchase, emptyInventory } from "../src/lib/market";
import { createGardenStore, decodeGarden, GARDEN_STORAGE_KEY, initialGarden, type SavedGarden } from "../src/lib/savedGarden";
import { plantItem, waterPlants, fertilizePlant } from "../src/lib/gardenActions";
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
  assert.equal((await store.load()).sim.coins, 100);
  assert.equal(storage.raw(), null, "startup must not overwrite storage");
  const seen: number[] = [];
  const unsubscribe = store.subscribe(s => seen.push(s.sim.coins));
  await store.update(buy);
  await store.update(buy);
  assert.deepEqual(seen, [80, 60]);
  unsubscribe();
  const reopened = await createGardenStore(storage).load();
  assert.equal(reopened.sim.coins, 60);
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
  assert.equal((await store.load()).sim.coins, 60);
  assert.equal((await store.load()).inventory.flower, 2);
  await assert.rejects(store.reset(), /Disk full/);
  storage.failWrites(false);
  await store.update(buy);
  assert.equal((await store.load()).sim.coins, 40);
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
  assert.deepEqual(initialGarden().sim.plants, []);
  assert.deepEqual(initialGarden().inventory, emptyInventory());
  const garden = initialGarden();
  assert.throws(() => plantItem(garden, "flower"), /None left/);
  garden.inventory = { ...emptyInventory(), flower: 2, tree: 1, watering_can: 1, fertilizer: 1 };
  const first = plantItem(garden, "flower");
  assert.equal(garden.inventory.flower, 2, "actions must not mutate their input");
  assert.equal(first.inventory.flower, 1);
  const planted = plantItem(plantItem(first, "tree"), "flower");
  assert.equal(planted.sim.plants.length, 3);
  assert.equal(new Set(planted.sim.plants.map(p => `${p.col},${p.row}`)).size, 3);
  assert.equal(planted.inventory.tree, 0);
  assert.equal(planted.inventory.flower, 0);
  assert.equal(planted.sim.plants[1].species, "fruit_tree");
  assert.throws(() => plantItem(planted, "tree"), /None left/);
  const watered = waterPlants(planted);
  assert.equal(watered.inventory.watering_can, 0);
  assert.equal(watered.sim.plants.filter(p => p.wateredToday).length, 1);
  assert.equal(planted.inventory.watering_can, 1);
  assert.throws(() => waterPlants(watered), /No watering cans/);
  assert.throws(() => waterPlants(watered, watered.sim.plants[0].id), /already watered/);
  assert.throws(() => waterPlants(watered, "missing"), /no longer/);
  const fertile = fertilizePlant(watered, watered.sim.plants[0].id);
  assert.equal(fertile.inventory.fertilizer, 0);
  assert.equal(fertile.sim.plants[0].growth, 0.5);
  assert.throws(() => fertilizePlant(fertile, fertile.sim.plants[0].id), /No fertilizer/);
  const blooming = { ...fertile, inventory: { ...fertile.inventory, fertilizer: 1 }, sim: { ...fertile.sim, plants: fertile.sim.plants.map(p => ({ ...p, stage: "blooming" as const })) } };
  assert.throws(() => fertilizePlant(blooming, blooming.sim.plants[0].id), /fully grown/);
  const almostGrown = { ...blooming, sim: { ...blooming.sim, plants: [{ ...blooming.sim.plants[0], stage: "mature" as const, growth: 0.75 }] } };
  assert.equal(fertilizePlant(almostGrown, almostGrown.sim.plants[0].id).sim.plants[0].stage, "blooming");
  let full = initialGarden(); full.inventory.tree = 25;
  for (let i = 0; i < 24; i++) full = plantItem(full, "tree");
  assert.throws(() => plantItem(full, "tree"), /full/);
  assert.equal(full.inventory.tree, 1);
  console.log("✓ empty defaults, planting, limited watering, fertilizer, and full gardens enforce owned quantities");

  const suppliesStorage = memoryStorage(JSON.stringify(planted));
  const suppliesStore = createGardenStore(suppliesStorage);
  suppliesStorage.failWrites(true);
  await assert.rejects(suppliesStore.update(s => waterPlants(s)), /Disk full/);
  assert.equal((await suppliesStore.load()).inventory.watering_can, 1);
  assert.equal((await suppliesStore.load()).sim.plants.filter(p => p.wateredToday).length, 0);
  suppliesStorage.failWrites(false);
  const uses = await Promise.allSettled(Array.from({ length: 8 }, () => suppliesStore.update(s => waterPlants(s))));
  assert.equal(uses.filter(r => r.status === "fulfilled").length, 1);
  await suppliesStore.update(s => fertilizePlant(s, s.sim.plants[0].id));
  const restored = await createGardenStore(suppliesStorage).load();
  assert.equal(restored.inventory.watering_can, 0);
  assert.equal(restored.inventory.fertilizer, 0);
  assert.equal(restored.sim.plants.filter(p => p.wateredToday).length, 1);
  assert.equal(restored.sim.plants[0].growth, 0.5);
  const next = nextDay(restored.sim);
  assert.equal(next.plants.filter(p => p.wateredToday).length, 0);
  assert.throws(() => waterPlants({ ...restored, sim: { ...next, health: restored.sim.health } }), /No watering cans/);
  const extra = { ...planted, inventory: { ...planted.inventory, watering_can: 5 } };
  assert.equal(waterPlants(extra).inventory.watering_can, 2, "spend only for thirsty plants");
  const plantingStorage = memoryStorage(JSON.stringify(first));
  const plantingStore = createGardenStore(plantingStorage);
  const attempts = await Promise.allSettled(Array.from({ length: 5 }, () => plantingStore.update(s => plantItem(s, "tree"))));
  assert.equal(attempts.filter(r => r.status === "fulfilled").length, 1);
  assert.equal((await createGardenStore(plantingStorage).load()).inventory.tree, 0);
  console.log("✓ concurrent use cannot overspend; failed writes preserve supplies and reload restores used counts");
  console.log("All market checks passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
