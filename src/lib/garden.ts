// Garden engine (plan §7.3): pure functions, no DB access.
// Rules: watering + sunlight => growth. Fertilizer doubles growth for 24h.
// Plants NEVER die — skipped days make them dormant, and they recover on return.
import { SHOP_ITEMS } from "./economy";
import { GROWTH_STAGES, type GardenPlant, type GrowthStage } from "./types";

export function stageFor(growthPoints: number, growthDays: number): GrowthStage {
  const last = GROWTH_STAGES.length - 1;
  const idx = Math.min(last, Math.floor((growthPoints / growthDays) * last));
  return GROWTH_STAGES[idx];
}

/**
 * Advance one plant by one day. Call once per day per plant
 * (or N times for the "skip a day" demo control).
 * @param sunlight 0..1 from sunlightFor()
 * @param now used for fertilizer expiry
 */
export function advanceDay(plant: GardenPlant, sunlight: number, now: Date = new Date()): GardenPlant {
  const item = SHOP_ITEMS.find((i) => i.id === plant.itemId);
  if (!item?.growthDays) return plant;

  const cared = plant.wateredToday && sunlight > 0;
  if (!cared) {
    // Neglect => dormant, never dead. Growth is kept.
    return { ...plant, isDormant: true, wateredToday: false };
  }

  const fertilized = plant.fertilizedUntil !== null && new Date(plant.fertilizedUntil) > now;
  const gain = sunlight * (fertilized ? 2 : 1);
  const growthPoints = Math.min(item.growthDays, plant.growthPoints + gain);

  return {
    ...plant,
    growthPoints,
    stage: stageFor(growthPoints, item.growthDays),
    isDormant: false,
    wateredToday: false, // resets for the next day
  };
}

/** 7-day rolling garden health (plan §7.3): average task-completion ratio, 0..1. */
export function gardenHealth(dailyCompletionRatios: number[]): number {
  const last7 = dailyCompletionRatios.slice(-7);
  if (last7.length === 0) return 0;
  return last7.reduce((a, b) => a + b, 0) / last7.length;
}
