// Task evaluator (plan §10): pure function, no DB access.
// The API layer is responsible for idempotent payouts (one payout per user/task/day).
import { TASKS, THRESHOLDS, TASKS_FOR_FULL_SUNLIGHT } from "./economy";
import type { DailySummary, TaskProgress } from "./types";

export interface EvaluateContext {
  /** Average scrollMinutes of the previous 7 days; null on day 1. */
  scrollBaselineMinutes: number | null;
  /** Target bedtime "HH:MM", from user settings. */
  bedtimeTarget: string;
  /** Offline hours logged today (from extension or manual input). */
  offlineHours: number;
}

const ratio = (value: number, goal: number) => Math.max(0, Math.min(1, value / goal));
const fmt = (n: number) => n.toLocaleString("en-US");

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Circular distance between two clock times, in minutes (handles 23:50 vs 00:10). */
export function clockDistance(a: string, b: string): number {
  const d = Math.abs(minutesOfDay(a) - minutesOfDay(b));
  return Math.min(d, 24 * 60 - d);
}

export function evaluateTasks(summary: DailySummary, ctx: EvaluateContext): TaskProgress[] {
  return TASKS.map((task) => {
    switch (task.key) {
      case "first_steps":
      case "active_day":
      case "strong_day": {
        const goal =
          task.key === "first_steps"
            ? THRESHOLDS.firstSteps
            : task.key === "active_day"
              ? THRESHOLDS.activeDay
              : THRESHOLDS.strongDay;
        return {
          ...task,
          progress: ratio(summary.steps, goal),
          completed: summary.steps >= goal,
          label: `${fmt(summary.steps)} / ${fmt(goal)} steps`,
        };
      }
      case "good_sleep": {
        const goal = THRESHOLDS.goodSleepMinutes;
        const h = (summary.sleepMinutes / 60).toFixed(1);
        return {
          ...task,
          progress: ratio(summary.sleepMinutes, goal),
          completed: summary.sleepMinutes >= goal,
          label: `${h} / 7 hours`,
        };
      }
      case "sleep_consistency": {
        if (!summary.bedtime) {
          return { ...task, progress: 0, completed: false, label: "No bedtime data yet" };
        }
        const off = clockDistance(summary.bedtime, ctx.bedtimeTarget);
        const ok = off <= THRESHOLDS.bedtimeWindowMinutes;
        return {
          ...task,
          progress: ok ? 1 : Math.max(0, 1 - (off - THRESHOLDS.bedtimeWindowMinutes) / 120),
          completed: ok,
          label: `Bed at ${summary.bedtime} (target ${ctx.bedtimeTarget})`,
        };
      }
      case "doomscroll_down": {
        // Fairness rule: compare against the user's own baseline.
        const limit =
          ctx.scrollBaselineMinutes === null
            ? THRESHOLDS.dayOneScrollCapMinutes
            : ctx.scrollBaselineMinutes * (1 - THRESHOLDS.doomscrollReduction);
        const ok = summary.scrollMinutes <= limit;
        return {
          ...task,
          // Progress shrinks as you scroll more: full bar while under the limit.
          progress: ok ? 1 : ratio(limit, summary.scrollMinutes),
          completed: ok,
          label: `${summary.scrollMinutes} min scrolled (limit ${Math.round(limit)} min)`,
        };
      }
      case "offline_hour": {
        const max = THRESHOLDS.maxOfflineHoursPerDay;
        const n = Math.min(ctx.offlineHours, max);
        return {
          ...task,
          reward: task.reward * n, // pays per offline hour, up to 3
          progress: ratio(n, max),
          completed: n > 0,
          label: `${n} / ${max} offline hours`,
        };
      }
    }
  });
}

/** Sunlight 0..1: each completed task adds to today's sunlight (plan §7.3). */
export function sunlightFor(tasks: TaskProgress[]): number {
  const done = tasks.filter((t) => t.completed).length;
  return Math.min(1, done / TASKS_FOR_FULL_SUNLIGHT);
}
