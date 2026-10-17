const text = { type: "string", minLength: 1, maxLength: 1000 };
const metrics = [
  "steps",
  "sleep_minutes",
  "feed_minutes",
  "daylight_minutes",
  "active_minutes",
];
export const planSchema = {
  type: "object",
  properties: {
    summary: { ...text, maxLength: 1800 },
    goals: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          id: text,
          title: text,
          metric: { type: "string", enum: metrics },
          target: { type: "number", minimum: 1, maximum: 20000 },
          unit: text,
          direction: { type: "string", enum: ["at_least", "at_most"] },
          reason: text,
          reward: { type: "integer", minimum: 5, maximum: 50 },
        },
        required: [
          "id",
          "title",
          "metric",
          "target",
          "unit",
          "direction",
          "reason",
          "reward",
        ],
      },
    },
    insights: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: text,
          kind: { type: "string", enum: ["pattern", "suggestion", "praise"] },
          title: text,
          body: { ...text, maxLength: 1800 },
          evidence: text,
          action: text,
        },
        required: ["id", "kind", "title", "body", "evidence", "action"],
      },
    },
  },
  required: ["summary", "goals", "insights"],
};
export const instruction = `You are Healthy Garden's calm lifestyle coach. Return the requested JSON in concise English. Analyze ONLY supplied completed days; do not infer future results. Set 2–4 achievable goals for the NEXT week and 2 insights explaining the evidence. Read previousPlan and recentGoalResults: keep useful goals, acknowledge missed days kindly, adjust gently. No diagnoses, restrictive calorie goals, shame or claims that this app caused improvement. Wearable fields are public PMData; phone usage, daylight and food are fictional demo additions, never claim those were measured. Sleep target 360–540 minutes, feed target 30–240 minutes, steps 1000–15000, daylight 10–120, active 10–120. direction is at_most for feed_minutes and at_least for everything else. Reward must be integer 5–50 gold. All IDs unique strings. Weekly day 30 analysis is a closing review with next-month suggestions. No markdown fences.`;
export function validateModelPlan(p) {
  const validText = (s, max = 1000) =>
    typeof s === "string" && !!s.trim() && s.length <= max;
  if (
    !p ||
    !validText(p.summary, 1800) ||
    !Array.isArray(p.goals) ||
    p.goals.length < 2 ||
    p.goals.length > 4 ||
    !Array.isArray(p.insights) ||
    p.insights.length > 5 ||
    !p.insights.length ||
    p.goals.some(
      (g) =>
        !g ||
        ![g.id, g.title, g.unit, g.reason].every((s) => validText(s)) ||
        !metrics.includes(g.metric) ||
        !Number.isFinite(g.target) ||
        g.target <= 0 ||
        g.target > (g.metric === "steps" ? 20000 : 600) ||
        (g.metric === "sleep_minutes" && (g.target < 360 || g.target > 540)) ||
        (g.metric === "feed_minutes"
          ? g.direction !== "at_most" || g.target < 30 || g.target > 240
          : g.direction !== "at_least") ||
        !Number.isSafeInteger(g.reward) ||
        g.reward < 5 ||
        g.reward > 50,
    ) ||
    new Set(p.goals.map((g) => g.id)).size !== p.goals.length ||
    p.insights.some(
      (i) =>
        !i ||
        !validText(i.id) ||
        !["pattern", "suggestion", "praise"].includes(i.kind) ||
        !validText(i.title, 1800) ||
        !validText(i.body, 1800) ||
        [i.evidence, i.action].some((s) => s != null && !validText(s, 1800)),
    )
  )
    throw new Error("Model returned an invalid plan. No data was imported.");
  // Strip unknown provider fields before saving or sending to phones.
  return {
    summary: p.summary,
    goals: p.goals.map(
      ({ id, title, metric, target, unit, direction, reason, reward }) => ({
        id,
        title,
        metric,
        target,
        unit,
        direction,
        reason,
        reward,
      }),
    ),
    insights: p.insights.map(({ id, kind, title, body, evidence, action }) => ({
      id,
      kind,
      title,
      body,
      evidence,
      action,
    })),
  };
}
