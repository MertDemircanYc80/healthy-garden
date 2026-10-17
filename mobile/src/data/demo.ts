// The demo persona's garden on the morning of the demo day. A few plants are already in bloom;
// most are still growing so a demo video can show them grow with Next day.
// Goals, coach insights, report and alerts come from demo-coach.json (see src/demo/simulation.ts).
import type { Plant } from "@/types";

export const demoPlants: Plant[] = [
  { id: "p1", species: "oak", col: 0, row: 0, stage: "young", growth: 0.6, wateredToday: false, resting: false },
  { id: "p2", species: "sunflower", col: 1, row: 0, stage: "blooming", growth: 1, wateredToday: false, resting: false },
  { id: "p3", species: "sunflower", col: 2, row: 0, stage: "mature", growth: 0.5, wateredToday: false, resting: false },
  { id: "p4", species: "fruit_tree", col: 3, row: 0, stage: "mature", growth: 0.4, wateredToday: false, resting: false },
  { id: "p5", species: "cherry_tree", col: 5, row: 0, stage: "blooming", growth: 1, wateredToday: false, resting: false },
  { id: "p6", species: "tulip", col: 0, row: 1, stage: "blooming", growth: 1, wateredToday: false, resting: false, variant: 2 },
  { id: "p7", species: "tulip", col: 1, row: 1, stage: "mature", growth: 0.6, wateredToday: false, resting: false, variant: 0 },
  { id: "p8", species: "rose", col: 2, row: 1, stage: "young", growth: 0.7, wateredToday: false, resting: false },
  { id: "p9", species: "lavender", col: 4, row: 1, stage: "blooming", growth: 1, wateredToday: false, resting: false },
  { id: "p10", species: "lavender", col: 5, row: 1, stage: "young", growth: 0.4, wateredToday: false, resting: false },
  { id: "p11", species: "daisy", col: 0, row: 2, stage: "blooming", growth: 1, wateredToday: false, resting: false },
  { id: "p12", species: "marigold", col: 1, row: 2, stage: "mature", growth: 0.3, wateredToday: false, resting: false },
  { id: "p13", species: "daisy", col: 3, row: 2, stage: "sprout", growth: 0.5, wateredToday: false, resting: false },
  { id: "p14", species: "marigold", col: 5, row: 2, stage: "young", growth: 0.3, wateredToday: false, resting: true },
  { id: "p15", species: "tulip", col: 2, row: 3, stage: "young", growth: 0.7, wateredToday: false, resting: false, variant: 1 },
  { id: "p16", species: "daisy", col: 4, row: 3, stage: "seed", growth: 0.4, wateredToday: false, resting: false },
];
