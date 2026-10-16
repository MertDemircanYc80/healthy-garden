"use client";

// Home / Garden screen (plan §13.2 + §13.5 planting).
import Link from "next/link";
import { useState } from "react";
import { useGame } from "@/components/GameProvider";
import { PlantArt, STAGE_LABEL } from "@/components/Plant";
import { Bar, Button, PageHeader, Sheet } from "@/components/ui";
import { GARDEN_GRID, SHOP_ITEMS } from "@/lib/economy";
import { fertilize, plant, plantAt, todayView, water, type GameState } from "@/lib/game/engine";
import type { GardenPlant } from "@/lib/types";

type Selection = { x: number; y: number } | null;

function nextHint(state: GameState) {
  const v = todayView(state);
  const seeds = SHOP_ITEMS.filter((i) => i.growthDays && (state.inventory[i.id] ?? 0) > 0);
  const thirsty = state.plants.filter((p) => !p.wateredToday && p.stage !== "blooming");
  if (v.claimableTotal > 0) return { text: `${v.claimableTotal} coins are waiting for you`, href: "/tasks", cta: "Collect" };
  if (seeds.length && state.plants.length < GARDEN_GRID.cols * GARDEN_GRID.rows)
    return { text: "You have a seed in your bag — tap an empty spot to plant it." };
  if (thirsty.length && (state.inventory.watering_can ?? 0) > 0) return { text: `${thirsty.length} plant${thirsty.length > 1 ? "s" : ""} would love some water.` };
  if (state.plants.length === 0) return { text: "Earn coins with healthy habits, then buy your first seed.", href: "/shop", cta: "Shop" };
  return { text: "Your garden is cared for today. Go outside — it grows while you live 🌤️", href: "/tasks", cta: "Tasks" };
}

export default function GardenPage() {
  const { state, run } = useGame();
  const [sel, setSel] = useState<Selection>(null);
  const v = todayView(state);
  const hint = nextHint(state);
  const selected = sel ? plantAt(state, sel.x, sel.y) : undefined;
  const thirsty = state.plants.filter((p) => !p.wateredToday && p.stage !== "blooming");
  const hasCan = (state.inventory.watering_can ?? 0) > 0;

  const waterAll = () =>
    run((s) => {
      let cur = s;
      for (const p of thirsty) {
        const r = water(cur, p.id);
        if (r.ok) cur = r.state;
      }
      return { ok: true, state: cur, message: `Watered ${thirsty.length} plant${thirsty.length > 1 ? "s" : ""} 💧` };
    });

  return (
    <div className="space-y-5">
      <PageHeader title={`Hi, ${state.profile.name}`} />

      <section className="grid grid-cols-2 gap-3 rounded-3xl bg-card p-4 shadow-sm">
        <div>
          <p className="mb-1 text-xs font-medium text-muted">☀️ Sunlight today</p>
          <Bar value={v.sunlight} tone="sun" />
          <p className="mt-1 text-sm font-semibold">{Math.round(v.sunlight * 100)}%</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted">🌿 Garden health (7 days)</p>
          <Bar value={v.health} />
          <p className="mt-1 text-sm font-semibold">{Math.round(v.health * 100)}%</p>
        </div>
      </section>

      <section
        className="grid gap-2 rounded-3xl bg-[color-mix(in_oklab,var(--soil)_28%,var(--leaf-soft))] p-3"
        style={{ gridTemplateColumns: `repeat(${GARDEN_GRID.cols}, minmax(0, 1fr))` }}
        aria-label="Garden"
      >
        {Array.from({ length: GARDEN_GRID.rows }).flatMap((_, y) =>
          Array.from({ length: GARDEN_GRID.cols }).map((__, x) => {
            const p = plantAt(state, x, y);
            return (
              <button
                key={`${x}-${y}`}
                type="button"
                onClick={() => setSel({ x, y })}
                className="relative flex aspect-square items-end justify-center rounded-2xl bg-soil/35 pb-1.5 transition active:scale-95"
                aria-label={p ? `${STAGE_LABEL[p.stage]} ${p.itemId.replace("_", " ")}` : "Empty spot"}
              >
                {p ? <PlantArt plant={p} /> : <span className="mb-3 text-lg text-foreground/20">+</span>}
                {p?.wateredToday && <span className="absolute left-1 top-1 text-xs">💧</span>}
                {p?.isDormant && <span className="absolute right-1 top-1 text-xs">💤</span>}
              </button>
            );
          }),
        )}
      </section>

      <section className="flex items-center justify-between gap-3 rounded-2xl bg-leaf-soft p-3">
        <p className="text-sm">{hint.text}</p>
        {hint.href && (
          <Link href={hint.href} className="shrink-0 rounded-full bg-leaf px-3 py-1.5 text-sm font-semibold text-white">
            {hint.cta}
          </Link>
        )}
      </section>

      {hasCan && thirsty.length > 1 && (
        <Button variant="soft" className="w-full" onClick={waterAll}>
          💧 Water all ({thirsty.length})
        </Button>
      )}

      <Bag />

      <Sheet open={!!sel} onClose={() => setSel(null)} title={selected ? plantName(selected) : "Plant something"}>
        {sel && selected && <PlantDetails plant={selected} onDone={() => setSel(null)} />}
        {sel && !selected && <PlantPicker x={sel.x} y={sel.y} onDone={() => setSel(null)} />}
      </Sheet>
    </div>
  );
}

function plantName(p: GardenPlant) {
  return (SHOP_ITEMS.find((i) => i.id === p.itemId)?.name ?? "Plant").replace(" seed", "").replace(" sapling", " tree");
}

function PlantDetails({ plant: p, onDone }: { plant: GardenPlant; onDone: () => void }) {
  const { state, run } = useGame();
  const item = SHOP_ITEMS.find((i) => i.id === p.itemId)!;
  const total = item.growthDays ?? 1;
  const daysLeft = Math.max(0, Math.ceil(total - p.growthPoints));
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-end justify-center rounded-2xl bg-soil/30 pb-1">
          <PlantArt plant={p} size={60} />
        </div>
        <div className="flex-1">
          <p className="font-medium">
            {STAGE_LABEL[p.stage]}
            {p.isDormant && " · resting 💤"}
          </p>
          <p className="text-xs text-muted">
            {p.stage === "blooming" ? "Fully grown — beautiful work 🌸" : `About ${daysLeft} more day${daysLeft === 1 ? "" : "s"} of care`}
          </p>
          <div className="mt-2">
            <Bar value={p.growthPoints / total} />
          </div>
        </div>
      </div>
      {p.isDormant && <p className="text-sm text-muted">This plant is resting. Water it and it wakes right up — plants never die here.</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => run((s) => water(s, p.id)) && onDone()} disabled={p.wateredToday}>
          {p.wateredToday ? "💧 Watered" : "💧 Water"}
        </Button>
        <Button variant="soft" onClick={() => run((s) => fertilize(s, p.id)) && onDone()} disabled={p.stage === "blooming"}>
          🧪 Fertilize ({state.inventory.fertilizer ?? 0})
        </Button>
      </div>
      <p className="text-xs text-muted">Plants grow overnight when watered and your habits bring sunlight.</p>
    </div>
  );
}

function PlantPicker({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const { state, run } = useGame();
  const seeds = SHOP_ITEMS.filter((i) => i.growthDays && (state.inventory[i.id] ?? 0) > 0);
  if (!seeds.length) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted">No seeds in your bag yet.</p>
        <Link href="/shop" onClick={onDone} className="inline-block rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white">
          Visit the shop
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-3 gap-2">
      {seeds.map((i) => (
        <li key={i.id}>
          <button
            type="button"
            onClick={() => run((s) => plant(s, i.id, x, y)) && onDone()}
            className="w-full rounded-2xl bg-card p-3 text-center shadow-sm active:scale-95"
          >
            <span className="text-3xl">{i.emoji}</span>
            <span className="mt-1 block text-xs font-medium">{i.name}</span>
            <span className="text-xs text-muted">×{state.inventory[i.id]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Bag() {
  const { state } = useGame();
  const items = SHOP_ITEMS.filter((i) => (state.inventory[i.id] ?? 0) > 0);
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted">Your bag</h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((i) => (
          <li key={i.id} className="rounded-full bg-card px-3 py-1 text-sm shadow-sm">
            {i.emoji} {i.name}
            {i.type !== "tool" && <span className="text-muted"> ×{state.inventory[i.id]}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
