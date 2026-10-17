// Flat, hand-drawn-style plants. Origin (0,0) = where the stem meets the soil; up is -y.
// Every species has 5 stages: seed → sprout → young → mature (bud) → blooming.
import { memo } from "react";
import { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import type { Plant, Species, Stage } from "@/types";
import { rest, shade, tint } from "./color";

const LEAF = "#4E9A3E";
const LEAF_DARK = "#3A7A32";
const STEM = "#5A9A44";

type P = { stage: Stage; resting: boolean; variant: number };

function Leaf({ x, y, len, angle, color = LEAF, resting }: { x: number; y: number; len: number; angle: number; color?: string; resting: boolean }) {
  // pointed leaf, drawn along +x then rotated
  return (
    <Path
      d={`M0 0 Q ${len * 0.5} ${-len * 0.38} ${len} 0 Q ${len * 0.5} ${len * 0.38} 0 0 Z`}
      fill={rest(color, resting)}
      transform={`translate(${x} ${y}) rotate(${angle})`}
    />
  );
}

function Stem({ h, x = 0, bend = 0, w = 2.2, resting, color = STEM }: { h: number; x?: number; bend?: number; w?: number; resting: boolean; color?: string }) {
  return (
    <Path d={`M ${x} 0 Q ${x + bend} ${-h / 2} ${x + bend * 0.6} ${-h}`} stroke={rest(color, resting)} strokeWidth={w} strokeLinecap="round" fill="none" />
  );
}

function Seed({ resting }: { resting: boolean }) {
  return (
    <G>
      <Ellipse cx={0} cy={-1} rx={7} ry={3.2} fill={rest("#7A4B2C", resting)} />
      <Ellipse cx={0} cy={-2.5} rx={2.2} ry={1.6} fill={rest("#D9B47A", resting)} />
    </G>
  );
}

function Sprout({ resting, size = 1 }: { resting: boolean; size?: number }) {
  return (
    <G scale={size}>
      <Stem h={8} resting={resting} />
      <Leaf x={0} y={-7} len={8} angle={-30} resting={resting} />
      <Leaf x={0} y={-7} len={8} angle={-150} resting={resting} />
    </G>
  );
}

function Petals({ n, r, len, wid, color, resting, offset = 0 }: { n: number; r: number; len: number; wid: number; color: string; resting: boolean; offset?: number }) {
  return (
    <G>
      {Array.from({ length: n }, (_, i) => (
        <Ellipse key={i} cx={r + len / 2} cy={0} rx={len / 2} ry={wid / 2} fill={rest(color, resting)} transform={`rotate(${(360 / n) * i + offset})`} />
      ))}
    </G>
  );
}

// ---------- species ----------

function Daisy({ stage, resting }: P) {
  if (stage === "sprout") return <Sprout resting={resting} />;
  const heads = [
    { x: -6, h: 22, b: -2 },
    { x: 5, h: 27, b: 2 },
    { x: 0, h: 17, b: 0 },
  ];
  const scale = stage === "young" ? 0.6 : 1;
  return (
    <G>
      {heads.map((s, i) => (
        <G key={i}>
          <Stem h={s.h * scale} x={s.x} bend={s.b} resting={resting} />
          {stage === "young" && <Leaf x={s.x} y={-s.h * scale * 0.6} len={7} angle={i % 2 ? -20 : -160} resting={resting} />}
          {stage === "mature" && <Circle cx={s.x + s.b * 0.6} cy={-s.h} r={2.6} fill={rest("#EDEAD2", resting)} />}
          {stage === "blooming" && (
            <G transform={`translate(${s.x + s.b * 0.6} ${-s.h})`}>
              <Petals n={12} r={1.8} len={5.5} wid={2.4} color="#FFFFFF" resting={resting} />
              <Circle r={2.6} fill={rest("#F2C230", resting)} />
            </G>
          )}
        </G>
      ))}
      <Leaf x={0} y={-3} len={9} angle={-20} resting={resting} />
      <Leaf x={0} y={-3} len={9} angle={-160} resting={resting} />
    </G>
  );
}

function Marigold({ stage, resting }: P) {
  if (stage === "sprout") return <Sprout resting={resting} />;
  const heads = [
    { x: -5, h: 18 },
    { x: 6, h: 22 },
  ];
  const scale = stage === "young" ? 0.6 : 1;
  return (
    <G>
      {heads.map((s, i) => (
        <G key={i}>
          <Stem h={s.h * scale} x={s.x} resting={resting} color={LEAF_DARK} />
          {stage === "mature" && <Circle cx={s.x} cy={-s.h} r={3} fill={rest("#E8590C", resting)} />}
          {stage === "blooming" && (
            <G transform={`translate(${s.x} ${-s.h})`}>
              <Circle r={6.5} fill={rest("#E8590C", resting)} />
              <Circle r={4.6} fill={rest("#F76707", resting)} />
              <Circle r={2.6} fill={rest("#FFA94D", resting)} />
            </G>
          )}
        </G>
      ))}
      <Leaf x={0} y={-4} len={10} angle={-25} color={LEAF_DARK} resting={resting} />
      <Leaf x={0} y={-6} len={9} angle={-155} color={LEAF_DARK} resting={resting} />
    </G>
  );
}

function Lavender({ stage, resting }: P) {
  if (stage === "sprout") return <Sprout resting={resting} size={0.9} />;
  const spikes = [-8, -4, 0, 4, 8];
  const h = stage === "young" ? 14 : 28;
  const buds = stage === "blooming" ? 6 : stage === "mature" ? 3 : 0;
  return (
    <G>
      {spikes.map((x, i) => {
        const top = h - Math.abs(x) * 0.6;
        const lean = x * 0.5;
        return (
          <G key={i}>
            <Path d={`M ${x * 0.3} 0 L ${x * 0.3 + lean} ${-top}`} stroke={rest("#7F9C6C", resting)} strokeWidth={1.6} strokeLinecap="round" />
            {Array.from({ length: buds }, (_, b) => (
              <Ellipse
                key={b}
                cx={x * 0.3 + lean * (1 - b * 0.06)}
                cy={-top + b * 2.6}
                rx={1.8}
                ry={2.2}
                fill={rest(b % 2 ? "#9B7FD4" : "#7E5FBF", resting)}
              />
            ))}
          </G>
        );
      })}
      <Leaf x={0} y={-2} len={9} angle={-15} color="#86A477" resting={resting} />
      <Leaf x={0} y={-2} len={9} angle={-165} color="#86A477" resting={resting} />
    </G>
  );
}

const TULIP = ["#E03131", "#F06595", "#FAB005", "#AE3EC9"];

function TulipHead({ color, resting }: { color: string; resting: boolean }) {
  const c = rest(color, resting);
  return (
    <G>
      <Path d="M -5 -1 Q -6 -9 -2.5 -11 L 0 -7 L 2.5 -11 Q 6 -9 5 -1 Q 0 3 -5 -1 Z" fill={c} />
      <Path d="M -2.5 -11 L 0 -7 L 2.5 -11 Q 0 -13 -2.5 -11 Z" fill={shade(c, 0.18)} />
    </G>
  );
}

function Tulip({ stage, resting, variant }: P) {
  if (stage === "sprout") return <Sprout resting={resting} />;
  const color = TULIP[variant % TULIP.length];
  const heads = [
    { x: -5, h: 24, b: -2 },
    { x: 4, h: 28, b: 2 },
    { x: 0, h: 20, b: 0 },
  ];
  const scale = stage === "young" ? 0.55 : 1;
  return (
    <G>
      {heads.map((s, i) => (
        <G key={i}>
          <Stem h={s.h * scale} x={s.x} bend={s.b} resting={resting} />
          {stage === "mature" && <Ellipse cx={s.x + s.b * 0.6} cy={-s.h - 3} rx={2.6} ry={4} fill={rest(color, resting)} />}
          {stage === "blooming" && (
            <G transform={`translate(${s.x + s.b * 0.6} ${-s.h + 1})`}>
              <TulipHead color={color} resting={resting} />
            </G>
          )}
        </G>
      ))}
      <Path d="M -1 0 Q -9 -8 -7 -18 Q -3 -8 1 0 Z" fill={rest("#5A9E4B", resting)} />
      <Path d="M 1 0 Q 9 -6 8 -15 Q 3 -7 -1 0 Z" fill={rest("#4C8F40", resting)} />
    </G>
  );
}

function Sunflower({ stage, resting }: P) {
  if (stage === "sprout") return <Sprout resting={resting} size={1.15} />;
  const h = stage === "young" ? 22 : stage === "mature" ? 42 : 54;
  return (
    <G>
      <Stem h={h} w={3.4} bend={2} resting={resting} color="#4C8C35" />
      <Leaf x={1} y={-h * 0.32} len={14} angle={-20} color="#4C8C35" resting={resting} />
      <Leaf x={1} y={-h * 0.52} len={13} angle={-165} color="#4C8C35" resting={resting} />
      {stage !== "young" && <Leaf x={1} y={-h * 0.72} len={10} angle={-25} color="#4C8C35" resting={resting} />}
      {stage === "mature" && <Circle cx={1.2} cy={-h} r={5} fill={rest("#7A9A3A", resting)} />}
      {stage === "blooming" && (
        <G transform={`translate(1.2 ${-h})`}>
          <Petals n={16} r={6} len={8} wid={4} color="#FCC419" resting={resting} />
          <Petals n={14} r={5} len={6} wid={3.4} color="#FAB005" resting={resting} offset={12} />
          <Circle r={7} fill={rest("#6B4430", resting)} />
          <Circle r={4.5} fill={rest("#5C3A28", resting)} />
        </G>
      )}
    </G>
  );
}

function Rose({ stage, resting, variant }: P) {
  if (stage === "sprout") return <Sprout resting={resting} />;
  const s = stage === "young" ? 0.65 : stage === "mature" ? 0.85 : 1;
  const bloom = variant % 2 ? "#E64980" : "#C92A2A";
  const blobs = [
    { x: -9, y: -9, r: 8 },
    { x: 8, y: -10, r: 8 },
    { x: 0, y: -16, r: 9 },
    { x: -2, y: -7, r: 8 },
  ];
  const flowers = [
    { x: -8, y: -15 },
    { x: 7, y: -17 },
    { x: 1, y: -23 },
    { x: -1, y: -9 },
  ];
  return (
    <G scale={s}>
      {blobs.map((b, i) => (
        <Circle key={i} cx={b.x} cy={b.y} r={b.r} fill={rest(i % 2 ? "#2F6B3A" : "#3A7D44", resting)} />
      ))}
      {stage !== "young" &&
        flowers.map((f, i) =>
          stage === "blooming" ? (
            <G key={i} transform={`translate(${f.x} ${f.y})`}>
              <Circle r={3.6} fill={rest(bloom, resting)} />
              <Circle r={2.2} fill={rest(shade(bloom, 0.2), resting)} />
              <Circle r={1} cx={0.4} cy={-0.3} fill={rest(tint(bloom, 0.3), resting)} />
            </G>
          ) : (
            <Circle key={i} cx={f.x} cy={f.y} r={2} fill={rest(bloom, resting)} />
          ),
        )}
    </G>
  );
}

type TreeKind = "oak" | "fruit" | "cherry";

function Tree({ stage, resting, kind }: P & { kind: TreeKind }) {
  if (stage === "sprout") return <Sprout resting={resting} size={1.2} />;
  const s = stage === "young" ? 0.5 : stage === "mature" ? 0.8 : 1;
  const canopy =
    kind === "cherry" && (stage === "blooming" || stage === "mature")
      ? ["#F4A3C4", "#F8BED5", "#EC8FB3"]
      : kind === "oak"
        ? ["#4C9A3C", "#5BAE46", "#3F8A35"]
        : ["#66B04A", "#78C257", "#5AA443"];
  const blobs = [
    { x: -12, y: -46, r: 15, c: 0 },
    { x: 12, y: -48, r: 15, c: 2 },
    { x: 0, y: -60, r: 17, c: 1 },
    { x: -3, y: -42, r: 13, c: 1 },
  ];
  const fruit = [
    { x: -14, y: -44 },
    { x: 10, y: -40 },
    { x: 2, y: -58 },
    { x: 15, y: -52 },
    { x: -6, y: -52 },
  ];
  const trunk = rest(kind === "cherry" ? "#6B4A3A" : "#7B5236", resting);
  return (
    <G scale={s}>
      <Path d="M -4 0 L -2.6 -40 L 2.6 -40 L 4 0 Z" fill={trunk} />
      <Path d="M 0 -30 L 9 -40" stroke={trunk} strokeWidth={2.4} strokeLinecap="round" />
      {blobs.map((b, i) => (
        <Circle key={i} cx={b.x} cy={b.y} r={b.r} fill={rest(canopy[b.c], resting)} />
      ))}
      <Circle cx={-6} cy={-63} r={6} fill={rest(tint(canopy[1], 0.25), resting)} opacity={0.7} />
      {stage === "blooming" && kind === "fruit" && fruit.map((f, i) => <Circle key={i} cx={f.x} cy={f.y} r={3} fill={rest("#E03131", resting)} />)}
      {stage === "blooming" && kind === "cherry" && fruit.map((f, i) => <Circle key={i} cx={f.x} cy={f.y} r={2} fill={rest("#FFFFFF", resting)} opacity={0.9} />)}
    </G>
  );
}

function SpeciesArt({ species, ...p }: P & { species: Species }) {
  switch (species) {
    case "daisy":
      return <Daisy {...p} />;
    case "marigold":
      return <Marigold {...p} />;
    case "lavender":
      return <Lavender {...p} />;
    case "tulip":
      return <Tulip {...p} />;
    case "sunflower":
      return <Sunflower {...p} />;
    case "rose":
      return <Rose {...p} />;
    case "oak":
      return <Tree {...p} kind="oak" />;
    case "fruit_tree":
      return <Tree {...p} kind="fruit" />;
    case "cherry_tree":
      return <Tree {...p} kind="cherry" />;
  }
}

/** How tall each species draws when blooming — used to place the water hint. */
export const PLANT_HEIGHT: Record<Species, number> = {
  daisy: 30,
  marigold: 28,
  lavender: 32,
  tulip: 32,
  sunflower: 62,
  rose: 28,
  oak: 78,
  fruit_tree: 78,
  cherry_tree: 78,
};

function WaterHint({ y }: { y: number }) {
  return (
    <G transform={`translate(0 ${y})`}>
      <Circle r={7.5} fill="#FFFFFF" opacity={0.92} />
      <Path d="M 0 -4.6 Q 3.6 0 3.2 1.6 A 3.2 3.2 0 0 1 -3.2 1.6 Q -3.6 0 0 -4.6 Z" fill="#3B9AE1" />
    </G>
  );
}

function RestHint({ y }: { y: number }) {
  return (
    <G transform={`translate(0 ${y})`}>
      <Rect x={-9} y={-7} width={18} height={13} rx={6.5} fill="#FFFFFF" opacity={0.9} />
      <Path d="M -4 -3 L 1 -3 L -4 3 L 1 3" stroke="#7A8B80" strokeWidth={1.4} fill="none" strokeLinejoin="round" />
      <Path d="M 3 -4 L 6 -4 L 3 -0.5 L 6 -0.5" stroke="#7A8B80" strokeWidth={1.1} fill="none" strokeLinejoin="round" />
    </G>
  );
}

export const PlantArt = memo(function PlantArt({ plant, selected }: { plant: Plant; selected: boolean }) {
  const p: P = { stage: plant.stage, resting: plant.resting, variant: plant.variant ?? 0 };
  const stageScale = { seed: 0, sprout: 0.25, young: 0.5, mature: 0.8, blooming: 1 }[plant.stage];
  const hintY = -Math.max(16, PLANT_HEIGHT[plant.species] * Math.max(stageScale, 0.25)) - 12;
  return (
    <G>
      {/* planting mound — darker when watered */}
      <Ellipse cx={0} cy={0} rx={15} ry={6.5} fill={plant.wateredToday ? "#5A3820" : "#77492A"} />
      {selected && <Ellipse cx={0} cy={0} rx={19} ry={8.5} fill="none" stroke="#FFFFFF" strokeWidth={2} />}
      {plant.stage === "seed" ? <Seed resting={plant.resting} /> : <SpeciesArt species={plant.species} {...p} />}
      {plant.resting ? <RestHint y={hintY} /> : !plant.wateredToday && <WaterHint y={hintY} />}
    </G>
  );
});
