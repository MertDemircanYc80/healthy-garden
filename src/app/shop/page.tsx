"use client";

// Shop screen (plan §13.4): buy seeds, trees, tools. Purchases land in your bag.
import { useGame } from "@/components/GameProvider";
import { Button, PageHeader } from "@/components/ui";
import { SHOP_ITEMS } from "@/lib/economy";
import { balanceOf, buy } from "@/lib/game/engine";

const EFFECT: Record<string, string> = {
  flower: "Blooms in",
  tree: "Matures in",
};

export default function ShopPage() {
  const { state, run } = useGame();
  const balance = balanceOf(state);

  return (
    <div>
      <PageHeader title="Shop" subtitle="Spend what your habits earned" />
      <ul className="grid grid-cols-2 gap-3">
        {SHOP_ITEMS.map((item) => {
          const owned = state.inventory[item.id] ?? 0;
          const ownedTool = item.type === "tool" && owned > 0;
          const affordable = balance >= item.price;
          return (
            <li key={item.id} className="flex flex-col rounded-2xl bg-card p-4 text-center shadow-sm">
              <div className="text-4xl" aria-hidden>
                {item.emoji}
              </div>
              <p className="mt-2 font-medium">{item.name}</p>
              <p className="flex-1 text-xs text-muted">
                {item.growthDays
                  ? `${EFFECT[item.type]} ${item.growthDays} days of care`
                  : item.type === "tool"
                    ? "Unlocks daily watering"
                    : "Doubles one plant's growth for a day"}
              </p>
              {owned > 0 && <p className="mt-1 text-xs font-medium text-leaf">{ownedTool ? "Owned" : `In bag: ${owned}`}</p>}
              <Button
                className="mt-3 w-full"
                variant={affordable && !ownedTool ? "primary" : "soft"}
                disabled={ownedTool}
                onClick={() => run((s) => buy(s, item.id))}
              >
                {ownedTool ? "✓ Owned" : `${item.price} 🪙`}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
