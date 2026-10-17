// Apple Health (HealthKit) reader. Works only in a development/production build on an iPhone —
// Expo Go doesn't contain the HealthKit module, so we never even load it there.
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { buildRows, daysBack, sleepByDay, totalsByDay, workoutsByDay, type SleepSample, type WorkoutLite } from "./days";
import type { HealthDayRow } from "./types";

type HK = typeof import("@kingstinct/react-native-healthkit");

export type Availability = "ok" | "expo_go" | "not_ios" | "no_healthkit";

let hk: HK | null = null;

export function availability(): Availability {
  if (Platform.OS !== "ios") return "not_ios";
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return "expo_go";
  try {
    hk ??= require("@kingstinct/react-native-healthkit") as HK;
    return hk.isHealthDataAvailable() ? "ok" : "no_healthkit";
  } catch {
    return "no_healthkit";
  }
}

function lib(): HK {
  if (availability() !== "ok" || !hk) throw new Error("Apple Health isn't available on this device.");
  return hk;
}

const QUANTITIES = {
  steps: { id: "HKQuantityTypeIdentifierStepCount", unit: "count" },
  distanceKm: { id: "HKQuantityTypeIdentifierDistanceWalkingRunning", unit: "km" },
  activeKcal: { id: "HKQuantityTypeIdentifierActiveEnergyBurned", unit: "kcal" },
  exerciseMin: { id: "HKQuantityTypeIdentifierAppleExerciseTime", unit: "min" },
  daylightMin: { id: "HKQuantityTypeIdentifierTimeInDaylight", unit: "min" }, // iOS 17+
  energyKcal: { id: "HKQuantityTypeIdentifierDietaryEnergyConsumed", unit: "kcal" },
  proteinG: { id: "HKQuantityTypeIdentifierDietaryProtein", unit: "g" },
  carbsG: { id: "HKQuantityTypeIdentifierDietaryCarbohydrates", unit: "g" },
  fatG: { id: "HKQuantityTypeIdentifierDietaryFatTotal", unit: "g" },
  waterMl: { id: "HKQuantityTypeIdentifierDietaryWater", unit: "mL" },
} as const;

const SLEEP = "HKCategoryTypeIdentifierSleepAnalysis";
const WORKOUT = "HKWorkoutTypeIdentifier";
const RUNNING = 37; // WorkoutActivityType.running

/** Shows Apple's permission sheet (only the first time; later calls return immediately). */
export async function connect(): Promise<boolean> {
  const h = lib();
  const toRead = [...Object.values(QUANTITIES).map((q) => q.id), SLEEP, WORKOUT];
  // Apple never tells apps which types were refused — unreadable types simply return no data.
  return h.requestAuthorization({ toRead: toRead as never });
}

async function dailyTotals(key: keyof typeof QUANTITIES, from: Date, to: Date, round?: (v: number) => number) {
  const h = lib();
  const { id, unit } = QUANTITIES[key];
  try {
    const buckets = await h.queryStatisticsCollectionForQuantity(id as never, ["cumulativeSum"], from, { day: 1 }, {
      filter: { date: { startDate: from, endDate: to } },
      unit: unit as never,
    });
    return totalsByDay(
      buckets.filter((b) => b.startDate && b.sumQuantity).map((b) => ({ start: b.startDate as Date, value: b.sumQuantity!.quantity })),
      round,
    );
  } catch {
    return {}; // type not supported on this iOS version or not permitted
  }
}

/** Read the last `days` days from Apple Health as health_days rows. */
export async function readDays(days = 14, now = new Date()): Promise<HealthDayRow[]> {
  const h = lib();
  const from = daysBack(days - 1, now);
  // sleep that ended this morning started yesterday evening — look back one extra day
  const sleepFrom = daysBack(days, now);
  const r1 = (v: number) => Math.round(v * 100) / 100;

  const [steps, distanceKm, activeKcal, exerciseMin, daylightMin, energyKcal, proteinG, carbsG, fatG, waterMl] = await Promise.all([
    dailyTotals("steps", from, now),
    dailyTotals("distanceKm", from, now, r1),
    dailyTotals("activeKcal", from, now),
    dailyTotals("exerciseMin", from, now),
    dailyTotals("daylightMin", from, now),
    dailyTotals("energyKcal", from, now),
    dailyTotals("proteinG", from, now),
    dailyTotals("carbsG", from, now),
    dailyTotals("fatG", from, now),
    dailyTotals("waterMl", from, now),
  ]);

  let sleep: SleepSample[] = [];
  try {
    const s = await h.queryCategorySamples(SLEEP as never, { limit: 0, filter: { date: { startDate: sleepFrom, endDate: now } } });
    sleep = s.map((x) => ({ start: new Date(x.startDate), end: new Date(x.endDate), value: Number(x.value) }));
  } catch {
    /* no sleep permission */
  }

  let workouts: WorkoutLite[] = [];
  try {
    const ws = await h.queryWorkoutSamples({ limit: 0, filter: { date: { startDate: from, endDate: now } } });
    workouts = ws.map((w) => {
      const start = new Date(w.startDate);
      const minutes = (new Date(w.endDate).getTime() - start.getTime()) / 60000;
      const item = { start, minutes, running: Number(w.workoutActivityType) === RUNNING };
      w.dispose?.();
      return item;
    });
  } catch {
    /* no workout permission */
  }

  return buildRows(from, now, {
    steps,
    distanceKm,
    activeKcal,
    exerciseMin,
    daylightMin,
    sleep: sleepByDay(sleep),
    workouts: workoutsByDay(workouts),
    nutrition: { energyKcal, proteinG, carbsG, fatG, waterMl },
  });
}

/**
 * Wake the app when Apple Health gets new steps / sleep / workouts (also in the background,
 * thanks to the config plugin's `background: true`). Returns a cleanup function.
 */
export async function watchChanges(onChange: () => void): Promise<() => void> {
  const h = lib();
  const ids = [QUANTITIES.steps.id, SLEEP, WORKOUT, QUANTITIES.energyKcal.id];
  for (const id of ids) {
    try {
      await h.enableBackgroundDelivery(id as never, h.UpdateFrequency.hourly);
    } catch {
      /* background delivery not permitted for this type */
    }
  }
  const subs = ids.map((id) => h.subscribeToChanges(id as never, () => onChange()));
  return () => subs.forEach((s) => s.remove());
}
