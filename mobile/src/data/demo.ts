// Demo content for the UI phase. Shaped exactly like what the AI analysis will write to
// Supabase later (goals, insights, reports, alerts), so screens won't change when it's real.
import type { Alert, Goal, Insight, Plant, Report, Today } from "@/types";

export const demoToday: Today = { sunlight: 0.67, health: 0.81, coins: 460, streak: 5 };

export const demoPlants: Plant[] = [
  { id: "p1", species: "oak", col: 0, row: 0, stage: "mature", growth: 0.6, wateredToday: true, resting: false },
  { id: "p2", species: "sunflower", col: 1, row: 0, stage: "blooming", growth: 1, wateredToday: true, resting: false },
  { id: "p3", species: "sunflower", col: 2, row: 0, stage: "blooming", growth: 1, wateredToday: true, resting: false },
  { id: "p4", species: "fruit_tree", col: 3, row: 0, stage: "blooming", growth: 1, wateredToday: true, resting: false },
  { id: "p5", species: "cherry_tree", col: 5, row: 0, stage: "blooming", growth: 1, wateredToday: false, resting: false },
  { id: "p6", species: "tulip", col: 0, row: 1, stage: "blooming", growth: 1, wateredToday: true, resting: false, variant: 2 },
  { id: "p7", species: "tulip", col: 1, row: 1, stage: "blooming", growth: 1, wateredToday: true, resting: false, variant: 0 },
  { id: "p8", species: "rose", col: 2, row: 1, stage: "blooming", growth: 1, wateredToday: true, resting: false },
  { id: "p9", species: "lavender", col: 4, row: 1, stage: "blooming", growth: 1, wateredToday: false, resting: false },
  { id: "p10", species: "lavender", col: 5, row: 1, stage: "young", growth: 0.4, wateredToday: false, resting: false },
  { id: "p11", species: "daisy", col: 0, row: 2, stage: "blooming", growth: 1, wateredToday: true, resting: false },
  { id: "p12", species: "marigold", col: 1, row: 2, stage: "blooming", growth: 1, wateredToday: true, resting: false },
  { id: "p13", species: "daisy", col: 3, row: 2, stage: "sprout", growth: 0.5, wateredToday: false, resting: false },
  { id: "p14", species: "marigold", col: 5, row: 2, stage: "young", growth: 0.3, wateredToday: false, resting: true },
  { id: "p15", species: "tulip", col: 2, row: 3, stage: "mature", growth: 0.7, wateredToday: true, resting: false, variant: 1 },
  { id: "p16", species: "daisy", col: 4, row: 3, stage: "seed", growth: 0.2, wateredToday: false, resting: false },
];

export const demoGoals: Goal[] = [
  {
    id: "g1",
    title: "Phone down by 11:15 pm",
    metric: "bedtime",
    target: 23.25,
    unit: "",
    direction: "at_most",
    current: 23.6,
    reason: "On nights you scroll past 11:30 pm you sleep 52 minutes less. Your best mornings started with lights out before 11:15.",
    reward: 25,
    daysHit: 3,
    daysTotal: 7,
  },
  {
    id: "g2",
    title: "7,500 steps a day",
    metric: "steps",
    target: 7500,
    unit: "steps",
    direction: "at_least",
    current: 5240,
    reason: "You average 6,100. This is a nudge, not a leap — about one extra 15-minute walk.",
    reward: 20,
    daysHit: 4,
    daysTotal: 7,
  },
  {
    id: "g3",
    title: "Under 60 min in feed apps",
    metric: "feed_minutes",
    target: 60,
    unit: "min",
    direction: "at_most",
    current: 48,
    reason: "Instagram and TikTok took 1 h 34 min a day last week, mostly in sessions after 9 pm.",
    reward: 25,
    daysHit: 2,
    daysTotal: 7,
  },
  {
    id: "g4",
    title: "20 minutes of daylight",
    metric: "daylight_minutes",
    target: 20,
    unit: "min",
    direction: "at_least",
    current: 12,
    reason: "Days with 20+ minutes outside were your best-mood, best-sleep days in October.",
    reward: 15,
    daysHit: 5,
    daysTotal: 7,
  },
];

export const demoInsights: Insight[] = [
  {
    id: "i1",
    kind: "pattern",
    title: "Your late scroll costs you sleep",
    body: "Every time feed apps ran past 11:30 pm, you slept under 6.5 hours and walked 2,000 fewer steps the next day.",
    evidence: "4 of the last 5 late-scroll nights",
    action: "Leave your phone charging outside the bedroom tonight.",
  },
  {
    id: "i2",
    kind: "suggestion",
    title: "Swap one short drive for a walk",
    body: "You drove 6 minutes to the same place three times this week. Walking it would cover most of today's step goal.",
    evidence: "3 short drives, avg 1.1 km",
    action: "Walk there tomorrow and water your sunflowers with the steps.",
  },
  {
    id: "i3",
    kind: "praise",
    title: "Your mornings are getting steadier",
    body: "You woke up within 20 minutes of 7:00 on five days — your most consistent week this month.",
    evidence: "5 of 7 days",
  },
  {
    id: "i4",
    kind: "suggestion",
    title: "Protein looks low on training days",
    body: "On the two days you ran, logged protein was about 55 g. A protein-rich breakfast could help you recover.",
    evidence: "From meals logged in Apple Health",
    action: "Add eggs or yogurt to tomorrow's breakfast.",
  },
];

export const demoReport: Report = {
  periodLabel: "Oct 10 – 16",
  score: 74,
  scoreChange: 6,
  summary: "A better week: steadier mornings and more steps. Late-night scrolling is still the one habit pulling your sleep down.",
  metrics: [
    { metric: "sleep_minutes", label: "Sleep", unit: "h", week: [6.2, 7.1, 6.0, 7.4, 7.2, 6.4, 7.5], goal: 7, better: "higher", note: "Avg 6 h 50 min, best after early nights" },
    { metric: "steps", label: "Steps", unit: "k", week: [4.2, 6.8, 5.1, 8.3, 7.9, 3.6, 5.2], goal: 7.5, better: "higher", note: "Avg 5,900, weekends dip" },
    { metric: "feed_minutes", label: "Feed apps", unit: "min", week: [112, 95, 130, 70, 64, 88, 48], goal: 60, better: "lower", note: "Down 21% from last week" },
    { metric: "active_minutes", label: "Active", unit: "min", week: [18, 34, 12, 45, 38, 10, 22], goal: 30, better: "higher", note: "Two runs this week" },
    { metric: "daylight_minutes", label: "Daylight", unit: "min", week: [8, 24, 15, 31, 22, 6, 12], goal: 20, better: "higher", note: "Best on days you walked to class" },
    { metric: "driving_minutes", label: "Driving", unit: "min", week: [42, 18, 36, 12, 20, 55, 25], better: "lower", note: "3 drives under 2 km" },
  ],
};

export const demoAlerts: Alert[] = [
  { id: "a1", level: "nudge", title: "45 minutes on Instagram", body: "That's most of today's feed budget. Your lavender would love a walk instead.", time: "8:02 pm", read: false },
  { id: "a2", level: "heads_up", title: "Wind-down in 45 minutes", body: "Aim for phone down by 11:15 pm to keep your sleep goal on track.", time: "7:30 pm", read: false },
  { id: "a3", level: "heads_up", title: "Your marigold is resting", body: "It missed two days of care. Water it today and it wakes right up.", time: "9:10 am", read: true },
  { id: "a4", level: "celebrate", title: "5-day streak", body: "You've hit at least two goals five days in a row. +30 coins.", time: "Yesterday", read: true },
];
