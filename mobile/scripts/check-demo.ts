// Walks the demo week end to end. Run: npm run check
import { deepStrictEqual as eq, ok } from "node:assert/strict";
import { demoPlants } from "../src/data/demo";
import { coachInsights, coachReport, goalsAt, MAX_OFFSET, metricValue, dayAt, nextDay, bedtimeHours, type DemoState } from "../src/demo/simulation";
import { onTrack } from "../src/lib/format";

let n = 0;
const test = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`✓ ${name}`);
};

test("dataset and coach output line up", () => {
  ok(dayAt(0) && dayAt(-29) && dayAt(MAX_OFFSET), "days -29..+7 exist");
  eq(MAX_OFFSET, 7);
  const goals = goalsAt(0);
  ok(goals.length >= 3 && goals.length <= 4, `goals ${goals.length}`);
  ok(coachInsights().length >= 2, "coach wrote insights");
  eq(coachReport().metrics[0].week.length, 7);
  eq(bedtimeHours("00:30"), 24.5);
  eq(metricValue(dayAt(0), "steps"), dayAt(0)!.steps);
});

test("goals on demo morning are not all done yet (there is something to show)", () => {
  const done = goalsAt(0).filter(onTrack).length;
  ok(done < goalsAt(0).length, `done ${done}`);
});

test("next day pays coins, grows watered plants, rests unwatered ones", () => {
  const start: DemoState = { offset: 0, coins: 460, streak: 4, plants: demoPlants.map((p) => ({ ...p, wateredToday: p.id !== "p13" })), alerts: [] };
  const s1 = nextDay(start);
  eq(s1.offset, 1);
  const paid = goalsAt(0).filter(onTrack).reduce((sum, g) => sum + g.reward, 0);
  eq(s1.coins, 460 + paid);
  ok(s1.plants.find((p) => p.id === "p13")!.resting, "unwatered plant rests");
  ok(s1.plants.every((p) => !p.wateredToday), "watering resets overnight");
  ok(s1.alerts[0].title.startsWith("Yesterday:"), s1.alerts[0].title);
});

test("a full demo week, watering every day, ends with a garden in bloom and more coins", () => {
  let s: DemoState = { offset: 0, coins: 460, streak: 4, plants: demoPlants, alerts: [] };
  const hitsPerDay: number[] = [];
  while (s.offset < MAX_OFFSET) {
    hitsPerDay.push(goalsAt(s.offset).filter(onTrack).length);
    s = nextDay({ ...s, plants: s.plants.map((p) => ({ ...p, wateredToday: true })) });
  }
  eq(s.offset, MAX_OFFSET);
  eq(nextDay(s), s); // can't go past the end
  const blooming = s.plants.filter((p) => p.stage === "blooming").length;
  ok(blooming >= 12, `blooming ${blooming}/16`);
  ok(s.coins > 600, `coins ${s.coins}`);
  ok(hitsPerDay.slice(1).reduce((a, b) => a + b, 0) > hitsPerDay[0] * 3, `improvement ${hitsPerDay.join(",")}`);
  console.log(`  goals hit per day: ${hitsPerDay.join(", ")} — coins ${s.coins}, blooming ${blooming}/16`);
});

console.log(`\nAll ${n} demo checks passed`);
