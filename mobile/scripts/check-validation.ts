import assert from "node:assert/strict";
import { validateHealthRow } from "../src/lib/health/validation";
assert.equal(validateHealthRow({date:"2026-10-17", steps:0, nutrition:{waterMl:1500}}).steps,0);
for (const bad of [{date:"2026-02-30"},{date:"2026-10-17", user_id:"someone-else"},{date:"2026-10-17", steps:-1},{date:"2026-10-17",steps:Infinity},{date:"2026-10-17",feed_minutes:1441},{date:"2026-10-17",nutrition:{waterMl:-1}},{date:"2026-10-17",nutrition:{unknown:1}},{date:"2026-10-17",bedtime:"25:00"}]) assert.throws(()=>validateHealthRow(bad));
console.log("✓ health input validation rejects ownership injection, invalid dates, non-finite and out-of-range data");
