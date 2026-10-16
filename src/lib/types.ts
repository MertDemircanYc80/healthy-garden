// Shared types for Rooted. Every module talks in these shapes.
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
}

export type DataSource = "mock" | "file_import" | "aggregator" | "extension" | "manual";

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
  | "sunflower_seed"
  | "fruit_sapling"
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
