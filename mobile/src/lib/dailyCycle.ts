import { localDay } from "./health/days";
import { initialGarden, type SavedGarden } from "./savedGarden";
import type { Stage } from "@/types";

export const DEMO_GARDEN_KEY = "healthgarden:demo:v1";
const STAGES: Stage[] = ["seed", "sprout", "young", "mature", "blooming"];
export function initialPersonalGarden(): SavedGarden {
  const s = initialGarden();
  return { ...s, calendarDate: localDay(new Date()), sim: { ...s.sim, streak: 0, health: 0, alerts: [] } };
}
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
/** A backwards clock cannot reopen care actions. Several missed days never multiply growth. */
export function rollGardenDay(state: SavedGarden, today: string): SavedGarden {
  if (!state.calendarDate) return { ...state, calendarDate: today, sim: { ...state.sim, alerts: [], streak: 0, health: 0 } };
  const elapsed = daysBetween(state.calendarDate, today);
  if (elapsed <= 0) return state;
  const plants = state.sim.plants.map(p => {
    let stage = p.stage;
    let growth = p.growth;
    if (p.wateredToday && stage !== "blooming") {
      growth += 0.35 + 0.65 * state.sim.health;
      if (growth >= 1) { stage = STAGES[Math.min(STAGES.length - 1, STAGES.indexOf(stage) + 1)]; growth = stage === "blooming" ? 1 : growth - 1; }
    }
    return { ...p, stage, growth, wateredToday: false, fertilizedToday: false, resting: !p.wateredToday || elapsed > 1 };
  });
  return { ...state, calendarDate: today, sim: { ...state.sim, plants, health: 0, streak: elapsed > 1 ? 0 : state.sim.streak } };
}
