// Jury replay economy. Model rewards stay unchanged in the saved plan.
export const DAILY_GOLD = 10;
export const GOAL_GOLD_MULTIPLIER = 2;
export const goalGold = (base: number) => base * GOAL_GOLD_MULTIPLIER;
