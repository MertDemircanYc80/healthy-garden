// Plant art. Placeholder emoji scaled by growth stage (plan §18 fallback).
// Design lead: replace `plantGlyph` with sprites/SVG per stage — callers won't change.
import { SHOP_ITEMS } from "@/lib/economy";
import type { GardenPlant, GrowthStage, ShopItemId } from "@/lib/types";

const STAGE_SCALE: Record<GrowthStage, number> = { seed: 0.45, sprout: 0.6, young: 0.75, mature: 0.9, blooming: 1.05 };

export function plantGlyph(itemId: ShopItemId, stage: GrowthStage): { glyph: string; badge?: string } {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (stage === "seed") return { glyph: "🟤" };
  if (stage === "sprout") return { glyph: "🌱" };
  if (stage === "young") return { glyph: "🌿" };
  if (item?.type === "tree") {
    if (stage !== "blooming") return { glyph: "🌳" };
    return { glyph: "🌳", badge: itemId === "fruit_sapling" ? "🍎" : "✨" };
  }
  // Flowers: mature shows the flower small and still; blooming adds sway + sparkle.
  return { glyph: item?.emoji ?? "🌸", badge: stage === "blooming" ? "✨" : undefined };
}

export const STAGE_LABEL: Record<GrowthStage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  young: "Young",
  mature: "Mature",
  blooming: "Blooming",
};

export function PlantArt({ plant, size = 44 }: { plant: GardenPlant; size?: number }) {
  const { glyph, badge } = plantGlyph(plant.itemId, plant.stage);
  const scale = STAGE_SCALE[plant.stage];
  return (
    <span
      key={plant.stage}
      className={`hg-pop relative inline-flex items-end justify-center ${plant.isDormant ? "opacity-45 grayscale" : ""}`}
      style={{ fontSize: size * scale, lineHeight: 1 }}
    >
      <span className={plant.stage === "blooming" && !plant.isDormant ? "hg-sway" : ""}>{glyph}</span>
      {badge && <span className="absolute -right-1 top-0 text-[0.4em]">{badge}</span>}
    </span>
  );
}
