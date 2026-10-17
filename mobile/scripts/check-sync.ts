import assert from "node:assert/strict";
import { createHealthStore } from "../src/lib/health/store";

async function main() {
  const data = new Map<string,string>();
  let fail = false;
  const storage = { getItem: async (k:string) => data.get(k) ?? null, setItem: async (k:string,v:string) => { if (fail) throw Error("disk"); data.set(k,v); } };
  const store = createHealthStore(storage);
  await Promise.all([store.save([{date:"2026-10-17",steps:100}], ["steps"]), store.save([{date:"2026-10-17",feed_minutes:10}], ["feed_minutes"])]);
  assert.equal((await store.load()).days[0].steps,100);
  assert.equal((await store.load()).days[0].feed_minutes,10);
  await assert.rejects(store.flush(async () => { throw Error("offline"); }));
  assert.equal((await createHealthStore(storage).load()).pending.length,1);
  let uploads = 0;
  await store.flush(async p => {
    uploads++;
    if (uploads === 1) { assert.equal(p.row.feed_minutes,10); await store.save([{date:"2026-10-17",feed_minutes:25}], ["feed_minutes"]); }
    else assert.equal(p.row.feed_minutes,25);
  });
  assert.equal(uploads,2);
  assert.equal((await store.load()).pending.length,0);
  fail = true;
  await assert.rejects(store.save([{date:"2026-10-17",feed_minutes:99}], ["feed_minutes"]));
  assert.equal((await store.load()).days[0].feed_minutes,25);
  fail = false;
  await store.setSyncEnabled(false);
  await store.save([{date:"2026-10-17",feed_minutes:30}], ["feed_minutes"]);
  await store.flush(async () => { throw Error("must not upload while disconnected"); });
  assert.equal((await store.load()).days[0].feed_minutes,30);
  await store.clear();
  assert.equal((await createHealthStore(storage).load()).days.length,0);
  console.log("✓ health updates serialize, survive offline/reload, preserve in-flight edits, report disk failures, and respect disconnect");
}
void main();
