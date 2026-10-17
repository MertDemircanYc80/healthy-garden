// Generates the demo persona's health data: 30 past days, today, and 7 "future" days the
// demo can step into with Next day. Synthetic but shaped like real phone + watch data.
// Run: npx tsx scripts/make-demo-data.ts   (writes src/data/demo-health.json and ../supabase/seed/demo_health_days.csv)
import { writeFileSync, mkdirSync } from "node:fs";

// Persona: a college student with a phone + watch. Patterns the coach should find:
//  - heavy feed-app evenings → late bedtimes → short sleep → fewer steps next day
//  - runs on Tuesday and Saturday; weekends are less active
//  - short drives to places within walking distance
//  - in the last week and the future week, habits improve (so the garden visibly grows)

let seed = 20261016;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const between = (a: number, b: number) => a + rnd() * (b - a);
const round5 = (v: number) => Math.round(v / 5) * 5;

const FIRST = -29;
const LAST = 7;
/** The demo's "today". Fixed so weekday patterns (runs, weekends) match the dates shown. */
export const DEMO_TODAY = "2026-10-16"; // a Friday

interface Row {
  offset: number;
  steps: number;
  walking_running_km: number;
  active_energy_kcal: number;
  active_minutes: number;
  running_minutes: number;
  workout_minutes: number;
  sleep_minutes: number;
  bedtime: string;
  wake_time: string;
  daylight_minutes: number;
  screen_minutes: number;
  feed_minutes: number;
  long_sessions: number;
  driving_minutes: number;
  app_usage: Record<string, number>;
  nutrition: { energyKcal: number; proteinG: number; carbsG: number; fatG: number; waterMl: number };
}

const clock = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const rows: Row[] = [];
let prevFeed = 90;
for (let o = FIRST; o <= LAST; o++) {
  const improving = o >= 1; // the coach's goals start working after "today" — Next day shows it
  const future = o > 0;
  const dow = (((o + 4) % 7) + 7) % 7; // 0 = Monday … 6 = Sunday (offset 0 = Friday)
  const weekend = dow >= 5;
  const runDay = dow === 1 || dow === 5;

  // Last night (ends this morning) depends on yesterday's evening scrolling.
  const lateProb = prevFeed > 110 ? 0.8 : prevFeed > 80 ? 0.4 : 0.12;
  const late = rnd() < (improving ? lateProb * (future ? 0.25 : 0.55) : lateProb);
  const bed = late ? between(23.6, 24.8) : between(22.6, 23.25);
  const sleep = late ? between(330, 385) : between(420, 470);
  const wake = bed + sleep / 60 + between(0.1, 0.25);

  // Today's activity
  let steps = weekend ? between(3200, 5200) : between(5600, 8200);
  if (late) steps -= between(1600, 2600);
  if (runDay) steps += between(3500, 4800);
  if (improving) steps += between(600, 1400);
  if (future) steps += 400;
  steps = Math.max(1800, Math.round(steps));
  const running = runDay ? round5(between(22, 36)) : 0;
  const active = Math.round(between(10, 22) + running + (improving ? 8 : 0));
  const daylight = Math.round((runDay ? between(28, 45) : between(6, 24)) + (improving ? 8 : 0));

  // Evening scrolling: heavier Thu–Sat, trending down once the coach kicks in
  let feed = (dow >= 3 && dow <= 5 ? between(95, 150) : between(55, 105)) * (improving ? (future ? 0.55 : 0.75) : 1);
  feed = Math.round(feed);
  const share = { Instagram: 0.52, TikTok: 0.33, YouTube: 0.15 };
  const app_usage = Object.fromEntries(Object.entries(share).map(([k, v]) => [k, Math.round(feed * v)]));

  const shortDrive = rnd() < (future ? 0.15 : 0.45);
  const driving = Math.round(shortDrive ? between(6, 14) : between(18, 42));

  const protein = Math.round(runDay ? between(50, 62) : between(70, 98)) + (future && runDay ? 25 : 0);

  rows.push({
    offset: o,
    steps,
    walking_running_km: Math.round((steps / 1350) * 100) / 100,
    active_energy_kcal: Math.round(180 + steps * 0.035 + running * 9),
    active_minutes: active,
    running_minutes: running,
    workout_minutes: running ? running + 5 : 0,
    sleep_minutes: Math.round(sleep),
    bedtime: clock(bed),
    wake_time: clock(wake),
    daylight_minutes: daylight,
    screen_minutes: Math.round(feed + between(110, 170)),
    feed_minutes: feed,
    long_sessions: feed > 110 ? 3 : feed > 70 ? 2 : 1,
    driving_minutes: driving,
    app_usage,
    nutrition: {
      energyKcal: Math.round(between(1850, 2350)),
      proteinG: protein,
      carbsG: Math.round(between(210, 290)),
      fatG: Math.round(between(60, 85)),
      waterMl: round5(between(1100, 1900) + (improving ? 300 : 0)),
    },
  });
  prevFeed = feed;
}

// "Today" is a morning: last night's sleep is final, the rest of the day has only just started.
const today = rows.find((r) => r.offset === 0)!;
Object.assign(today, {
  steps: 3120,
  walking_running_km: 2.31,
  active_energy_kcal: 260,
  active_minutes: 14,
  running_minutes: 0,
  workout_minutes: 0,
  daylight_minutes: 9,
  feed_minutes: 38,
  screen_minutes: 112,
  long_sessions: 1,
  driving_minutes: 0,
  app_usage: { Instagram: 22, TikTok: 11, YouTube: 5 },
  nutrition: { energyKcal: 620, proteinG: 31, carbsG: 74, fatG: 21, waterMl: 600 },
});

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dated = rows.map((r) => ({ date: addDays(DEMO_TODAY, r.offset), ...r }));
writeFileSync(new URL("../src/data/demo-health.json", import.meta.url), JSON.stringify({ today: DEMO_TODAY, days: dated }, null, 1) + "\n");

// CSV for seeding a Supabase demo user (past + today only).
mkdirSync(new URL("../../supabase/seed/", import.meta.url), { recursive: true });
const cols = ["date", "steps", "walking_running_km", "active_energy_kcal", "active_minutes", "running_minutes", "workout_minutes", "sleep_minutes", "bedtime", "wake_time", "daylight_minutes", "screen_minutes", "feed_minutes", "long_sessions", "driving_minutes", "app_usage", "nutrition"] as const;
const csv = [cols.join(",")]
  .concat(dated.filter((r) => r.offset <= 0).map((r) => cols.map((c) => (typeof r[c] === "object" ? `"${JSON.stringify(r[c]).replace(/"/g, '""')}"` : r[c])).join(",")))
  .join("\n");
writeFileSync(new URL("../../supabase/seed/demo_health_days.csv", import.meta.url), csv + "\n");

const past = rows.filter((r) => r.offset < 0);
const avg = (k: keyof Row) => Math.round(past.reduce((s, r) => s + (r[k] as number), 0) / past.length);
console.log(`rows: ${rows.length} (past ${past.length}, today 1, future ${LAST})`);
console.log(`past averages: steps ${avg("steps")}, sleep ${avg("sleep_minutes")} min, feed ${avg("feed_minutes")} min, daylight ${avg("daylight_minutes")} min`);
console.log(`late nights in past: ${past.filter((r) => r.bedtime < "12:00" || r.bedtime >= "23:30").length}`);
