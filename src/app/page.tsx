"use client";

// Home / Garden screen (plan §13.2 + §13.5 planting).
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useGame } from "@/components/GameProvider";
import { PlantArt, STAGE_LABEL } from "@/components/Plant";
import { Bar, Button, PageHeader, Sheet } from "@/components/ui";
import { GARDEN_GRID, SHOP_ITEMS } from "@/lib/economy";
import { fertilize, plant, plantAt, todayView, water, type GameState } from "@/lib/game/engine";
import type { GardenPlant } from "@/lib/types";

type Selection = { x: number; y: number } | null;

// three.js only runs in the browser.
const Garden3D = dynamic(() => import("@/components/garden3d/Garden3D"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-4xl"><span className="animate-pulse">🌱</span></div>,
});

function useWebGL() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let supported = false;
    try {
      const c = document.createElement("canvas");
      supported = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      supported = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection needs the DOM
    setOk(supported);
  }, []);
  return ok;
}

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
  const webgl = useWebGL();
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

      <section className="relative -mx-4 h-[58dvh] min-h-[360px] overflow-hidden sm:mx-0 sm:rounded-3xl">
        {webgl === false ? (
          <GardenGrid2D onSelect={(x, y) => setSel({ x, y })} />
        ) : webgl ? (
          <Garden3D
            plants={state.plants}
            sunlight={v.sunlight}
            health={v.health}
            selectedPlantId={selected?.id}
            selectedPlot={sel && !selected ? sel : null}
            onSelectPlant={(p) => setSel({ x: p.gridX, y: p.gridY })}
            onSelectPlot={(x, y) => setSel({ x, y })}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-between gap-2">
          <Chip label="☀️ Sunlight" value={v.sunlight} tone="sun" />
          <Chip label="🌿 Health" value={v.health} tone="leaf" />
        </div>
        {webgl && (
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-black/45">
            Drag to look around · tap the soil to plant
          </p>
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

function Chip({ label, value, tone }: { label: string; value: number; tone: "sun" | "leaf" }) {
  return (
    <div className="w-[46%] rounded-2xl bg-white/85 px-3 py-2 shadow-sm backdrop-blur dark:bg-black/55">
      <div className="flex justify-between text-[11px] font-semibold">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1">
        <Bar value={value} tone={tone} />
      </div>
    </div>
  );
}

/** Fallback for devices without WebGL: the original grid. */
function GardenGrid2D({ onSelect }: { onSelect: (x: number, y: number) => void }) {
  const { state } = useGame();
  return (
    <div
      className="grid h-full content-center gap-1.5 bg-[color-mix(in_oklab,var(--soil)_28%,var(--leaf-soft))] p-3 pt-20"
      style={{ gridTemplateColumns: `repeat(${GARDEN_GRID.cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: GARDEN_GRID.rows }).flatMap((_, y) =>
        Array.from({ length: GARDEN_GRID.cols }).map((__, x) => {
          const p = plantAt(state, x, y);
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              onClick={() => onSelect(x, y)}
              className="relative flex aspect-square items-end justify-center rounded-xl bg-soil/35 pb-0.5"
              aria-label={p ? `${STAGE_LABEL[p.stage]} ${p.itemId.replace("_", " ")}` : "Empty spot"}
            >
              {p ? <PlantArt plant={p} size={30} /> : <span className="mb-2 text-sm text-foreground/20">+</span>}
            </button>
          );
        }),
      )}
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
