import assert from "node:assert/strict";
import { normalizeDemoKey } from "./demo-key.mjs";
// New credential formats can contain dots; format validation is not authentication.
assert.equal(
  normalizeDemoKey("AQ." + "test_only_value".repeat(3)),
  "AQ." + "test_only_value".repeat(3),
);
const sample = "test-only_" + "a".repeat(30);
for (const input of [
  sample,
  `  ${sample}\n`,
  `"${sample}"`,
  `'${sample}'`,
  `“${sample}”`,
  `GEMINI_API_KEY="${sample}"`,
  `export GOOGLE_API_KEY='${sample}'`,
  `\u200b${sample}\ufeff`,
  `\x1b[200~${sample}\x1b[201~`,
])
  assert.equal(normalizeDemoKey(input), sample);
for (const input of [
  "",
  "   ",
  "secret...hidden",
  "secret•••",
  "https://example.com/key",
  "npm run demo:setup",
  `${sample}\nOTHER=private`,
]) {
  assert.throws(
    () => normalizeDemoKey(input),
    (e) => {
      assert.equal(e.message.includes(sample), false);
      if (input.trim()) assert.equal(e.message.includes(input), false);
      return true;
    },
  );
}
console.log(
  "✓ secret input: quotes, copied assignments, invisible characters and paste markers; masked/invalid input rejected without exposing contents",
);
