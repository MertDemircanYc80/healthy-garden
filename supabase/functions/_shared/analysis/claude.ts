// Minimal Claude Messages API client using Structured Outputs (output_config.format).
// Docs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
import { OUTPUT_SCHEMA, type RawOutput } from "./schema.ts";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export interface LlmCall {
  (system: string, user: string): Promise<{ output: RawOutput; model: string; usage?: unknown }>;
}

export function claudeClient(apiKey: string, model = DEFAULT_MODEL, fetchImpl: typeof fetch = fetch): LlmCall {
  return async (system, user) => {
    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          system,
          messages: [{ role: "user", content: user }],
          output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = `Claude API ${res.status}`;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      const body = await res.json();
      if (!res.ok) throw new Error(`Claude API ${res.status}: ${body?.error?.message ?? "request failed"}`);
      if (body.stop_reason === "refusal") throw new Error("Claude declined to answer");
      if (body.stop_reason === "max_tokens") {
        lastError = "Claude output was cut off";
        continue;
      }
      const text = (body.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
      return { output: JSON.parse(text) as RawOutput, model: body.model ?? model, usage: body.usage };
    }
    throw new Error(lastError || "Claude API failed");
  };
}
