// Game economy constants (plan §7). Starting values — tune during testing.
// Keep ALL magic numbers here so the economy can be balanced in one place.
import type { ShopItem, TaskDefinition } from "./types";

export const TASKS: TaskDefinition[] = [
  { key: "first_steps", title: "First steps", description: "Walk 1,000 steps", reward: 10 },
  { key: "active_day", title: "Active day", description: "Walk 5,000 steps", reward: 20 },
  { key: "strong_day", title: "Strong day", description: "Walk 8,000+ steps", reward: 30 },
  { key: "good_sleep", title: "Good sleep", description: "Sleep 7+ hours", reward: 25 },
  {
    key: "sleep_consistency",
    title: "Sleep consistency",
    description: "Go to bed within 30 min of your target",
    reward: 15,
  },
  {
    key: "doomscroll_down",
    title: "Doomscroll down",
    description: "Scroll at least 20% less than your 7-day average",
    reward: 25,
  },
  {
    key: "offline_hour",
    title: "Offline hour",
    description: "1 hour with no distracting apps (up to 3/day)",
    reward: 15,
  },
];

export const THRESHOLDS = {
  firstSteps: 1_000,
  activeDay: 5_000,
  strongDay: 8_000,
  goodSleepMinutes: 7 * 60,
  bedtimeWindowMinutes: 30,
  doomscrollReduction: 0.2, // 20% below own baseline
  dayOneScrollCapMinutes: 120, // used when there is no 7-day baseline yet
  maxOfflineHoursPerDay: 3,
  longSessionMinutes: 10,
} as const;

/** Ethics (plan §19): cap daily earnings so extremes are not rewarded. */
export const DAILY_COIN_CAP = 200;

/** Tasks completed needed for 100% sunlight (plan §7.3). */
export const TASKS_FOR_FULL_SUNLIGHT = 3;

export const SHOP_ITEMS: ShopItem[] = [
  { id: "daisy_seed", name: "Daisy seed", type: "flower", price: 20, growthDays: 3, emoji: "🌼" },
  { id: "marigold_seed", name: "Marigold seed", type: "flower", price: 30, growthDays: 3, emoji: "🏵️" },
  { id: "sunflower_seed", name: "Sunflower seed", type: "flower", price: 50, growthDays: 5, emoji: "🌻" },
  { id: "fruit_sapling", name: "Fruit sapling", type: "tree", price: 100, growthDays: 7, emoji: "🍎" },
  { id: "oak_sapling", name: "Oak sapling", type: "tree", price: 150, growthDays: 10, emoji: "🌳" },
  { id: "watering_can", name: "Watering can", type: "tool", price: 50, growthDays: null, emoji: "🚿" },
  { id: "fertilizer", name: "Fertilizer", type: "consumable", price: 20, growthDays: null, emoji: "🧪" },
];

export const GARDEN_GRID = { cols: 4, rows: 4 } as const;

/** Real-impact milestone (plan §14): mocked tree planting. */
export const IMPACT_MILESTONE_COINS = 500;

/** Given once at onboarding so a new user can plant on day one. Tune freely. */
export const WELCOME_GIFT: { itemId: ShopItem["id"]; quantity: number }[] = [
  { itemId: "watering_can", quantity: 1 },
  { itemId: "daisy_seed", quantity: 1 },
];

/** Demo-control step sizes (plan §17: live boost on stage). */
export const DEMO_BOOST = {
  steps: 1_000,
  sleepMinutes: 60,
  scrollMinutes: -30,
  offlineHours: 1,
} as const;
