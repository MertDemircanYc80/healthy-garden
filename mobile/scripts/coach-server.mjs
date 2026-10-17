// Local jury gateway. Provider keys never enter Expo's bundle or the command journal.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { instruction, planSchema, validateModelPlan } from "./coach-plan.mjs";
const dataset = JSON.parse(
  readFileSync(
    new URL("../src/data/month-health.json", import.meta.url),
    "utf8",
  ),
);
const prepared = JSON.parse(
  readFileSync(
    new URL("../src/data/month-coach.json", import.meta.url),
    "utf8",
  ),
);
const checkpoints = [6, 13, 20, 27, 29];
const httpError = (status, message) =>
  Object.assign(new Error(message), { status });
export function createCoachServer({
  provider = process.env.COACH_PROVIDER || "gemini",
  apiKey = provider === "gemini"
    ? process.env.GEMINI_API_KEY
    : process.env.ANTHROPIC_API_KEY,
  model = process.env.ANALYZE_MODEL ||
    (provider === "gemini" ? "gemini-3.8-flash" : "claude-sonnet-5-5"),
  token = process.env.DEMO_COACH_TOKEN,
  fetchImpl = fetch,
  journalPath,
  cooldownMs = 3000,
} = {}) {
  if (!["gemini", "anthropic"].includes(provider))
    throw new Error("Unknown coach provider");
  let journal = { commands: [], cache: {}, ack: null };
  if (journalPath && existsSync(journalPath)) {
    journal = JSON.parse(readFileSync(journalPath, "utf8"));
    if (!Array.isArray(journal.commands) || !journal.cache)
      throw new Error(
        "Unreadable demo journal; keep a backup before removing it.",
      );
  }
  const save = (next) => {
    if (journalPath) {
      writeFileSync(`${journalPath}.tmp`, JSON.stringify(next), {
        mode: 0o600,
      });
      renameSync(`${journalPath}.tmp`, journalPath);
    }
    journal = next;
  };
  let busy = false;
  let lastStarted = 0;
  let commandBusy = false;
  async function analyze(through, refresh = false) {
    if (!checkpoints.includes(through))
      throw httpError(400, "Choose day 7, 14, 21, 28 or 30.");
    const days = dataset.days.slice(0, through + 1);
    const previousThrough = [...checkpoints].reverse().find((x) => x < through);
    const previous =
      [...journal.commands]
        .reverse()
        .find((c) => c.plan?.through === previousThrough)?.plan ??
      Object.values(journal.cache)
        .reverse()
        .find(
          (p) =>
            p.through === previousThrough &&
            p.provider === provider &&
            p.model === model,
        );
    const previousPlan = previous
      ? {
          through: previous.through,
          source: previous.source,
          summary: previous.summary,
          goals: previous.goals,
        }
      : null;
    const recent = days.slice(
      previousThrough === undefined ? 0 : previousThrough + 1,
    );
    const recentGoalResults =
      previousPlan?.goals.map((g) => ({
        title: g.title,
        target: g.target,
        metric: g.metric,
        daysObserved: recent.length,
        daysHit: recent.filter(
          (d) =>
            typeof d[g.metric] === "number" &&
            (g.direction === "at_least"
              ? d[g.metric] >= g.target
              : d[g.metric] <= g.target),
        ).length,
      })) ?? [];
    const input = JSON.stringify({
      through,
      sources: dataset.sources,
      days,
      previousPlan,
      recentGoalResults,
    });
    // Cache is tied to actual inputs and preceding goals, not just the week number.
    const cacheKey = `${provider}:${model}:${through}:${createHash("sha256").update(input).digest("hex").slice(0, 20)}`;
    if (!refresh && journal.cache[cacheKey])
      return { ...journal.cache[cacheKey], cached: true };
    if (!apiKey)
      throw httpError(
        503,
        "AI anahtarı eksik. Önce npm run demo:setup çalıştırın. Prova için --prepared kullanabilirsiniz.",
      );
    if (busy || Date.now() - lastStarted < cooldownMs)
      throw httpError(429, "Birkaç saniye bekleyip tekrar deneyin.");
    busy = true;
    lastStarted = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const gemini = provider === "gemini";
      const response = await fetchImpl(
        gemini
          ? "https://generativelanguage.googleapis.com/v1beta/interactions"
          : "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          signal: controller.signal,
          headers: gemini
            ? { "content-type": "application/json", "x-goog-api-key": apiKey }
            : {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
              },
          body: JSON.stringify(
            gemini
              ? {
                  model,
                  store: false,
                  input: `${instruction}\n\n${input}`,
                  response_format: {
                    type: "text",
                    mime_type: "application/json",
                    schema: planSchema,
                  },
                }
              : {
                  model,
                  max_tokens: 3200,
                  system: `${instruction}\nSchema: ${JSON.stringify(planSchema)}`,
                  messages: [{ role: "user", content: input }],
                },
          ),
        },
      );
      if (!response.ok)
        throw httpError(
          response.status === 429 ? 429 : 502,
          `AI isteği başarısız (${response.status}). Anahtar/model/kotayı AI Studio'da kontrol edin. Veri ve ödüller değişmedi.`,
        );
      const body = await response.json();
      if (
        (gemini && body.status !== "completed") ||
        ["max_tokens", "refusal"].includes(body.stop_reason)
      )
        throw httpError(
          502,
          "AI tamamlanmış bir plan döndürmedi; tekrar deneyin.",
        );
      const blocks = gemini
        ? (body.steps ?? [])
            .filter((s) => s.type === "model_output")
            .flatMap((s) => s.content ?? [])
        : (body.content ?? []);
      const output = blocks
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, "");
      const plan = {
        ...validateModelPlan(JSON.parse(output)),
        through,
        source: "live_ai",
        provider,
        model,
        generatedAt: new Date().toISOString(),
        cached: false,
      };
      save({ ...journal, cache: { ...journal.cache, [cacheKey]: plan } });
      return plan;
    } finally {
      clearTimeout(timeout);
      busy = false;
    }
  }
  return createServer(async (req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    };
    if (req.method === "OPTIONS") return reply(200, {});
    if (!token || req.headers.authorization !== `Bearer ${token}`)
      return reply(401, { error: "Demo token required" });
    try {
      if (req.method === "GET" && req.url === "/status")
        return reply(200, {
          provider,
          model,
          keyConfigured: !!apiKey,
          commands: journal.commands.length,
          ack: journal.ack,
        });
      if (req.method === "GET" && req.url === "/demo/commands")
        return reply(200, { commands: journal.commands });
      if (req.method !== "POST")
        return reply(404, { error: "Unknown endpoint" });
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 80000)
          return reply(413, { error: "Request too large" });
      }
      const data = JSON.parse(raw);
      if (req.url === "/analyze")
        return reply(200, await analyze(data.through, data.refresh === true));
      if (req.url === "/demo/ack") {
        if (
          !journal.commands.some((c) => c.id === data.id) ||
          typeof data.ok !== "boolean" ||
          !Number.isInteger(data.day) ||
          data.day < 0 ||
          data.day > 30
        )
          throw httpError(400, "Invalid receipt");
        const ack = {
          id: data.id,
          ok: data.ok,
          day: data.day,
          gold: Number.isSafeInteger(data.gold) ? data.gold : 0,
          message: String(data.message ?? "").slice(0, 400),
          at: new Date().toISOString(),
        };
        save({ ...journal, ack });
        return reply(200, { ok: true });
      }
      if (req.url !== "/demo/command")
        return reply(404, { error: "Unknown endpoint" });
      if (commandBusy) throw httpError(409, "Bir önceki komut hazırlanıyor.");
      commandBusy = true;
      try {
        if (!["week", "next", "finish", "reset"].includes(data.type))
          throw httpError(400, "Unknown demo command");
        if (journal.commands.length >= 400 && data.type !== "reset")
          throw httpError(
            409,
            "Demo komutları doldu; reset ile yeni çekim başlatın.",
          );
        const command = { id: randomUUID(), type: data.type };
        if (data.type === "week") {
          if (!Number.isInteger(data.week) || data.week < 1 || data.week > 5)
            throw httpError(400, "week 1–5 kullanın; 5 son iki gündür.");
          if (
            data.week > 1 &&
            !journal.commands.some(
              (c) => c.type === "week" && c.week === data.week - 1,
            )
          )
            throw httpError(
              409,
              `Önce week ${data.week - 1} yükleyin; hedefler geriye dönük ödül vermez.`,
            );
          command.week = data.week;
          command.plan =
            data.prepared === true
              ? prepared.plans.find(
                  (p) => p.through === checkpoints[data.week - 1],
                )
              : await analyze(checkpoints[data.week - 1]);
        }
        // Reset starts a new command stream. Old on-device command IDs are kept for deduplication.
        save({
          ...journal,
          commands:
            data.type === "reset" ? [command] : [...journal.commands, command],
          ack: null,
        });
        return reply(200, command);
      } finally {
        commandBusy = false;
      }
    } catch (error) {
      reply(error.status ?? 502, {
        error:
          error.name === "AbortError"
            ? "AI zaman aşımı; tekrar deneyin. Veriler değişmedi."
            : error.status
              ? error.message
              : "İşlem tamamlanamadı. Mevcut verileriniz korundu.",
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
    console.error("Önce npm run demo:setup çalıştırın.");
    process.exitCode = 1;
  } else
    createCoachServer({
      journalPath: resolve(".demo-control.local.json"),
    }).listen(port, host, () =>
      console.log(
        `Demo + AI hazır: http://${host}:${port} · ${process.env.COACH_PROVIDER || "gemini"}. Bu terminal açık kalsın.`,
      ),
    );
}
