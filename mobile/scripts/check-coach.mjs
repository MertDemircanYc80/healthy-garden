import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCoachServer } from "./coach-server.mjs";
import { validateModelPlan } from "./coach-plan.mjs";
const packets = JSON.parse(
  readFileSync(new URL("../src/data/month-coach.json", import.meta.url)),
).plans;
const token = "test-demo-code";
const dir = mkdtempSync(join(tmpdir(), "garden-coach-"));
const journalPath = join(dir, "journal.json");
const active = [];
async function start(options) {
  const server = createCoachServer({ token, cooldownMs: 0, ...options });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  active.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (path, data, auth = token) =>
    fetch(`${base}${path}`, {
      method: data ? "POST" : "GET",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${auth}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
}
let calls = 0;
let fail = false;
const seen = [];
const geminiFetch = async (url, request) => {
  assert.equal(
    url,
    "https://generativelanguage.googleapis.com/v1beta/interactions",
  );
  assert.equal(request.headers["x-goog-api-key"], "test-key");
  const body = JSON.parse(request.body);
  assert.equal(body.store, false);
  assert.equal(body.response_format.mime_type, "application/json");
  assert.equal(body.model, "gemini-3.8-flash");
  const input = JSON.parse(body.input.split("\n\n").at(-1));
  seen.push(input);
  calls++;
  assert.equal(input.days.length, input.through + 1);
  assert.equal(
    input.days.some((d) => d.date === "2099-01-01"),
    false,
  );
  if (fail) return new Response("quota", { status: 429 });
  return Response.json({
    status: "completed",
    steps: [
      { type: "thought", signature: "ignored" },
      {
        type: "model_output",
        content: [
          {
            type: "text",
            text: JSON.stringify(
              packets.find((p) => p.through === input.through),
            ),
          },
        ],
      },
    ],
  });
};
try {
  const request = await start({
    provider: "gemini",
    apiKey: "test-key",
    journalPath,
    fetchImpl: geminiFetch,
  });
  assert.equal(
    (await request("/demo/commands", undefined, "wrong")).status,
    401,
  );
  assert.equal((await request("/analyze", { through: 7 })).status, 400);
  assert.equal(calls, 0);
  let r = await request("/analyze", {
    through: 6,
    days: [{ date: "2099-01-01", steps: 999999 }],
  });
  assert.equal(r.status, 200);
  const p = await r.json();
  assert.equal(p.source, "live_ai");
  assert.equal(p.cached, false);
  assert.equal(p.provider, "gemini");
  assert.equal(seen[0].days.at(-1).date, "2019-11-08");
  r = await request("/analyze", { through: 6 });
  assert.equal((await r.json()).cached, true);
  assert.equal(calls, 1);
  assert.equal(
    (await request("/demo/command", { type: "week", week: 2 })).status,
    409,
  );
  r = await request("/demo/command", { type: "week", week: 1 });
  const w1 = await r.json();
  assert.equal(w1.plan.cached, true);
  assert.equal(calls, 1);
  r = await request("/demo/command", { type: "week", week: 2 });
  const w2 = await r.json();
  assert.equal(w2.plan.through, 13);
  assert.equal(calls, 2);
  assert.equal(seen[1].previousPlan.through, 6);
  assert.equal(seen[1].recentGoalResults[0].daysObserved, 7);
  fail = true;
  r = await request("/demo/command", { type: "week", week: 3 });
  assert.equal(r.status, 429);
  assert.equal(
    (await (await request("/demo/commands")).json()).commands.length,
    2,
  );
  // Explicit offline rehearsal remains usable when cloud quota is exhausted.
  r = await request("/demo/command", { type: "week", week: 3, prepared: true });
  assert.equal((await r.json()).plan.source, "prepared_ai");
  assert.equal(
    (
      await request("/demo/ack", {
        id: w2.id,
        ok: true,
        day: 14,
        gold: 120,
        message: "saved",
      })
    ).status,
    200,
  );
  assert.equal((await (await request("/status")).json()).ack.gold, 120);
  // Restart retains both queued commands and cached live answers without printing the key.
  const restarted = await start({
    provider: "gemini",
    apiKey: "test-key",
    journalPath,
    fetchImpl: geminiFetch,
  });
  assert.equal(
    (await (await restarted("/demo/commands")).json()).commands[0].id,
    w1.id,
  );
  assert.equal(
    (await (await restarted("/analyze", { through: 6 })).json()).cached,
    true,
  );
  assert.equal(readFileSync(journalPath, "utf8").includes("test-key"), false);
  await request("/demo/command", { type: "reset" });
  assert.equal(
    (await (await request("/demo/commands")).json()).commands.length,
    1,
  );
  // Switching rehearsal/live goals must invalidate the next week's old cached context.
  await request("/demo/command", { type: "week", week: 1, prepared: true });
  fail = false;
  const beforeContextChange = calls;
  const changedContext = await request("/analyze", { through: 13 });
  assert.equal(changedContext.status, 200);
  assert.equal((await changedContext.json()).cached, false);
  assert.equal(calls, beforeContextChange + 1);
  assert.equal(seen.at(-1).previousPlan.source, "prepared_ai");
  const missing = await start({ provider: "gemini", apiKey: "" });
  assert.equal(
    (await missing("/demo/command", { type: "week", week: 1 })).status,
    503,
  );
  assert.equal(
    (
      await (
        await missing("/demo/command", {
          type: "week",
          week: 1,
          prepared: true,
        })
      ).json()
    ).plan.source,
    "prepared_ai",
  );
  const anthropic = await start({
    provider: "anthropic",
    model: "test-model",
    apiKey: "test-key",
    cooldownMs: 3000,
    fetchImpl: async (_url, req) => {
      const body = JSON.parse(req.body);
      assert.equal(JSON.parse(body.messages[0].content).days.length, 7);
      return Response.json({
        content: [{ type: "text", text: JSON.stringify(packets[0]) }],
        stop_reason: "end_turn",
      });
    },
  });
  assert.equal((await anthropic("/analyze", { through: 6 })).status, 200);
  assert.equal((await anthropic("/analyze", { through: 13 })).status, 429);
  assert.throws(
    () =>
      validateModelPlan({
        ...packets[0],
        goals: [{ ...packets[0].goals[0], reward: 9999 }, packets[0].goals[1]],
      }),
    /invalid plan/,
  );
  writeFileSync(join(dir, "bad.json"), "not-json");
  assert.throws(
    () => createCoachServer({ journalPath: join(dir, "bad.json") }),
    SyntaxError,
  );
  console.log(
    "✓ Gemini REST + structured output, auth, no future data, weekly context, cache/restart, commands/receipts, explicit offline fallback, quota failure, Anthropic compatibility (mock providers)",
  );
} finally {
  for (const server of active) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  rmSync(dir, { recursive: true, force: true });
}
