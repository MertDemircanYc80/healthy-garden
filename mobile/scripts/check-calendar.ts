import assert from "node:assert/strict";
import { daysBetween, initialPersonalGarden, rollGardenDay } from "../src/lib/dailyCycle";
import { createGardenStore } from "../src/lib/savedGarden";

async function main() {
  const s = initialPersonalGarden();
  s.calendarDate = "2026-03-08";
  s.sim.plants = [{ id:"p",species:"daisy",stage:"seed",growth:0,col:0,row:0,wateredToday:true,fertilizedToday:true,resting:false }];
  assert.equal(daysBetween("2026-03-08","2026-03-09"),1); // DST, calendar days rather than elapsed hours
  assert.equal(rollGardenDay(s,"2026-03-08"),s);
  assert.equal(rollGardenDay(s,"2026-03-07"),s);
  const next = rollGardenDay(s,"2026-03-09");
  assert.equal(next.sim.plants[0].wateredToday,false);
  assert.equal(next.sim.plants[0].fertilizedToday,false);
  assert.equal(next.sim.coins,s.sim.coins);
  assert.equal(rollGardenDay(next,"2026-03-09"),next);
  assert.equal(rollGardenDay(s,"2026-04-08").sim.plants[0].growth,next.sim.plants[0].growth);
  const data = new Map<string,string>();
  const storage = { getItem:async(k:string)=>data.get(k)??null,setItem:async(k:string,v:string)=>{data.set(k,v);} };
  const personal = createGardenStore(storage,"personal",initialPersonalGarden);
  const demo = createGardenStore(storage,"demo");
  await personal.update(() => next);
  await demo.update(d => ({...d,sim:{...d.sim,coins:3}}));
  assert.equal((await createGardenStore(storage,"personal").load()).sim.coins,1000);
  assert.equal((await demo.load()).sim.coins,3);
  console.log("✓ calendar rollover resets daily care once, handles DST/backward clocks/missed days, and isolates demo progress");
}
void main();
