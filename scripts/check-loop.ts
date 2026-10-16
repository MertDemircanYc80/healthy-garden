// Smoke test for the full core loop (plan §16 testing checklist). Run: npm run check
import * as G from "../src/lib/game/engine";

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) fails++;
};

let s = G.createInitialState("2026-10-16");
ok(G.balanceOf(s) === 0 && s.plants.length === 0, "empty state works (new user, no plants)");

s = G.onboard(s, { name: "Mert", stepGoal: 8000, bedtimeTarget: "23:00", dataSource: "mock" }).state;
ok((s.inventory.watering_can ?? 0) === 1 && (s.inventory.daisy_seed ?? 0) === 1, "welcome gift received");

for (let i = 0; i < 10; i++) s = G.boost(s, "steps").state;
s = G.boost(s, "offline").state;
const before = G.todayView(s);
ok(before.claimableTotal > 0, `tasks complete after boost (claimable ${before.claimableTotal})`);

const c1 = G.claimAll(s);
ok(c1.ok, `claim all: ${c1.ok ? c1.message : c1.error}`);
s = c1.state;
const bal = G.balanceOf(s);
const c2 = G.claimAll(s);
ok(!c2.ok && G.balanceOf(c2.state) === bal, "task cannot pay out twice for the same day");

s = G.boost(s, "offline").state;
const c3 = G.claimTask(s, "offline_hour");
ok(c3.ok && G.balanceOf(c3.state) === bal + 15, "second offline hour pays only the difference");
s = c3.state;

const poor = G.buy(G.createInitialState("2026-10-16"), "oak_sapling");
ok(!poor.ok, `insufficient coins fails gracefully: ${!poor.ok ? poor.error : ""}`);

const b = G.buy(s, "daisy_seed");
ok(b.ok && (b.state.inventory.daisy_seed ?? 0) === 2, "buy seed adds to inventory");
s = b.state;
ok(!G.buy(s, "watering_can").ok, "tool can't be bought twice");

s = G.plant(s, "daisy_seed", 0, 0).state;
s = G.plant(s, "daisy_seed", 1, 0).state;
ok(s.plants.length === 2 && !G.plant(s, "sunflower_seed", 0, 0).ok, "planting + occupied cell blocked");

const [p1, p2] = s.plants;
s = G.water(s, p1.id).state;
ok(!G.water(s, p1.id).ok, "can't water twice a day");
s = G.skipDay(s).state;
const a1 = s.plants.find((p) => p.id === p1.id)!;
const a2 = s.plants.find((p) => p.id === p2.id)!;
ok(a1.growthPoints > 0 && !a1.isDormant, `watered plant grew (stage ${a1.stage}, ${a1.growthPoints.toFixed(2)} pts)`);
ok(a2.isDormant && a2.growthPoints === 0, "unwatered plant went dormant, not dead");
ok(s.day === "2026-10-17", "skip a day advances the date");

s = G.water(s, p2.id).state;
ok(!s.plants.find((p) => p.id === p2.id)!.isDormant, "dormant plant recovers when cared for");

// grow p1 to full bloom with full sunlight every day
let guard = 0;
while (s.plants.find((p) => p.id === p1.id)!.stage !== "blooming" && guard++ < 10) {
  for (let i = 0; i < 10; i++) s = G.boost(s, "steps").state;
  for (let i = 0; i < 3; i++) s = G.boost(s, "sleep").state;
  s = G.water(s, p1.id).state;
  s = G.claimAll(s).state;
  s = G.skipDay(s).state;
}
ok(s.plants.find((p) => p.id === p1.id)!.stage === "blooming", `daisy reaches blooming in ${guard} more days`);

const today = G.todayView(s);
ok(today.health > 0 && today.health <= 1, `garden health meter in range (${today.health.toFixed(2)})`);
ok(today.earnedToday <= 200, "daily coin cap respected");

const show = G.loadShowcase("2026-10-16");
ok(show.plants.length === 19 && G.balanceOf(show) === 460, "showcase garden loads (19 plants, 460 coins)");
const r0 = G.redeemImpact(show);
ok(!r0.ok, "tree locked below 500 coins");
let sh = show;
for (let i = 0; i < 10; i++) sh = G.boost(sh, "steps").state;
sh = G.claimAll(sh).state;
const r1 = G.redeemImpact(sh);
ok(r1.ok && r1.state.impact.length === 1, `tree unlocks after crossing 500: ${r1.ok ? r1.message : r1.error}`);
ok(!G.redeemImpact(r1.state).ok, "same milestone can't be redeemed twice");

// Real data sources
let r = G.createInitialState("2026-10-16");
r = G.onboard(r, { name: "R", stepGoal: 8000, bedtimeTarget: "23:00", dataSource: "mock" }).state;
ok(!G.setDataSource(r, "apple_health").ok, "can't switch to Apple Health before importing");
const real = [
  { date: "2026-10-15", steps: 9000, sleepMinutes: 450, bedtime: "23:05", wakeTime: "06:35", activeMinutes: 30, scrollMinutes: 0, longSessions: 0, source: "apple_health" as const },
  { date: "2026-10-16", steps: 1200, sleepMinutes: 470, bedtime: "22:50", wakeTime: "06:40", activeMinutes: 0, scrollMinutes: 0, longSessions: 0, source: "apple_health" as const, runningMinutes: 25 },
];
const imp = G.importSummaries(r, real, "apple_health", "2026-10-16T10:00:00Z");
ok(imp.ok && imp.state.profile.dataSource === "apple_health", "Apple Health import switches the source");
r = imp.state;
const rv = G.todayView(r);
ok(rv.summary.steps === 1200 && rv.summary.runningMinutes === 25, "today uses imported numbers unchanged");
ok(rv.tasks.find((t) => t.key === "first_steps")!.completed && rv.tasks.find((t) => t.key === "good_sleep")!.completed, "real data completes tasks");
ok(!rv.tasks.find((t) => t.key === "doomscroll_down")!.completed, "no scroll source → doomscroll task not free");
r = G.importSummaries(r, [{ ...real[1], source: "shortcut", scrollMinutes: 40, longSessions: 1, appUsage: { Instagram: 40 }, steps: 1500 }], "shortcut", "2026-10-16T11:00:00Z").state;
const sv = G.todayView(r);
ok(sv.summary.steps === 1500 && sv.summary.runningMinutes === 25 && sv.summary.scrollMinutes === 40, "Shortcuts sync merges with imported fields");
ok(sv.tasks.find((t) => t.key === "doomscroll_down")!.completed, "doomscroll task works once scroll data exists (day-1 cap)");
r = G.skipDay(r).state;
ok(G.todayView(r).summary.steps === 0, "a day with no real data shows zeros, not fake numbers");
r = G.clearImported(r).state;
ok(r.profile.dataSource === "mock" && Object.keys(r.imported ?? {}).length === 0, "delete imported data returns to demo data");

console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed");
process.exit(fails ? 1 : 0);
