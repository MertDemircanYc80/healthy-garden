import type { Plant, Species, Stage } from "@/types";
import { purchase, type ItemId } from "./market";
import { GARDEN_PLOTS, GARDEN_SIZE, type GardenPlot } from "./gardenPlots";
import type { SavedGarden } from "./savedGarden";

export class GardenActionError extends Error {}
export const PLANT_SPECIES: Partial<Record<ItemId, Species>> = {
  flower: "daisy", lavender: "lavender", sunflower: "sunflower", tree: "fruit_tree",
};
const STAGES: Stage[] = ["seed", "sprout", "young", "mature", "blooming"];

export function plantItem(state: SavedGarden, item: ItemId, requestedPlot?: GardenPlot): SavedGarden {
  const species = PLANT_SPECIES[item];
  if (!species) throw new GardenActionError("Choose a flower or tree to plant.");
  if (state.inventory[item] < 1) throw new GardenActionError("None left to plant. Visit the Market.");
  if (requestedPlot && (!Number.isInteger(requestedPlot.col) || !Number.isInteger(requestedPlot.row) ||
    requestedPlot.col < 0 || requestedPlot.col >= GARDEN_SIZE.cols || requestedPlot.row < 0 || requestedPlot.row >= GARDEN_SIZE.rows)) {
    throw new GardenActionError("Choose a valid garden plot.");
  }
  const spot = requestedPlot ?? GARDEN_PLOTS.find(s => !state.sim.plants.some(p => p.col === s.col && p.row === s.row));
  if (!spot) throw new GardenActionError("Your garden is full.");
  if (state.sim.plants.some(p => p.col === spot.col && p.row === spot.row)) throw new GardenActionError("That plot is already planted. Choose an empty plot.");
  const plant: Plant = { id: `plot-${spot.col}-${spot.row}`, ...spot, species, stage: "seed", growth: 0, wateredToday: false, fertilizedToday: false, resting: false };
  return { ...state, inventory: { ...state.inventory, [item]: state.inventory[item] - 1 }, sim: { ...state.sim, plants: [...state.sim.plants, plant] } };
}

/** A single saved transaction: buy only if requested and unowned, then plant in the chosen plot. */
export function placePlant(state: SavedGarden, item: ItemId, plot: GardenPlot, buyIfNeeded: boolean): SavedGarden {
  let prepared = state;
  if (buyIfNeeded && state.inventory[item] === 0) {
    try {
      const bought = purchase(state.sim.coins, state.inventory, item);
      prepared = { ...state, sim: { ...state.sim, coins: bought.coins }, inventory: bought.inventory };
    } catch (error) {
      throw new GardenActionError(error instanceof Error ? error.message : "Couldn’t buy this plant.");
    }
  }
  return plantItem(prepared, item, plot);
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

/** One fertilizer per plant per garden day; fully grown plants consume nothing. */
export function fertilizePlant(state: SavedGarden, id: string): SavedGarden {
  const plant = state.sim.plants.find(p => p.id === id);
  if (!plant) throw new GardenActionError("This plant is no longer in the garden.");
  if (plant.stage === "blooming") throw new GardenActionError("This plant is fully grown.");
  if (plant.fertilizedToday) throw new GardenActionError("This plant was already fertilized today.");
  if (state.inventory.fertilizer < 1) throw new GardenActionError("No fertilizer left. Visit the Market.");
  const progress = plant.growth + 0.5;
  const stage = progress >= 1 ? STAGES[STAGES.indexOf(plant.stage) + 1] : plant.stage;
  const growth = stage === "blooming" ? 1 : progress >= 1 ? progress - 1 : progress;
  return { ...state, inventory: { ...state.inventory, fertilizer: state.inventory.fertilizer - 1 }, sim: { ...state.sim, plants: state.sim.plants.map(p => p.id === id ? { ...p, stage, growth, fertilizedToday: true } : p) } };
}
