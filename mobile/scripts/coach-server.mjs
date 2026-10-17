// Optional live-AI gateway for the fixed jury replay. Never put an API key in EXPO_PUBLIC_*.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const dataset = JSON.parse(
  readFileSync(
    new URL("../src/data/month-health.json", import.meta.url),
    "utf8",
  ),
);
const cached = JSON.parse(
  readFileSync(
    new URL("../src/data/month-coach.json", import.meta.url),
    "utf8",
  ),
);
const checkpoints = [6, 13, 20, 27, 29];
export function createCoachServer({
  apiKey = process.env.ANTHROPIC_API_KEY,
  model = process.env.ANALYZE_MODEL || "claude-sonnet-5-5",
  token = process.env.DEMO_COACH_TOKEN,
  fetchImpl = fetch,
} = {}) {
  let busy = false;
  let lastStarted = 0;
  return createServer(async (req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    };
    if (req.method === "OPTIONS") return reply(200, {});
    if (req.url !== "/analyze" || req.method !== "POST")
      return reply(404, { error: "Use POST /analyze" });
    if (!token || req.headers.authorization !== `Bearer ${token}`)
      return reply(401, { error: "Demo token required" });
    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 80000)
          return reply(413, { error: "Request too large" });
      }
      const { through } = JSON.parse(raw);
      if (!checkpoints.includes(through))
        return reply(400, { error: "Choose a completed weekly checkpoint" });
      if (!apiKey)
        return reply(503, {
          error: "Live AI is not configured. Use the prepared analysis.",
        });
      if (busy || Date.now() - lastStarted < 3000)
        return reply(429, { error: "Try again in a few seconds" });
      busy = true;
      lastStarted = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        // Use the bundled fixture, never arbitrary client text or future records.
        const days = dataset.days.slice(0, through + 1);
        const template = cached.plans.find((p) => p.through === through);
        const response = await fetchImpl(
          "https://api.anthropic.com/v1/messages",
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: 2600,
              system:
                "You are Healthy Garden's calm lifestyle coach. Return JSON only with the same keys and field types as the example. Analyze only supplied completed days. No diagnoses, medical claims, restrictive calorie goals, shame or fabricated outcomes. Never claim the fictional companion fields were measured or that this replay proves improvement caused by the app. Set 2–4 small goals using steps, sleep_minutes, active_minutes, feed_minutes or daylight_minutes, with rewards from 5 to 50. Sleep targets must be 360–540 minutes, feed targets 30–240, steps 1000–15000, daylight 10–120, active minutes 10–120. Include 2 concise insights based on this data, and a short summary. direction is at_least except feed_minutes, which is at_most. Give every goal and insight a unique string id. source must be live_ai. through must match the supplied cutoff.",
              messages: [
                {
                  role: "user",
                  content: JSON.stringify({
                    through,
                    sources: dataset.sources,
                    days,
                    exampleShape: { ...template, source: "live_ai" },
                  }),
                },
              ],
            }),
          },
        );
        if (!response.ok)
          return reply(502, {
            error: `Model request failed (${response.status}). Prepared replay remains available.`,
          });
        const body = await response.json();
        if (body.stop_reason === "max_tokens" || body.stop_reason === "refusal")
          return reply(502, {
            error: "The model did not return a complete plan",
          });
        const text = (body.content ?? [])
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim()
          .replace(/^```(?:json)?\s*/, "")
          .replace(/\s*```$/, "");
        const plan = JSON.parse(text);
        if (
          plan.through !== through ||
          !Array.isArray(plan.goals) ||
          !Array.isArray(plan.insights)
        )
          return reply(502, { error: "Invalid model response" });
        reply(200, { ...plan, source: "live_ai" });
      } finally {
        clearTimeout(timeout);
        busy = false;
      }
    } catch {
      reply(502, {
        error:
          "The coach could not finish. Your current plan and rewards are safe.",
      });
    }
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const host = process.env.DEMO_COACH_HOST || "127.0.0.1";
  const port = Number(process.env.DEMO_COACH_PORT || 8877);
  if (!process.env.DEMO_COACH_TOKEN) {
    console.error("Set DEMO_COACH_TOKEN in .env.coach.local first.");
    process.exitCode = 1;
  } else
    createCoachServer().listen(port, host, () =>
      console.log(`Demo coach listening on http://${host}:${port}/analyze`),
    );
}
