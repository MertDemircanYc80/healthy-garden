import assert from "node:assert/strict";
import { watchLocalDate } from "../src/lib/localDateClock";
import { initialPersonalGarden, rollGardenDay } from "../src/lib/dailyCycle";
import { createGardenStore } from "../src/lib/savedGarden";

async function main() {
  const originalZone = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  try {
    let now = new Date("2026-03-08T23:59:59.900");
    let nextId = 0;
    const scheduled = new Map<number,{callback:()=>void;delay:number}>();
    const data = new Map<string,string>();
    const storage = {getItem:async(k:string)=>data.get(k)??null,setItem:async(k:string,v:string)=>{data.set(k,v);}};
    const store = createGardenStore(storage);
    const initial = initialPersonalGarden();
    initial.calendarDate = "2026-03-08";
    initial.sim.plants = [{id:"p",species:"daisy",stage:"seed",growth:0,col:0,row:0,wateredToday:true,fertilizedToday:true,resting:false}];
    await store.update(()=>initial);
    let saved = Promise.resolve(initial);
    const seen: string[] = [];
    // No health provider or network is involved: the calendar must run independently.
    const clock = watchLocalDate(date => { seen.push(date); saved = store.update(s=>rollGardenDay(s,date)); }, {
      now:()=>new Date(now),
      schedule:(callback,delay)=>{const id=++nextId;scheduled.set(id,{callback,delay});return id as unknown as ReturnType<typeof setTimeout>;},
      cancel:timer=>{scheduled.delete(Number(timer));},
    });
    await saved;
    assert.equal(seen.at(-1),"2026-03-08");
    assert.equal([...scheduled.values()][0].delay,100);
    now = new Date(now.getTime()+100);
    [...scheduled.values()][0].callback();
    const next = await saved;
    assert.equal(seen.at(-1),"2026-03-09");
    assert.equal(next.sim.plants[0].wateredToday,false);
    assert.equal(next.sim.plants[0].fertilizedToday,false);
    assert.equal(next.sim.coins,1000);
    clock.check(); await saved;
    assert.equal(await store.load(),next); // no double growth or rewards on repeated focus events
    now = new Date("2026-03-12T10:00:00");
    clock.check(); await saved; // returning after the browser/phone was asleep
    assert.equal(seen.at(-1),"2026-03-12");
    assert.equal((await createGardenStore(storage).load()).calendarDate,"2026-03-12");
    now = new Date("2026-03-13T02:00:00Z");
    process.env.TZ = "Asia/Tokyo";
    clock.check(); await saved;
    assert.equal(seen.at(-1),"2026-03-13");
    assert.equal(scheduled.size,1);
    const calls = seen.length;
    clock.stop(); clock.check();
    assert.equal(scheduled.size,0);
    assert.equal(seen.length,calls);
    console.log("✓ automatic local midnight resets daily care without health data; focus catches missed days/timezone changes; reload retains the date; cleanup stops timers");
  } finally { if(originalZone === undefined)delete process.env.TZ;else process.env.TZ=originalZone; }
}
void main();
