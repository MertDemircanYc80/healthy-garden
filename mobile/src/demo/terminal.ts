import {
  applyPlan,
  startObservation,
  finishDay,
  latestPlan,
  loadBaseline,
  openNextDay,
  validatePlan,
} from "./journey";
import { initialGarden, type SavedGarden } from "@/lib/savedGarden";
export type TerminalCommand = {
  id: string;
  type: "week" | "next" | "finish" | "reset" | "start";
  week?: number;
  plan?: unknown;
};
/** One atomic save contains replayed days, rewards and the command receipt. */
export function applyTerminalCommand(
  state: SavedGarden,
  value: unknown,
): SavedGarden {
  const c = value as TerminalCommand | null;
  if (
    !c ||
    typeof c.id !== "string" ||
    c.id.length > 100 ||
    !["week", "next", "finish", "reset", "start"].includes(c.type)
  )
    throw new Error("Invalid terminal command.");
  const applied = state.terminal?.applied ?? [];
  if (applied.includes(c.id)) return state;
  let next = state;
  if (c.type === "start") next = startObservation(state);
  if (c.type === "reset") next = initialGarden();
  if (c.type === "next") {
    next = openNextDay(state);
    if (next === state)
      throw new Error(
        "Finish today and load a weekly plan before opening tomorrow.",
      );
  }
  if (c.type === "finish") {
    next = finishDay(state);
    if (next === state && state.journey.phase !== "complete")
      throw new Error("Open a day before finishing it.");
  }
  if (c.type === "week") {
    if (!Number.isInteger(c.week) || c.week! < 1 || c.week! > 5)
      throw new Error("Choose week 1–5.");
    const through = [6, 13, 20, 27, 29][c.week! - 1];
    const plan = validatePlan(c.plan, through);
    if (state.journey.index > through)
      throw new Error(
        "This week is already past. Use the next week or reset for a new recording.",
      );
    if (c.week === 1) next = loadBaseline(next);
    else if (
      next.journey.index < [6, 13, 20, 27][c.week! - 2] ||
      !latestPlan(next.journey)
    )
      throw new Error(`Import week ${c.week! - 1} first.`);
    // Do not apply the NEW plan to past days: settle with each day's existing plan first.
    while (next.journey.index < through || next.journey.phase === "midday") {
      const before = next;
      if (next.journey.phase === "midday") next = finishDay(next);
      else if (next.journey.index < through) next = openNextDay(next);
      if (next === before)
        throw new Error(
          "Cannot advance this replay. Load the preceding weekly plan.",
        );
    }
    next = applyPlan(next, plan);
  }
  return { ...next, terminal: { applied: [...applied, c.id].slice(-1000) } };
}
