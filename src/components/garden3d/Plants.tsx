"use client";

// Procedural low-poly plants. Each species has 5 growth stages:
// seed (soil mound) → sprout → young (stem + leaves) → mature (bud) → blooming (full flower/fruit).
// Dormant plants turn grey and droop; they never die.
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type * as THREE from "three";
import type { GardenPlant, GrowthStage, ShopItemId } from "@/lib/types";
import { BED_TOP, GEO, hash, mat, plotToWorld, rng } from "./shared";

type Stage = GrowthStage;
interface Look {
  stage: Stage;
  dormant: boolean;
  seed: number;
}

const GREEN = "#4f9a3f";
const DARK_GREEN = "#2f6b3a";

// ---------- small building blocks ----------

function Stem({ h, r = 0.022, color = GREEN, dormant }: { h: number; r?: number; color?: string; dormant: boolean }) {
  return <mesh geometry={GEO.cyl} material={mat(color, { dormant })} position={[0, h / 2, 0]} scale={[r * 2, h, r * 2]} castShadow />;
}

function Leaf({ y, angle, size, droop = 0.35, color = GREEN, dormant }: { y: number; angle: number; size: number; droop?: number; color?: string; dormant: boolean }) {
  return (
    <group position={[0, y, 0]} rotation={[0, angle, 0]}>
      <mesh geometry={GEO.leaf} material={mat(color, { dormant })} rotation={[0, 0, -Math.PI / 2 + droop]} scale={[size * 0.7, size, size]} castShadow />
    </group>
  );
}

function PetalRing({ count, len, wid, lift, radius, color, dormant, thick = 0.035, offset = 0 }: {
  count: number; len: number; wid: number; lift: number; radius: number; color: string; dormant: boolean; thick?: number; offset?: number;
}) {
  const m = mat(color, { dormant });
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} rotation={[0, (i / count) * Math.PI * 2 + offset, 0]}>
          <group rotation={[0, 0, lift]}>
            <mesh geometry={GEO.sphere} material={m} position={[radius + len / 2, 0, 0]} scale={[len, thick, wid]} castShadow />
          </group>
        </group>
      ))}
    </>
  );
}

function Bud({ y, color, dormant, size = 1 }: { y: number; color: string; dormant: boolean; size?: number }) {
  return <mesh geometry={GEO.sphere} material={mat(color, { dormant })} position={[0, y, 0]} scale={[0.07 * size, 0.11 * size, 0.07 * size]} castShadow />;
}

function Sprout({ dormant, size = 0.13 }: { dormant: boolean; size?: number }) {
  return (
    <>
      <Stem h={0.08} dormant={dormant} />
      <Leaf y={0.07} angle={0.3} size={size} droop={0.9} dormant={dormant} />
      <Leaf y={0.07} angle={0.3 + Math.PI} size={size} droop={0.9} dormant={dormant} />
    </>
  );
}

/** Several stems from one spot, each with its own height/lean. */
function Clump({ n, seed, children }: { n: number; seed: number; children: (i: number, r: () => number) => React.ReactNode }) {
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, (_, i) => ({ i, x: (r() - 0.5) * 0.3 * (n > 1 ? 1 : 0), z: (r() - 0.5) * 0.3 * (n > 1 ? 1 : 0), lean: (r() - 0.5) * 0.25, rot: r() * 6.28, r }));
  }, [n, seed]);
  return (
    <>
      {items.map((it) => (
        <group key={it.i} position={[it.x, 0, it.z]} rotation={[it.lean, it.rot, it.lean * 0.5]}>
          {children(it.i, it.r)}
        </group>
      ))}
    </>
  );
}

// ---------- species ----------

function Daisy({ stage, dormant, seed }: Look) {
  if (stage === "sprout") return <Sprout dormant={dormant} />;
  return (
    <Clump n={3} seed={seed}>
      {(i) => {
        const h = [0.42, 0.34, 0.38][i] * (stage === "young" ? 0.55 : 1);
        return (
          <>
            <Stem h={h} dormant={dormant} />
            <Leaf y={0.05} angle={i * 2} size={0.12} dormant={dormant} />
            {stage === "mature" && <Bud y={h} color="#f3f0dc" dormant={dormant} />}
            {stage === "blooming" && (
              <group position={[0, h, 0]} rotation={[0.45, 0, 0]}>
                <PetalRing count={16} len={0.12} wid={0.045} lift={0.12} radius={0.035} color="#fbfbf3" dormant={dormant} />
                <mesh geometry={GEO.sphere} material={mat("#f2c230", { dormant })} scale={[0.09, 0.05, 0.09]} />
              </group>
            )}
          </>
        );
      }}
    </Clump>
  );
}

function Marigold({ stage, dormant, seed }: Look) {
  if (stage === "sprout") return <Sprout dormant={dormant} />;
  return (
    <Clump n={2} seed={seed}>
      {(i) => {
        const h = [0.33, 0.28][i] * (stage === "young" ? 0.6 : 1);
        return (
          <>
            <Stem h={h} dormant={dormant} />
            <Leaf y={0.08} angle={i * 2.5} size={0.12} color="#3f7d3a" dormant={dormant} />
            <Leaf y={0.14} angle={i * 2.5 + 2} size={0.1} color="#3f7d3a" dormant={dormant} />
            {stage === "mature" && <Bud y={h} color="#f08c00" dormant={dormant} />}
            {stage === "blooming" && (
              <group position={[0, h, 0]} rotation={[0.35, 0, 0]}>
                <PetalRing count={12} len={0.08} wid={0.06} lift={0.35} radius={0.02} color="#e8590c" dormant={dormant} thick={0.04} />
                <PetalRing count={10} len={0.065} wid={0.055} lift={0.8} radius={0.015} color="#f76707" dormant={dormant} thick={0.04} offset={0.3} />
                <PetalRing count={8} len={0.05} wid={0.05} lift={1.15} radius={0.01} color="#fd9a2c" dormant={dormant} thick={0.04} offset={0.6} />
              </group>
            )}
          </>
        );
      }}
    </Clump>
  );
}

function Lavender({ stage, dormant, seed }: Look) {
  if (stage === "sprout") return <Sprout dormant={dormant} size={0.1} />;
  return (
    <Clump n={6} seed={seed}>
      {(i) => {
        const h = (0.45 + (i % 3) * 0.06) * (stage === "young" ? 0.5 : 1);
        const buds = stage === "blooming" ? 9 : stage === "mature" ? 5 : 0;
        return (
          <>
            <Stem h={h} r={0.012} color="#7f9c6c" dormant={dormant} />
            {i % 2 === 0 && <Leaf y={0.04} angle={i} size={0.11} color="#86a477" droop={0.2} dormant={dormant} />}
            {Array.from({ length: buds }, (_, b) => (
              <mesh
                key={b}
                geometry={GEO.sphere}
                material={mat(b % 2 ? "#9b7fd4" : "#7e5fbf", { dormant })}
                position={[0, h - b * 0.025, 0]}
                scale={0.045 - b * 0.0015}
              />
            ))}
          </>
        );
      }}
    </Clump>
  );
}

const TULIP_COLORS = ["#e03131", "#f06595", "#ffd43b", "#ae3ec9", "#ff922b"];

function Tulip({ stage, dormant, seed }: Look) {
  if (stage === "sprout") return <Sprout dormant={dormant} />;
  const color = TULIP_COLORS[seed % TULIP_COLORS.length];
  return (
    <Clump n={3} seed={seed}>
      {(i) => {
        const h = [0.46, 0.4, 0.43][i] * (stage === "young" ? 0.5 : 1);
        return (
          <>
            <Stem h={h} r={0.02} dormant={dormant} />
            <Leaf y={0.02} angle={i * 2.1} size={0.24} droop={0.15} color="#5a9e4b" dormant={dormant} />
            {stage === "mature" && <Bud y={h} color={color} dormant={dormant} size={1.1} />}
            {stage === "blooming" &&
              Array.from({ length: 6 }, (_, p) => (
                <group key={p} position={[0, h, 0]} rotation={[0, (p / 6) * Math.PI * 2, 0]}>
                  <mesh
                    geometry={GEO.sphere}
                    material={mat(color, { dormant })}
                    position={[0.035, 0.07, 0]}
                    rotation={[0, 0, -0.28 - (p % 2) * 0.1]}
                    scale={[0.05, 0.17, 0.085]}
                    castShadow
                  />
                </group>
              ))}
          </>
        );
      }}
    </Clump>
  );
}

function Sunflower({ stage, dormant }: Look) {
  if (stage === "sprout") return <Sprout dormant={dormant} size={0.16} />;
  const h = stage === "young" ? 0.55 : stage === "mature" ? 0.95 : 1.2;
  return (
    <>
      <Stem h={h} r={0.04} color="#4c8c35" dormant={dormant} />
      {[0.2, 0.42, 0.65, 0.85].filter((y) => y < h).map((y, i) => (
        <Leaf key={y} y={y} angle={i * 2.4} size={0.3 - i * 0.03} droop={0.5} color="#4c8c35" dormant={dormant} />
      ))}
      {stage === "mature" && <Bud y={h} color="#7a9a3a" dormant={dormant} size={1.8} />}
      {stage === "blooming" && (
        <group position={[0, h, 0.03]} rotation={[0.85, 0, 0]}>
          <PetalRing count={20} len={0.17} wid={0.075} lift={0.06} radius={0.11} color="#fcc419" dormant={dormant} />
          <PetalRing count={16} len={0.13} wid={0.07} lift={0.12} radius={0.1} color="#fab005" dormant={dormant} offset={0.2} />
          <mesh geometry={GEO.sphere} material={mat("#5c3d2e", { dormant })} scale={[0.25, 0.07, 0.25]} />
        </group>
      )}
    </>
  );
}

function RoseHead({ color, dormant }: { color: string; dormant: boolean }) {
  return (
    <group>
      <mesh geometry={GEO.sphere} material={mat(color, { dormant })} scale={[0.07, 0.06, 0.07]} />
      {Array.from({ length: 7 }, (_, p) => (
        <group key={p} rotation={[0, (p / 7) * Math.PI * 2, 0]}>
          <mesh geometry={GEO.sphere} material={mat(color, { dormant })} position={[0.045, 0.005, 0]} rotation={[0, 0, 0.5]} scale={[0.05, 0.07, 0.075]} />
        </group>
      ))}
    </group>
  );
}

function Rose({ stage, dormant, seed }: Look) {
  if (stage === "sprout") return <Sprout dormant={dormant} />;
  const scale = stage === "young" ? 0.6 : stage === "mature" ? 0.85 : 1;
  const color = seed % 3 === 0 ? "#e64980" : "#c92a2a";
  const r = rng(seed);
  const blobs = Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * 6.28 + r(), d: 0.12 + r() * 0.08, y: 0.18 + r() * 0.12, s: 0.22 + r() * 0.08 }));
  return (
    <group scale={scale}>
      {blobs.map((b, i) => (
        <mesh key={i} geometry={GEO.lowSphere} material={mat(i % 2 ? DARK_GREEN : "#3a7d44", { dormant, flat: true })} position={[Math.cos(b.a) * b.d, b.y, Math.sin(b.a) * b.d]} scale={b.s} castShadow />
      ))}
      {stage !== "young" &&
        blobs.slice(0, 4).map((b, i) => (
          <group key={i} position={[Math.cos(b.a) * b.d * 1.3, b.y + b.s * 0.45, Math.sin(b.a) * b.d * 1.3]}>
            {stage === "blooming" ? <RoseHead color={color} dormant={dormant} /> : <Bud y={0} color={color} dormant={dormant} />}
          </group>
        ))}
    </group>
  );
}

type TreeKind = "oak" | "fruit" | "cherry";

function Tree({ stage, dormant, seed, kind }: Look & { kind: TreeKind }) {
  if (stage === "sprout") return <Sprout dormant={dormant} size={0.15} />;
  const s = stage === "young" ? 0.45 : stage === "mature" ? 0.8 : 1;
  const trunk = kind === "cherry" ? "#6b4a3a" : "#7b5236";
  const canopy =
    kind === "cherry" && stage === "blooming"
      ? ["#f7a1c4", "#fbc2d8", "#f48fb1"]
      : kind === "oak"
        ? ["#4c9a3c", "#5aae45", "#3f8a35"]
        : ["#69b34c", "#78c257", "#5ea544"];
  const r = rng(seed);
  const blobs = Array.from({ length: stage === "young" ? 2 : 6 }, (_, i) => ({
    x: (r() - 0.5) * 0.7,
    y: 1.25 + r() * 0.45,
    z: (r() - 0.5) * 0.7,
    s: 0.55 + r() * 0.3,
    c: canopy[i % canopy.length],
  }));
  const fruitPts = Array.from({ length: 9 }, () => {
    const b = blobs[Math.floor(r() * blobs.length)];
    const a = r() * 6.28;
    const e = r() * 1.2 - 0.3;
    return [b.x + Math.cos(a) * Math.cos(e) * b.s * 0.5, b.y + Math.sin(e) * b.s * 0.5, b.z + Math.sin(a) * Math.cos(e) * b.s * 0.5] as const;
  });
  return (
    <group scale={s}>
      <mesh geometry={GEO.taper} material={mat(trunk, { dormant, flat: true })} position={[0, 0.65, 0]} scale={[0.26, 1.3, 0.26]} castShadow />
      <mesh geometry={GEO.cyl} material={mat(trunk, { dormant, flat: true })} position={[0.12, 1.1, 0]} rotation={[0, 0, -0.7]} scale={[0.08, 0.45, 0.08]} />
      {blobs.map((b, i) => (
        <mesh key={i} geometry={GEO.lowSphere} material={mat(b.c, { dormant, flat: true })} position={[b.x, b.y, b.z]} scale={b.s} castShadow />
      ))}
      {stage === "blooming" && kind === "fruit" &&
        fruitPts.map((p, i) => <mesh key={i} geometry={GEO.sphere} material={mat("#e03131", { dormant })} position={p} scale={0.12} castShadow />)}
      {stage === "mature" && kind !== "oak" &&
        fruitPts.map((p, i) => <mesh key={i} geometry={GEO.sphere} material={mat(kind === "cherry" ? "#f7a1c4" : "#fff5f5", { dormant })} position={p} scale={0.07} />)}
    </group>
  );
}

function Species({ itemId, look }: { itemId: ShopItemId; look: Look }) {
  switch (itemId) {
    case "daisy_seed":
      return <Daisy {...look} />;
    case "marigold_seed":
      return <Marigold {...look} />;
    case "lavender_seed":
      return <Lavender {...look} />;
    case "tulip_bulb":
      return <Tulip {...look} />;
    case "sunflower_seed":
      return <Sunflower {...look} />;
    case "rose_bush":
      return <Rose {...look} />;
    case "oak_sapling":
      return <Tree {...look} kind="oak" />;
    case "fruit_sapling":
      return <Tree {...look} kind="fruit" />;
    case "cherry_sapling":
      return <Tree {...look} kind="cherry" />;
    default:
      return null;
  }
}

/** Size of each species in the bed (the models are built small; this sets the on-screen presence). */
const SCALE: Partial<Record<ShopItemId, number>> = {
  daisy_seed: 1.75,
  marigold_seed: 1.8,
  lavender_seed: 1.6,
  tulip_bulb: 1.6,
  sunflower_seed: 1.35,
  rose_bush: 1.5,
  oak_sapling: 1.15,
  fruit_sapling: 1.1,
  cherry_sapling: 1.1,
};
const TALL: Partial<Record<ShopItemId, number>> = { sunflower_seed: 1.9, oak_sapling: 2.7, fruit_sapling: 2.6, cherry_sapling: 2.6, rose_bush: 1.1 };
/** Flowers with a "face" look toward the camera instead of a random direction. */
const FACES_CAMERA: ShopItemId[] = ["sunflower_seed"];

/** Hover icon telling the player a plant wants water (Hay Day style). */
function Droplet({ y }: { y: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = y + Math.sin(clock.elapsedTime * 2.5) * 0.05;
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh geometry={GEO.sphere} material={mat("#ffffff", { emissive: 0.2 })} scale={[0.24, 0.24, 0.05]} />
      <mesh geometry={GEO.sphere} material={mat("#3b9ae1", { emissive: 0.35 })} position={[0, -0.02, 0.03]} scale={0.1} />
      <mesh geometry={GEO.cone} material={mat("#3b9ae1", { emissive: 0.35 })} position={[0, 0.05, 0.03]} scale={[0.085, 0.09, 0.085]} />
    </group>
  );
}

export function Plant3D({ plant, selected, onSelect }: { plant: GardenPlant; selected: boolean; onSelect: (p: GardenPlant) => void }) {
  const [x, z] = plotToWorld(plant.gridX, plant.gridY);
  const seed = hash(plant.id);
  const grow = useRef<THREE.Group>(null);
  const sway = useRef<THREE.Group>(null);
  const anim = useRef({ scale: 0.3, vel: 0 });
  const blooming = plant.stage === "blooming";
  const thirsty = !plant.wateredToday && !blooming;

  useEffect(() => {
    anim.current.scale = 0.55; // springs back to 1 → a little "grow" pop on every stage change
  }, [plant.stage]);

  useFrame(({ clock }, dt) => {
    const a = anim.current;
    const k = 60;
    const damp = 9;
    a.vel += ((1 - a.scale) * k - a.vel * damp) * Math.min(dt, 0.05);
    a.scale += a.vel * Math.min(dt, 0.05);
    if (grow.current) grow.current.scale.setScalar(a.scale);
    if (sway.current) {
      const t = clock.elapsedTime + (seed % 100);
      const amp = plant.isDormant ? 0.01 : 0.05;
      sway.current.rotation.z = Math.sin(t * 1.4) * amp;
      sway.current.rotation.x = (plant.isDormant ? 0.28 : 0) + Math.sin(t * 1.1) * amp * 0.6;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // was a drag/rotate, not a tap
    e.stopPropagation();
    onSelect(plant);
  };

  return (
    <group position={[x, BED_TOP, z]} onClick={click}>
      <mesh geometry={GEO.sphere} material={mat(plant.wateredToday ? "#4a2e18" : "#6b4423", { rough: plant.wateredToday ? 0.35 : 0.95 })} scale={[0.6, 0.1, 0.6]} receiveShadow />
      {plant.stage === "seed" && <mesh geometry={GEO.sphere} material={mat("#c9a26b")} position={[0, 0.05, 0]} scale={[0.07, 0.05, 0.05]} />}
      <group rotation={[0, FACES_CAMERA.includes(plant.itemId) ? 0 : (seed % 628) / 100, 0]} scale={SCALE[plant.itemId] ?? 1}>
        <group ref={grow}>
          <group ref={sway}>{plant.stage !== "seed" && <Species itemId={plant.itemId} look={{ stage: plant.stage, dormant: plant.isDormant, seed }} />}</group>
        </group>
      </group>
      {thirsty && <Droplet y={plant.stage === "seed" || plant.stage === "sprout" ? 0.55 : (TALL[plant.itemId] ?? 0.95) + 0.2} />}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.42, 0.5, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
