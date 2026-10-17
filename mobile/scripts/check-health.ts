// Tests for the pure Apple Health helpers. Run: npm run check
import { deepStrictEqual as eq, ok } from "node:assert/strict";
import { buildRows, localDay, sleepByDay, totalsByDay, unionMinutes, workoutsByDay } from "../src/lib/health/days";

const at = (d: string, t: string) => new Date(`${d}T${t}:00`); // local time
let n = 0;
const test = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`✓ ${name}`);
};

test("overlapping sleep from Watch + iPhone counts once", () => {
  eq(unionMinutes([{ start: at("2026-10-15", "23:00"), end: at("2026-10-16", "03:00") }, { start: at("2026-10-16", "02:00"), end: at("2026-10-16", "06:30") }]), 450);
});

test("sleep is assigned to the morning it ends; awake removed; in-bed only as fallback", () => {
  const s = sleepByDay([
    { start: at("2026-10-15", "23:10"), end: at("2026-10-16", "02:00"), value: 3 },
    { start: at("2026-10-16", "02:00"), end: at("2026-10-16", "02:20"), value: 2 },
    { start: at("2026-10-16", "02:20"), end: at("2026-10-16", "06:50"), value: 4 },
    { start: at("2026-10-15", "22:40"), end: at("2026-10-16", "07:00"), value: 0 }, // in bed, ignored (stages exist)
    { start: at("2026-10-16", "23:30"), end: at("2026-10-17", "07:00"), value: 0 }, // only in-bed → used
    { start: at("2026-10-16", "14:00"), end: at("2026-10-16", "14:15"), value: 1 }, // 15-min nap fragment
  ]);
  eq(s["2026-10-16"], { sleep_minutes: 440, bedtime: "23:10", wake_time: "06:50" });
  eq(s["2026-10-17"], { sleep_minutes: 450, bedtime: "23:30", wake_time: "07:00" });
});

test("daily totals keep only positive values", () => {
  eq(totalsByDay([{ start: at("2026-10-15", "00:00"), value: 5234.6 }, { start: at("2026-10-16", "00:00"), value: 0 }]), { "2026-10-15": 5235 });
});

test("workouts split into running and all", () => {
  eq(workoutsByDay([{ start: at("2026-10-15", "07:00"), minutes: 31.5, running: true }, { start: at("2026-10-15", "18:00"), minutes: 20, running: false }]), { "2026-10-15": { workout: 52, running: 32 } });
});

test("rows only for days with data; missing values stay absent (not 0)", () => {
  const rows = buildRows(at("2026-10-14", "00:00"), at("2026-10-16", "12:00"), {
    steps: { "2026-10-15": 6000, "2026-10-16": 1200 },
    sleep: { "2026-10-16": { sleep_minutes: 440, bedtime: "23:10", wake_time: "06:50" } },
    nutrition: { proteinG: { "2026-10-15": 80 } },
  });
  eq(rows.map((r) => r.date), ["2026-10-15", "2026-10-16"]);
  eq(rows[0], { date: "2026-10-15", source: "healthkit", steps: 6000, nutrition: { proteinG: 80 } });
  ok(!("walking_running_km" in rows[1]));
  eq(rows[1].sleep_minutes, 440);
  eq(localDay(at("2026-10-16", "23:59")), "2026-10-16");
});

console.log(`\nAll ${n} health checks passed`);
