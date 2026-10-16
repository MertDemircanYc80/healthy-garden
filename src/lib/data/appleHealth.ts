// Streaming parser for Apple Health's export.xml (Health app → profile → Export All Health Data).
// The file can be hundreds of MB, so it is fed in text chunks and only the record types we
// use, from the last N days, are kept. Pure TS: runs in a Web Worker or in Node for tests.
import { fromAppleDate, type HealthSample, type SampleType, type WorkoutType } from "./samples";

const QUANTITY: Record<string, SampleType> = {
  HKQuantityTypeIdentifierStepCount: "steps",
  HKQuantityTypeIdentifierDistanceWalkingRunning: "distance_walk_run_km",
  HKQuantityTypeIdentifierActiveEnergyBurned: "active_energy_kcal",
  HKQuantityTypeIdentifierAppleExerciseTime: "exercise_minutes",
  HKQuantityTypeIdentifierTimeInDaylight: "daylight_minutes",
  HKQuantityTypeIdentifierDietaryEnergyConsumed: "dietary_energy_kcal",
  HKQuantityTypeIdentifierDietaryProtein: "protein_g",
  HKQuantityTypeIdentifierDietaryCarbohydrates: "carbs_g",
  HKQuantityTypeIdentifierDietaryFatTotal: "fat_g",
  HKQuantityTypeIdentifierDietaryWater: "water_ml",
};

const WORKOUTS: Record<string, WorkoutType> = {
  HKWorkoutActivityTypeRunning: "running",
  HKWorkoutActivityTypeWalking: "walking",
  HKWorkoutActivityTypeCycling: "cycling",
  HKWorkoutActivityTypeHiking: "hiking",
  HKWorkoutActivityTypeSwimming: "swimming",
};

/** Convert to our canonical unit for the sample type. Returns null for unknown units. */
function normalize(type: SampleType, value: number, unit: string): number | null {
  switch (type) {
    case "distance_walk_run_km":
      return unit === "km" ? value : unit === "mi" ? value * 1.609344 : unit === "m" ? value / 1000 : null;
    case "active_energy_kcal":
    case "dietary_energy_kcal":
      return unit === "kcal" || unit === "Cal" ? value : unit === "kJ" ? value / 4.184 : null;
    case "water_ml":
      return unit === "mL" ? value : unit === "L" ? value * 1000 : unit === "fl_oz_us" ? value * 29.5735 : null;
    default:
      return value; // count, min, g
  }
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

export interface ParseStats {
  recordsSeen: number;
  samplesKept: number;
  firstDay: string | null;
  lastDay: string | null;
}

export class AppleHealthParser {
  private buffer = "";
  readonly samples: HealthSample[] = [];
  readonly stats: ParseStats = { recordsSeen: 0, samplesKept: 0, firstDay: null, lastDay: null };

  /** @param sinceDay keep only samples starting on/after this local day (YYYY-MM-DD) */
  constructor(private readonly sinceDay: string) {}

  feed(text: string) {
    this.buffer += text;
    const cut = this.buffer.lastIndexOf(">");
    if (cut < 0) return;
    const complete = this.buffer.slice(0, cut + 1);
    this.buffer = this.buffer.slice(cut + 1);
    for (const m of complete.matchAll(/<(Record|Workout)\s[^>]*>/g)) this.handle(m[1], m[0]);
  }

  finish(): HealthSample[] {
    this.feed(">"); // flush
    return this.samples;
  }

  private keep(s: HealthSample) {
    const day = s.start.slice(0, 10);
    if (day < this.sinceDay) return;
    this.samples.push(s);
    this.stats.samplesKept++;
    if (!this.stats.firstDay || day < this.stats.firstDay) this.stats.firstDay = day;
    if (!this.stats.lastDay || day > this.stats.lastDay) this.stats.lastDay = day;
  }

  private handle(kind: string, tag: string) {
    this.stats.recordsSeen++;
    // Cheap pre-filter before parsing every attribute.
    const typeMatch = /(?:type|workoutActivityType)="([^"]+)"/.exec(tag);
    if (!typeMatch) return;
    const hkType = typeMatch[1];

    if (kind === "Workout") {
      const a = attrs(tag);
      const start = fromAppleDate(a.startDate ?? "");
      const end = fromAppleDate(a.endDate ?? "");
      let minutes = Number(a.duration);
      if (!Number.isFinite(minutes) || a.durationUnit !== "min") {
        minutes = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
      }
      if (!Number.isFinite(minutes) || minutes <= 0) return;
      this.keep({ type: "workout", start, end, value: minutes, workoutType: WORKOUTS[hkType] ?? "other", source: decode(a.sourceName ?? "") });
      return;
    }

    if (hkType === "HKCategoryTypeIdentifierSleepAnalysis") {
      const a = attrs(tag);
      const v = a.value ?? "";
      const type: SampleType | null = v.includes("InBed") ? "sleep_in_bed" : v.includes("Asleep") ? "sleep_asleep" : null;
      if (!type) return; // Awake
      this.keep({ type, start: fromAppleDate(a.startDate), end: fromAppleDate(a.endDate), value: 0, source: decode(a.sourceName ?? "") });
      return;
    }

    const type = QUANTITY[hkType];
    if (!type) return;
    const a = attrs(tag);
    const value = normalize(type, Number(a.value), a.unit ?? "");
    if (value === null || !Number.isFinite(value)) return;
    this.keep({ type, start: fromAppleDate(a.startDate), end: fromAppleDate(a.endDate), value, source: decode(a.sourceName ?? "") });
  }
}
