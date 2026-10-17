import type { Plant, Species, Stage } from "@/types";
import type { ItemId } from "./market";
import type { SavedGarden } from "./savedGarden";

export class GardenActionError extends Error {}
export const PLANT_SPECIES: Partial<Record<ItemId, Species>> = {
  flower: "daisy", lavender: "lavender", sunflower: "sunflower", tree: "fruit_tree",
};
const STAGES: Stage[] = ["seed", "sprout", "young", "mature", "blooming"];

export function plantItem(state: SavedGarden, item: ItemId): SavedGarden {
  const species = PLANT_SPECIES[item];
  if (!species) throw new GardenActionError("Choose a flower or tree to plant.");
  if (state.inventory[item] < 1) throw new GardenActionError("None left to plant. Visit the Market.");
  const spot = Array.from({ length: 24 }, (_, i) => ({ col: i % 6, row: Math.floor(i / 6) }))
    .find(s => !state.sim.plants.some(p => p.col === s.col && p.row === s.row));
  if (!spot) throw new GardenActionError("Your garden is full.");
  const plant: Plant = { id: `plot-${spot.col}-${spot.row}`, ...spot, species, stage: "seed", growth: 0, wateredToday: false, resting: false };
  return { ...state, inventory: { ...state.inventory, [item]: state.inventory[item] - 1 }, sim: { ...state.sim, plants: [...state.sim.plants, plant] } };
}

/** One can per thirsty plant. Bulk watering stops when the available cans run out. */
export function waterPlants(state: SavedGarden, id?: string): SavedGarden {
  const targets = state.sim.plants.filter(p => (id === undefined || p.id === id) && !p.wateredToday);
  if (!targets.length) throw new GardenActionError(id ? "This plant is already watered or no longer in the garden." : "No plants need water.");
  const amount = Math.min(targets.length, state.inventory.watering_can);
  if (amount === 0) throw new GardenActionError("No watering cans left. Visit the Market.");
  const ids = new Set(targets.slice(0, amount).map(p => p.id));
  return {
    ...state,
    inventory: { ...state.inventory, watering_can: state.inventory.watering_can - amount },
    sim: { ...state.sim, plants: state.sim.plants.map(p => ids.has(p.id) ? { ...p, wateredToday: true, resting: false } : p) },
  };
}

/** One fertilizer advances half a growth stage; fully grown plants consume nothing. */
export function fertilizePlant(state: SavedGarden, id: string): SavedGarden {
  const plant = state.sim.plants.find(p => p.id === id);
  if (!plant) throw new GardenActionError("This plant is no longer in the garden.");
  if (plant.stage === "blooming") throw new GardenActionError("This plant is fully grown.");
  if (state.inventory.fertilizer < 1) throw new GardenActionError("No fertilizer left. Visit the Market.");
  const progress = plant.growth + 0.5;
  const stage = progress >= 1 ? STAGES[STAGES.indexOf(plant.stage) + 1] : plant.stage;
  const growth = stage === "blooming" ? 1 : progress >= 1 ? progress - 1 : progress;
  return { ...state, inventory: { ...state.inventory, fertilizer: state.inventory.fertilizer - 1 }, sim: { ...state.sim, plants: state.sim.plants.map(p => p.id === id ? { ...p, stage, growth } : p) } };
}
