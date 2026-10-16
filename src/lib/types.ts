// Shared types for Healthy Garden. Every module talks in these shapes.
// Changing a type here affects everyone — announce it in the team chat first.

/** The ONE standard internal format every data adapter must produce (plan §8.1). */
export interface DailySummary {
  date: string; // YYYY-MM-DD (user's local date)
  steps: number;
  sleepMinutes: number;
  bedtime: string | null; // "HH:MM" 24h, local time
  wakeTime: string | null; // "HH:MM" 24h, local time
  activeMinutes: number;
  scrollMinutes: number; // total time on "feed" apps/sites (plan §8.2)
  longSessions: number; // feed sessions longer than 10 minutes
  source: DataSource;

  // ---- Extended metrics (optional: each source fills what it has; see src/lib/data/) ----
  walkingRunningKm?: number;
  runningMinutes?: number; // from running workouts
  workoutMinutes?: number; // all workouts
  activeEnergyKcal?: number;
  outdoorMinutes?: number; // Apple "Time in Daylight"
  drivingMinutes?: number; // from driving start/end events (Shortcuts: Driving Focus / CarPlay)
  appUsage?: Record<string, number>; // app name → minutes (feed apps the user selected)
  nutrition?: Nutrition; // only when the user logs food into Apple Health (e.g. a food-logging app)
}

export interface Nutrition {
  energyKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  waterMl?: number;
}

export type DataSource =
  | "mock"
  | "file_import" // generic CSV
  | "apple_health" // Apple Health export.zip uploaded in the app
  | "shortcut" // iOS Shortcuts posting to /api/ingest
  | "aggregator"
  | "extension"
  | "manual";

export type TaskKey =
  | "first_steps"
  | "active_day"
  | "strong_day"
  | "good_sleep"
  | "sleep_consistency"
  | "doomscroll_down"
  | "offline_hour";

export interface TaskDefinition {
  key: TaskKey;
  title: string;
  description: string;
  reward: number; // coins
}

export interface TaskProgress extends TaskDefinition {
  progress: number; // 0..1
  completed: boolean;
  label: string; // e.g. "3,420 / 5,000 steps"
}

export type ItemType = "flower" | "tree" | "tool" | "consumable";
export type ShopItemId =
  | "daisy_seed"
  | "marigold_seed"
  | "lavender_seed"
  | "tulip_bulb"
  | "sunflower_seed"
  | "rose_bush"
  | "fruit_sapling"
  | "cherry_sapling"
  | "oak_sapling"
  | "watering_can"
  | "fertilizer";

export interface ShopItem {
  id: ShopItemId;
  name: string;
  type: ItemType;
  price: number;
  growthDays: number | null; // days of care to reach the final stage; null for tools
  emoji: string; // placeholder art until sprites exist
}

export const GROWTH_STAGES = ["seed", "sprout", "young", "mature", "blooming"] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

export interface GardenPlant {
  id: string;
  itemId: ShopItemId;
  gridX: number;
  gridY: number;
  growthPoints: number; // 1 point = 1 full day of care
  stage: GrowthStage;
  isDormant: boolean;
  wateredToday: boolean;
  fertilizedUntil: string | null; // ISO timestamp
  plantedAt: string; // ISO timestamp
}

export interface WalletTransaction {
  id: string;
  amount: number; // positive = earned, negative = spent
  reason: string;
  createdAt: string;
}
