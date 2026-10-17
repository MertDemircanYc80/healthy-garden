import type { Goal } from "@/types";

/** 23.6 → "11:36 pm" */
export function clockFromHours(h: number) {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

export function goalValue(g: Goal, v: number) {
  if (g.metric === "bedtime") return clockFromHours(v);
  if (g.unit === "steps") return v.toLocaleString("en-US");
  return `${v} ${g.unit}`;
}

/** 0..1 progress toward a goal, for either direction. */
export function goalProgress(g: Goal) {
  if (g.direction === "at_least") return Math.min(1, g.current / g.target);
  if (g.current <= g.target) return 1;
  // over the limit: shrink smoothly (bedtime: 1 h late ≈ 0)
  const over = g.current - g.target;
  const span = g.metric === "bedtime" ? 1 : g.target;
  return Math.max(0.05, 1 - over / span);
}

export const onTrack = (g: Goal) => (g.direction === "at_least" ? g.current >= g.target : g.current <= g.target);

export function greeting(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
