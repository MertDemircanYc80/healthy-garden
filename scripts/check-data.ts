// Checks for the data pipeline: Apple Health export parsing + daily aggregation + events.
// Run: npm run check
import { buildSummaries, summarizeEvents } from "../src/lib/data/aggregate";
import { AppleHealthParser } from "../src/lib/data/appleHealth";
import type { DeviceEvent } from "../src/lib/data/samples";

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) fails++;
};

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Mert’s iPhone" unit="count" startDate="2026-10-15 09:00:00 -0700" endDate="2026-10-15 09:30:00 -0700" value="3000"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Mert’s Apple Watch" unit="count" startDate="2026-10-15 09:00:00 -0700" endDate="2026-10-15 09:30:00 -0700" value="3200"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Mert’s Apple Watch" unit="count" startDate="2026-10-15 18:00:00 -0700" endDate="2026-10-15 18:30:00 -0700" value="2000">
  <MetadataEntry key="HKMetadataKeySyncVersion" value="2"/>
 </Record>
 <Record type="HKQuantityTypeIdentifierDistanceWalkingRunning" sourceName="Watch" unit="mi" startDate="2026-10-15 09:00:00 -0700" endDate="2026-10-15 09:30:00 -0700" value="2"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-10-15 23:10:00 -0700" endDate="2026-10-16 02:00:00 -0700" value="HKCategoryValueSleepAnalysisAsleepCore"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-10-16 02:00:00 -0700" endDate="2026-10-16 03:00:00 -0700" value="HKCategoryValueSleepAnalysisAwake"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-10-16 03:00:00 -0700" endDate="2026-10-16 07:00:00 -0700" value="HKCategoryValueSleepAnalysisAsleepDeep"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Sleep App &amp; Co" startDate="2026-10-15 23:30:00 -0700" endDate="2026-10-16 01:00:00 -0700" value="HKCategoryValueSleepAnalysisAsleepUnspecified"/>
 <Record type="HKQuantityTypeIdentifierDietaryEnergyConsumed" sourceName="FoodApp" unit="kcal" startDate="2026-10-15 12:00:00 -0700" endDate="2026-10-15 12:00:00 -0700" value="650"/>
 <Record type="HKQuantityTypeIdentifierDietaryEnergyConsumed" sourceName="FoodApp" unit="kJ" startDate="2026-10-15 19:00:00 -0700" endDate="2026-10-15 19:00:00 -0700" value="4184"/>
 <Record type="HKQuantityTypeIdentifierDietaryProtein" sourceName="FoodApp" unit="g" startDate="2026-10-15 12:00:00 -0700" endDate="2026-10-15 12:00:00 -0700" value="42"/>
 <Record type="HKQuantityTypeIdentifierHeartRate" sourceName="Watch" unit="count/min" startDate="2026-10-15 12:00:00 -0700" endDate="2026-10-15 12:00:00 -0700" value="70"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Old" unit="count" startDate="2025-01-01 10:00:00 -0800" endDate="2025-01-01 10:10:00 -0800" value="999"/>
 <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="31.5" durationUnit="min" sourceName="Watch" startDate="2026-10-15 07:00:00 -0700" endDate="2026-10-15 07:31:30 -0700">
  <WorkoutStatistics type="HKQuantityTypeIdentifierDistanceWalkingRunning" sum="5" unit="km"/>
 </Workout>
</HealthData>`;

// Feed in awkward small chunks to prove the streaming boundary logic.
const parser = new AppleHealthParser("2026-09-01");
for (let i = 0; i < XML.length; i += 37) parser.feed(XML.slice(i, i + 37));
const samples = parser.finish();
ok(parser.stats.samplesKept === 11, `parser kept 11 samples, skipped old/heart-rate/awake (kept ${parser.stats.samplesKept})`);

const byDay = Object.fromEntries(buildSummaries({ samples }, "apple_health").map((s) => [s.date, s]));
const d15 = byDay["2026-10-15"];
const d16 = byDay["2026-10-16"];
ok(d15?.steps === 5200, `steps de-duplicated across iPhone/Watch (5200, got ${d15?.steps})`);
ok(d15?.walkingRunningKm === 3.22, `miles converted to km (3.22, got ${d15?.walkingRunningKm})`);
ok(d15?.runningMinutes === 32 && d15?.workoutMinutes === 32, `running workout minutes (${d15?.runningMinutes})`);
ok(d15?.nutrition?.energyKcal === 1650 && d15?.nutrition?.proteinG === 42, `nutrition summed, kJ converted (${JSON.stringify(d15?.nutrition)})`);
ok(d16?.sleepMinutes === 410, `sleep: overlapping sources merged, awake excluded, counted on wake day (410, got ${d16?.sleepMinutes})`);
ok(d16?.bedtime === "23:10" && d16?.wakeTime === "07:00", `bedtime/wake (${d16?.bedtime}–${d16?.wakeTime})`);

const events: DeviceEvent[] = [
  { kind: "app_open", app: "Instagram", at: "2026-10-16T21:00:00-07:00" },
  { kind: "app_close", app: "Instagram", at: "2026-10-16T21:25:00-07:00" },
  { kind: "app_open", app: "TikTok", at: "2026-10-16T22:00:00-07:00" },
  { kind: "app_close", app: "TikTok", at: "2026-10-16T22:05:00-07:00" },
  { kind: "app_close", app: "X", at: "2026-10-16T22:10:00-07:00" }, // orphan close: ignored
  { kind: "driving_start", at: "2026-10-16T08:00:00-07:00" },
  { kind: "driving_end", at: "2026-10-16T08:35:00-07:00" },
];
const ev = summarizeEvents(events)["2026-10-16"];
ok(ev?.scrollMinutes === 30 && ev.longSessions === 1, `feed minutes from open/close (30, long ${ev?.longSessions})`);
ok(ev?.appUsage.Instagram === 25 && ev.appUsage.TikTok === 5, "per-app usage");
ok(ev?.drivingMinutes === 35, `driving minutes from start/end (35, got ${ev?.drivingMinutes})`);

const merged = buildSummaries({ samples, events, daily: { "2026-10-16": { steps: 4321 } } }, "shortcut");
const m16 = merged.find((s) => s.date === "2026-10-16")!;
ok(m16.steps === 4321 && m16.sleepMinutes === 410 && m16.scrollMinutes === 30 && m16.drivingMinutes === 35, "samples + daily + events merge into one day");

console.log(fails ? `\n${fails} data check(s) failed` : "\nAll data checks passed");
process.exit(fails ? 1 : 0);
