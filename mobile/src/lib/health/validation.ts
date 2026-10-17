import type { HealthDayRow } from "./types";
export const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const limits: Record<string, number> = { steps: 200000, walking_running_km: 1000, active_energy_kcal: 100000, active_minutes: 1440, running_minutes: 1440, workout_minutes: 1440, sleep_minutes: 1440, daylight_minutes: 1440, screen_minutes: 1440, feed_minutes: 1440, long_sessions: 10000, driving_minutes: 1440 };
const nutritionKeys = ["energyKcal", "proteinG", "carbsG", "fatG", "waterMl"];
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const number = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
export function validateHealthRow(value: unknown): HealthDayRow {
  if (!object(value) || !validDate(value.date)) throw new Error("Invalid health date.");
  for (const [key, v] of Object.entries(value)) {
    if (key === "date") continue;
    if (!(Object.hasOwn(limits, key)) && !["source", "bedtime", "wake_time", "nutrition", "app_usage"].includes(key)) throw new Error("Unexpected health field.");
    if (v === undefined || v === null) continue;
    if (Object.hasOwn(limits, key) && (!number(v, limits[key]) || (key !== "walking_running_km" && !Number.isInteger(v)))) throw new Error(`Invalid ${key} value.`);
    if (["bedtime", "wake_time"].includes(key) && (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v))) throw new Error("Invalid health time.");
    if (key === "source" && !["healthkit", "manual", "shortcut", "demo"].includes(String(v))) throw new Error("Invalid health source.");
    if (key === "nutrition" && (!object(v) || Object.entries(v).some(([k, n]) => !nutritionKeys.includes(k) || !number(n, 100000)))) throw new Error("Invalid nutrition totals.");
    if (key === "app_usage" && (!object(v) || Object.keys(v).length > 100 || Object.entries(v).some(([k, n]) => !k.length || k.length > 100 || !number(n, 1440)))) throw new Error("Invalid app usage totals.");
  }
  return value as unknown as HealthDayRow;
}
