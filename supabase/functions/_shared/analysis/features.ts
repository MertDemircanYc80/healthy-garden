// Deterministic numbers about a user's recent days. The AI only writes words around these
// facts — it never has to do arithmetic, so it can't invent statistics.
import type { HealthDay } from "./types.ts";

export const DAY_MS = 86_400_000;

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  return addDays(day, -dow);
}

/** "23:40" → 23.67 ; "00:30" → 24.5 (bedtimes after midnight count as late, not early). */
export function bedtimeHours(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const v = h + m / 60;
  return v < 12 ? v + 24 : v;
}

export function clock(hours: number): string {
  const h = Math.floor(hours) % 24;
  const m = Math.round((hours - Math.floor(hours)) * 60);
  const hh = m === 60 ? (h + 1) % 24 : h;
  const mm = m === 60 ? 0 : m;
  const ampm = hh >= 12 ? "pm" : "am";
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (v: number | null, d = 0) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

export type MetricKey =
  | "steps"
  | "sleep_minutes"
  | "bedtime"
  | "active_minutes"
  | "running_minutes"
  | "walking_running_km"
  | "feed_minutes"
  | "screen_minutes"
  | "daylight_minutes"
  | "driving_minutes"
  | "energy_eaten_kcal"
  | "protein_g"
  | "water_ml";

export function value(d: HealthDay, k: MetricKey): number | null {
  switch (k) {
    case "bedtime":
      return bedtimeHours(d.bedtime);
    case "energy_eaten_kcal":
      return d.nutrition?.energyKcal ?? null;
    case "protein_g":
      return d.nutrition?.proteinG ?? null;
    case "water_ml":
      return d.nutrition?.waterMl ?? null;
    default: {
      const v = d[k as keyof HealthDay];
      return typeof v === "number" ? v : v === null || v === undefined ? null : Number(v);
    }
  }
}

export interface MetricStats {
  metric: MetricKey;
  daysWithData: number;
  last7: number | null;
  prev7: number | null;
  changePct: number | null;
  latest: number | null;
  best: { date: string; value: number } | null;
  worst: { date: string; value: number } | null;
  week: (number | null)[]; // last 7 days, oldest first
}

const HIGHER_IS_BETTER: Record<MetricKey, boolean> = {
  steps: true,
  sleep_minutes: true,
  bedtime: false,
  active_minutes: true,
  running_minutes: true,
  walking_running_km: true,
  feed_minutes: false,
  screen_minutes: false,
  daylight_minutes: true,
  driving_minutes: false,
  energy_eaten_kcal: true, // only used descriptively, never as a goal to restrict
  protein_g: true,
  water_ml: true,
};

export function statsFor(days: HealthDay[], today: string, k: MetricKey): MetricStats {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const series = (from: number, to: number) => {
    const out: { date: string; v: number | null }[] = [];
    for (let i = from; i <= to; i++) {
      const date = addDays(today, -i);
      const d = byDate.get(date);
      out.push({ date, v: d ? value(d, k) : null });
    }
    return out;
  };
  const last = series(0, 6);
  const prev = series(7, 13);
  const nums = (s: { v: number | null }[]) => s.map((x) => x.v).filter((v): v is number => v !== null);
  const last7 = avg(nums(last));
  const prev7 = avg(nums(prev));
  const all = series(0, 29).filter((x): x is { date: string; v: number } => x.v !== null);
  const sorted = [...all].sort((a, b) => a.v - b.v);
  const hib = HIGHER_IS_BETTER[k];
  return {
    metric: k,
    daysWithData: all.length,
    last7: round(last7, k === "bedtime" || k === "walking_running_km" ? 2 : 0),
    prev7: round(prev7, k === "bedtime" || k === "walking_running_km" ? 2 : 0),
    changePct: last7 !== null && prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : null,
    latest: last[0].v,
    best: sorted.length ? { date: (hib ? sorted[sorted.length - 1] : sorted[0]).date, value: (hib ? sorted[sorted.length - 1] : sorted[0]).v } : null,
    worst: sorted.length ? { date: (hib ? sorted[0] : sorted[sorted.length - 1]).date, value: (hib ? sorted[0] : sorted[sorted.length - 1]).v } : null,
    week: [...last].reverse().map((x) => x.v),
  };
}

export interface Fact {
  id: string;
  text: string;
}

function fmt(k: MetricKey, v: number): string {
  switch (k) {
    case "steps":
      return `${Math.round(v).toLocaleString("en-US")} steps`;
    case "sleep_minutes":
      return `${Math.floor(v / 60)} h ${Math.round(v % 60)} min`;
    case "bedtime":
      return clock(v);
    case "walking_running_km":
      return `${v.toFixed(1)} km`;
    case "energy_eaten_kcal":
      return `${Math.round(v)} kcal`;
    case "protein_g":
      return `${Math.round(v)} g`;
    case "water_ml":
      return `${(v / 1000).toFixed(1)} L`;
    default:
      return `${Math.round(v)} min`;
  }
}

const LABEL: Record<MetricKey, string> = {
  steps: "Steps",
  sleep_minutes: "Sleep",
  bedtime: "Bedtime",
  active_minutes: "Active minutes",
  running_minutes: "Running",
  walking_running_km: "Walking + running distance",
  feed_minutes: "Time in feed apps",
  screen_minutes: "Screen time",
  daylight_minutes: "Time in daylight",
  driving_minutes: "Driving",
  energy_eaten_kcal: "Food energy logged",
  protein_g: "Protein logged",
  water_ml: "Water logged",
};

/** Split days by a condition and compare another metric (e.g. late nights vs next-day steps). */
function contrast(
  days: HealthDay[],
  cond: (d: HealthDay) => boolean | null,
  target: (d: HealthDay, next: HealthDay | undefined) => number | null,
) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const yes: number[] = [];
  const no: number[] = [];
  for (const d of days) {
    const c = cond(d);
    if (c === null) continue;
    const t = target(d, byDate.get(addDays(d.date, 1)));
    if (t === null) continue;
    (c ? yes : no).push(t);
  }
  if (yes.length < 3 || no.length < 3) return null;
  return { yesAvg: avg(yes)!, noAvg: avg(no)!, yesN: yes.length, noN: no.length };
}

export interface Features {
  today: string;
  daysWithAnyData: number;
  stats: Record<MetricKey, MetricStats>;
  facts: Fact[];
}

export function computeFeatures(days: HealthDay[], today: string): Features {
  const recent = days.filter((d) => d.date <= today && d.date > addDays(today, -30));
  const keys = Object.keys(LABEL) as MetricKey[];
  const stats = Object.fromEntries(keys.map((k) => [k, statsFor(recent, today, k)])) as Record<MetricKey, MetricStats>;
  const facts: Fact[] = [];
  let n = 0;
  const add = (text: string) => facts.push({ id: `F${++n}`, text });

  for (const k of keys) {
    const s = stats[k];
    if (s.daysWithData < 3 || s.last7 === null) continue;
    let t = `${LABEL[k]}: last 7 days average ${fmt(k, s.last7)}`;
    if (s.prev7 !== null && s.changePct !== null && Math.abs(s.changePct) >= 5) {
      t += k === "bedtime" ? `, previous week ${fmt(k, s.prev7)}` : `, ${s.changePct > 0 ? "up" : "down"} ${Math.abs(s.changePct)}% from the week before (${fmt(k, s.prev7)})`;
    } else if (s.prev7 !== null) {
      t += ", about the same as the week before";
    }
    t += s.daysWithData < 20 ? `. Only ${s.daysWithData} of the last 30 days have data.` : ".";
    add(t);
    const spread = s.best && s.worst ? Math.abs(s.best.value - s.worst.value) / Math.max(1, Math.abs(s.best.value), Math.abs(s.worst.value)) : 0;
    if (s.best && s.worst && s.daysWithData >= 7 && spread >= 0.15 && k !== "energy_eaten_kcal") {
      add(`${LABEL[k]}: best day ${s.best.date} (${fmt(k, s.best.value)}), hardest day ${s.worst.date} (${fmt(k, s.worst.value)}).`);
    }
  }

  // Bedtime consistency
  const beds = recent.map((d) => bedtimeHours(d.bedtime)).filter((v): v is number => v !== null);
  if (beds.length >= 5) {
    const m = avg(beds)!;
    const sd = Math.sqrt(avg(beds.map((b) => (b - m) ** 2))!);
    add(`Bedtime varies by about ${Math.round(sd * 60)} minutes from night to night (average ${clock(m)}).`);
  }

  // Late nights → sleep and next-day steps
  const late = (d: HealthDay) => {
    const b = bedtimeHours(d.bedtime);
    return b === null ? null : b >= 23.5;
  };
  // Convention: health_days(D).bedtime / sleep_minutes / wake_time describe the night that
  // ENDED on the morning of D. So "late bedtime" and its sleep are on the same row, and the
  // day after that late night is D itself.
  const sleepAfter = contrast(recent, late, (d) => d.sleep_minutes);
  if (sleepAfter) {
    const diff = Math.round(sleepAfter.noAvg - sleepAfter.yesAvg);
    if (Math.abs(diff) >= 15)
      add(`After bedtimes past 11:30 pm (${sleepAfter.yesN} nights) sleep averaged ${fmt("sleep_minutes", sleepAfter.yesAvg)}, versus ${fmt("sleep_minutes", sleepAfter.noAvg)} after earlier bedtimes (${sleepAfter.noN} nights) — a difference of ${Math.abs(diff)} minutes.`);
  }
  const stepsAfterLate = contrast(recent, late, (d) => d.steps);
  if (stepsAfterLate && Math.abs(stepsAfterLate.noAvg - stepsAfterLate.yesAvg) >= 800) {
    add(`The day after a bedtime past 11:30 pm, steps averaged ${fmt("steps", stepsAfterLate.yesAvg)} versus ${fmt("steps", stepsAfterLate.noAvg)} after earlier nights.`);
  }

  // Heavy feed days → that night's bedtime
  const feedVals = recent.map((d) => d.feed_minutes).filter((v): v is number => v !== null);
  if (feedVals.length >= 6) {
    const median = [...feedVals].sort((a, b) => a - b)[Math.floor(feedVals.length / 2)];
    const heavy = contrast(
      recent,
      (d) => (d.feed_minutes === null ? null : d.feed_minutes > median),
      (_d, next) => bedtimeHours(next?.bedtime ?? null), // that evening's bedtime lives on the next row
    );
    if (heavy && Math.abs(heavy.yesAvg - heavy.noAvg) >= 0.25)
      add(`On days with more than ${median} minutes in feed apps, bedtime averaged ${clock(heavy.yesAvg)}, versus ${clock(heavy.noAvg)} on lighter days.`);
    const apps: Record<string, number> = {};
    for (const d of recent.filter((d) => d.date > addDays(today, -7))) for (const [a, m] of Object.entries(d.app_usage ?? {})) apps[a] = (apps[a] ?? 0) + m;
    const top = Object.entries(apps).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) add(`Feed app time in the last 7 days by app: ${top.map(([a, m]) => `${a} ${Math.round(m)} min`).join(", ")}.`);
  }

  // Daylight → sleep that night
  const outside = contrast(
    recent,
    (d) => (d.daylight_minutes === null ? null : d.daylight_minutes >= 20),
    (_d, next) => next?.sleep_minutes ?? null,
  );
  if (outside && Math.abs(outside.yesAvg - outside.noAvg) >= 15)
    add(`On days with 20+ minutes of daylight, the following night's sleep averaged ${fmt("sleep_minutes", outside.yesAvg)}, versus ${fmt("sleep_minutes", outside.noAvg)} on days with less.`);

  // Weekday vs weekend steps
  const dow = (d: HealthDay) => new Date(`${d.date}T00:00:00Z`).getUTCDay();
  const wk = contrast(recent, (d) => dow(d) === 0 || dow(d) === 6, (d) => d.steps);
  if (wk && Math.abs(wk.yesAvg - wk.noAvg) >= 1000)
    add(`Weekend steps average ${fmt("steps", wk.yesAvg)} versus ${fmt("steps", wk.noAvg)} on weekdays.`);

  // Short drives
  const drive = stats.driving_minutes;
  if (drive.daysWithData >= 5 && drive.last7 !== null && drive.last7 > 0) {
    const shortDays = recent.filter((d) => d.date > addDays(today, -7) && (d.driving_minutes ?? 0) > 0 && (d.driving_minutes ?? 0) <= 15).length;
    if (shortDays >= 2) add(`In the last 7 days there were ${shortDays} days where total driving was 15 minutes or less.`);
  }

  // Run days and protein (only descriptive, never restrictive)
  const run = contrast(recent, (d) => (d.running_minutes === null ? null : d.running_minutes > 0), (d) => d.nutrition?.proteinG ?? null);
  if (run) add(`On running days logged protein averaged ${Math.round(run.yesAvg)} g, versus ${Math.round(run.noAvg)} g on other days.`);

  return { today, daysWithAnyData: recent.length, stats, facts };
}

export { LABEL, fmt, HIGHER_IS_BETTER };
