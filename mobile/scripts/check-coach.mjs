import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createCoachServer } from "./coach-server.mjs";
const packet = JSON.parse(
  readFileSync(new URL("../src/data/month-coach.json", import.meta.url)),
).plans[0];
let calls = 0;
const server = createCoachServer({
  apiKey: "test-key",
  token: "test-demo-code",
  fetchImpl: async (_url, request) => {
    calls++;
    const body = JSON.parse(request.body);
    const user = JSON.parse(body.messages[0].content);
    assert.equal(user.days.length, 7);
    assert.equal(user.days.at(-1).date, "2019-11-08");
    assert.equal(user.through, 6);
    return new Response(
      JSON.stringify({
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...packet, source: "live_ai" }),
          },
        ],
        stop_reason: "end_turn",
      }),
      { status: 200 },
    );
  },
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const url = `http://127.0.0.1:${server.address().port}/analyze`;
const request = (data, token = "test-demo-code") =>
  fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
try {
  assert.equal((await request({ through: 6 }, "wrong")).status, 401);
  assert.equal(calls, 0);
  assert.equal((await request({ through: 7 })).status, 400);
  assert.equal(calls, 0);
  const result = await request({
    through: 6,
    days: [{ date: "2099-01-01", steps: 999999 }],
  });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).source, "live_ai");
  assert.equal(calls, 1);
  assert.equal((await request({ through: 6 })).status, 429);
  console.log(
    "✓ live gateway authentication, completed-day cutoff, bundled input isolation and request throttling (mock provider)",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
