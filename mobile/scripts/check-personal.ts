import assert from "node:assert/strict";
import { initialPersonalGarden } from "../src/lib/dailyCycle";
import { personalGoalsAt, reconcilePersonal } from "../src/lib/personalGoals";
import { onTrack, goalProgress } from "../src/lib/format";
import { createGardenStore } from "../src/lib/savedGarden";
import type { HealthDayRow } from "../src/lib/health/types";

async function main() {
  const baseline: HealthDayRow[] = [{date:"2026-10-15",steps:4000,feed_minutes:100,source:"healthkit"}];
  let s = initialPersonalGarden(); s.calendarDate = "2026-10-16";
  s = reconcilePersonal(s,baseline,"2026-10-16");
  const missing = personalGoalsAt(s.personal,baseline,"2026-10-16");
  assert.equal(missing.length,2);
  assert.equal(missing.some(onTrack),false);
  assert.equal(missing.reduce((n,g)=>n+goalProgress(g),0),0);
  const rows = [...baseline,{date:"2026-10-16",steps:5000,feed_minutes:0,source:"manual" as const}];
  s = reconcilePersonal(s,rows,"2026-10-16");
  assert.equal(s.sim.coins,1020); // steps now; feed must wait until tomorrow
  assert.equal(reconcilePersonal(s,rows,"2026-10-16"),s);
  const target = s.personal!.weeks["2026-10-12"].goals[0].target;
  s = reconcilePersonal(s,rows,"2026-10-17");
  assert.equal(s.sim.coins,1045);
  assert.equal(s.personal!.weeks["2026-10-12"].goals[0].target,target);
  assert.equal(reconcilePersonal(s,rows,"2026-10-17"),s);
  const data = new Map<string,string>();
  let fail = false;
  const storage = {getItem:async(k:string)=>data.get(k)??null,setItem:async(k:string,v:string)=>{if(fail)throw Error("disk");data.set(k,v);}};
  const store = createGardenStore(storage);
  await store.update(()=>s);
  const restored = createGardenStore(storage);
  await Promise.all([restored.update(x=>reconcilePersonal(x,rows,"2026-10-17")),restored.update(x=>reconcilePersonal(x,rows,"2026-10-17"))]);
  assert.equal((await restored.load()).sim.coins,1045);
  const later = [...rows,{date:"2026-10-17",steps:5000}];
  fail = true; await assert.rejects(restored.update(x=>reconcilePersonal(x,later,"2026-10-17")));
  assert.equal((await restored.load()).sim.coins,1045);
  fail = false; await restored.update(x=>reconcilePersonal(x,later,"2026-10-17"));
  assert.equal((await restored.load()).sim.coins,1065);
  const noData = reconcilePersonal(initialPersonalGarden(),[],"2026-10-17");
  assert.equal(noData.sim.coins,1000);
  console.log("✓ real totals drive goals; missing readings earn nothing; limits settle next day; rewards survive reload/concurrency/write failure exactly once");
}
void main();
