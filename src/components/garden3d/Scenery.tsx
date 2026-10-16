"use client";

// The world around the planting bed: a grassy island, tilled soil, fence, pond, little barn,
// trees, bushes, rocks, clouds and butterflies. Grass colour follows garden health.
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GARDEN_GRID } from "@/lib/economy";
import { BED_D, BED_TOP, BED_W, GEO, PLOT, mat, rng } from "./shared";

const ISLAND_R = 11;

function Island({ health }: { health: number }) {
  // Low-poly ground with gentle bumps (kept flat under the bed).
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(ISLAND_R, 64, 0, Math.PI * 2);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const r = rng(42);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const inBed = Math.abs(x) < BED_W / 2 + 1.2 && Math.abs(z) < BED_D / 2 + 1.2;
      const edge = Math.hypot(x, z) > ISLAND_R - 0.3;
      // bumps only go up, so the earthy skirt below never pokes through
      pos.setY(i, inBed || edge ? 0 : Math.max(0, Math.sin(x * 0.6) * Math.cos(z * 0.5)) * 0.22 + r() * 0.05);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  // Healthy garden = vivid green; neglected = olive (never brown/dead).
  const grass = new THREE.Color("#a4ad5c").lerp(new THREE.Color("#6cc04a"), Math.max(0.15, health)).getStyle();
  return (
    <group>
      <mesh geometry={geo} material={mat(grass, { flat: true, rough: 0.95 })} receiveShadow />
      {/* earthy skirt under the island (diorama look) */}
      <mesh geometry={GEO.taper} material={mat("#8a5a3b", { flat: true })} position={[0, -1.16, 0]} scale={[ISLAND_R * 2 - 0.05, 2.2, ISLAND_R * 2 - 0.05]} rotation={[Math.PI, 0, 0]} />
    </group>
  );
}

function Bed({ onTap }: { onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  return (
    <group>
      {/* raised tilled soil */}
      <mesh geometry={GEO.box} material={mat("#7a4f2e", { rough: 1 })} position={[0, BED_TOP / 2, 0]} scale={[BED_W, BED_TOP, BED_D]} receiveShadow onClick={onTap} />
      {/* furrows */}
      {Array.from({ length: GARDEN_GRID.rows }, (_, y) => (
        <mesh
          key={y}
          geometry={GEO.box}
          material={mat("#6a4226", { rough: 1 })}
          position={[0, BED_TOP + 0.01, (y - (GARDEN_GRID.rows - 1) / 2) * PLOT + PLOT / 2 - 0.02]}
          scale={[BED_W - 0.3, 0.02, 0.06]}
          onClick={onTap}
        />
      ))}
      {/* wooden border */}
      {[
        [0, -BED_D / 2, BED_W + 0.2, 0.14],
        [0, BED_D / 2, BED_W + 0.2, 0.14],
        [-BED_W / 2, 0, 0.14, BED_D],
        [BED_W / 2, 0, 0.14, BED_D],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} geometry={GEO.box} material={mat("#b07a4a", { flat: true })} position={[x, BED_TOP + 0.03, z]} scale={[w, 0.24, d]} castShadow receiveShadow />
      ))}
    </group>
  );
}

function Fence() {
  const posts = useMemo(() => {
    const pts: { x: number; z: number; rot: number }[] = [];
    const w = BED_W / 2 + 1.1;
    const d = BED_D / 2 + 1.1;
    for (let x = -w; x <= w + 0.01; x += 0.9) pts.push({ x, z: -d, rot: 0 });
    for (let z = -d + 0.9; z <= d + 0.01; z += 0.9) {
      pts.push({ x: -w, z, rot: Math.PI / 2 });
      pts.push({ x: w, z, rot: Math.PI / 2 });
    }
    return pts;
  }, []);
  const wood = mat("#e9d8b8", { flat: true });
  const w = BED_W / 2 + 1.1;
  const d = BED_D / 2 + 1.1;
  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} geometry={GEO.box} material={wood} position={[p.x, 0.32, p.z]} scale={[0.1, 0.64, 0.1]} castShadow />
      ))}
      {[0.25, 0.48].map((y) => (
        <group key={y}>
          <mesh geometry={GEO.box} material={wood} position={[0, y, -d]} scale={[w * 2, 0.06, 0.04]} castShadow />
          <mesh geometry={GEO.box} material={wood} position={[-w, y, 0]} scale={[0.04, 0.06, d * 2]} castShadow />
          <mesh geometry={GEO.box} material={wood} position={[w, y, 0]} scale={[0.04, 0.06, d * 2]} castShadow />
        </group>
      ))}
    </group>
  );
}

function Barn() {
  return (
    <group position={[-7.2, 0, -5.2]} rotation={[0, 0.5, 0]}>
      <mesh geometry={GEO.box} material={mat("#c0392b", { flat: true })} position={[0, 0.9, 0]} scale={[2.2, 1.8, 1.8]} castShadow receiveShadow />
      <mesh material={mat("#7d3c32", { flat: true })} position={[0, 2.15, 0]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0, 1.35, 0.9, 4, 1]} />
      </mesh>
      <mesh geometry={GEO.box} material={mat("#ffffff")} position={[0, 0.6, 0.91]} scale={[0.9, 1.2, 0.02]} />
      <mesh geometry={GEO.box} material={mat("#a33025")} position={[0, 0.6, 0.92]} scale={[0.75, 1.05, 0.02]} />
      <mesh geometry={GEO.box} material={mat("#ffffff")} position={[0, 0.6, 0.935]} rotation={[0, 0, 0.9]} scale={[1.25, 0.06, 0.01]} />
      <mesh geometry={GEO.box} material={mat("#ffffff")} position={[0, 0.6, 0.935]} rotation={[0, 0, -0.9]} scale={[1.25, 0.06, 0.01]} />
    </group>
  );
}

function Pond() {
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (water.current) (water.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 1.5) * 0.04;
  });
  const waterMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#4dabf7", emissive: "#4dabf7", emissiveIntensity: 0.12, roughness: 0.15, metalness: 0.1 }),
    [],
  );
  const stones = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return { x: Math.cos(a) * 1.55, z: Math.sin(a) * 1.05, s: 0.18 + r() * 0.12, c: r() > 0.5 ? "#9aa0a6" : "#868e96" };
    });
  }, []);
  return (
    <group position={[6.6, 0.02, 4.6]}>
      <mesh ref={water} geometry={GEO.cyl} material={waterMat} scale={[3, 0.04, 2]} />
      {stones.map((s, i) => (
        <mesh key={i} geometry={GEO.blob} material={mat(s.c, { flat: true })} position={[s.x, 0.05, s.z]} scale={[s.s * 1.3, s.s, s.s]} castShadow />
      ))}
      {/* lily pads */}
      <mesh geometry={GEO.cyl} material={mat("#40c057")} position={[0.4, 0.05, 0.2]} scale={[0.35, 0.01, 0.35]} />
      <mesh geometry={GEO.cyl} material={mat("#37b24d")} position={[-0.5, 0.05, -0.2]} scale={[0.28, 0.01, 0.28]} />
      <mesh geometry={GEO.sphere} material={mat("#f783ac")} position={[0.4, 0.09, 0.2]} scale={0.1} />
    </group>
  );
}

function Decor() {
  const items = useMemo(() => {
    const r = rng(1234);
    const out: { kind: "tree" | "bush" | "rock" | "flower" | "tuft"; x: number; z: number; s: number; c: string }[] = [];
    const free = (x: number, z: number) =>
      !(Math.abs(x) < BED_W / 2 + 1.6 && Math.abs(z) < BED_D / 2 + 1.6) && // bed + fence
      Math.hypot(x - 6.6, z - 4.6) > 2.2 && // pond
      Math.hypot(x + 7.2, z + 5.2) > 2 && // barn
      !(Math.abs(x) < 0.8 && z > 0); // path
    let tries = 0;
    while (out.length < 70 && tries++ < 2000) {
      const a = r() * Math.PI * 2;
      const d = 4 + Math.sqrt(r()) * (ISLAND_R - 4.6);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (!free(x, z)) continue;
      const k = r();
      const kind = d > ISLAND_R - 2.4 && k < 0.55 ? "tree" : k < 0.25 ? "bush" : k < 0.38 ? "rock" : k < 0.7 ? "flower" : "tuft";
      const flowerColors = ["#ffffff", "#ffd43b", "#f783ac", "#b197fc", "#ff8787"];
      out.push({ kind, x, z, s: 0.7 + r() * 0.6, c: flowerColors[Math.floor(r() * flowerColors.length)] });
    }
    return out;
  }, []);
  return (
    <group>
      {items.map((it, i) => {
        if (it.kind === "tree")
          return (
            <group key={i} position={[it.x, 0, it.z]} scale={it.s}>
              <mesh geometry={GEO.taper} material={mat("#7b5236", { flat: true })} position={[0, 0.5, 0]} scale={[0.25, 1, 0.25]} castShadow />
              <mesh geometry={GEO.cone} material={mat(i % 3 ? "#2b8a3e" : "#37b24d", { flat: true })} position={[0, 1.5, 0]} scale={[1.1, 1.6, 1.1]} castShadow />
              <mesh geometry={GEO.cone} material={mat("#2f9e44", { flat: true })} position={[0, 2.2, 0]} scale={[0.8, 1.1, 0.8]} castShadow />
            </group>
          );
        if (it.kind === "bush")
          return (
            <group key={i} position={[it.x, 0.15, it.z]} scale={it.s * 0.6}>
              <mesh geometry={GEO.lowSphere} material={mat("#40a050", { flat: true })} scale={[1, 0.8, 1]} castShadow />
              <mesh geometry={GEO.lowSphere} material={mat("#37964a", { flat: true })} position={[0.4, -0.1, 0.1]} scale={0.7} castShadow />
            </group>
          );
        if (it.kind === "rock")
          return <mesh key={i} geometry={GEO.blob} material={mat("#adb5bd", { flat: true })} position={[it.x, 0.08, it.z]} scale={[it.s * 0.4, it.s * 0.28, it.s * 0.35]} castShadow />;
        if (it.kind === "flower")
          return (
            <group key={i} position={[it.x, 0, it.z]}>
              <mesh geometry={GEO.cyl} material={mat("#4f9a3f")} position={[0, 0.08, 0]} scale={[0.02, 0.16, 0.02]} />
              <mesh geometry={GEO.sphere} material={mat(it.c)} position={[0, 0.17, 0]} scale={[0.1, 0.05, 0.1]} />
            </group>
          );
        return <mesh key={i} geometry={GEO.cone} material={mat("#5cb33f", { flat: true })} position={[it.x, 0.08, it.z]} scale={[0.12, 0.18, 0.12]} />;
      })}
      {/* stepping-stone path to the bed */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={GEO.cyl} material={mat("#ced4da", { flat: true })} position={[(i % 2 ? 0.15 : -0.15), 0.03, BED_D / 2 + 1.6 + i * 0.85]} scale={[0.55, 0.06, 0.45]} receiveShadow />
      ))}
    </group>
  );
}

function Clouds() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.01;
  });
  const clouds = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * Math.PI * 2 + r(), d: 14 + r() * 6, y: 7 + r() * 3, s: 1 + r() * 0.8 }));
  }, []);
  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={[Math.cos(c.a) * c.d, c.y, Math.sin(c.a) * c.d]} scale={c.s}>
          {[[-0.8, 0, 0, 0.9], [0, 0.25, 0, 1.2], [0.9, 0, 0.1, 0.85], [0.2, -0.15, 0.5, 0.8]].map(([x, y, z, s], j) => (
            <mesh key={j} geometry={GEO.lowSphere} material={mat("#ffffff", { flat: true, emissive: 0.15 })} position={[x, y, z]} scale={s} />
          ))}
        </group>
      ))}
    </group>
  );
}

function Butterfly({ seed, color }: { seed: number; color: string }) {
  const ref = useRef<THREE.Group>(null);
  const l = useRef<THREE.Mesh>(null);
  const r = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.35 + seed;
    if (ref.current) {
      ref.current.position.set(Math.sin(t) * (BED_W / 2 - 0.5), 0.9 + Math.sin(t * 3.1) * 0.25, Math.cos(t * 1.3) * (BED_D / 2 - 0.5));
      ref.current.rotation.y = -t + Math.PI / 2;
    }
    const flap = Math.sin(clock.elapsedTime * 18 + seed) * 0.9;
    if (l.current) l.current.rotation.z = flap;
    if (r.current) r.current.rotation.z = -flap;
  });
  const m = mat(color, { emissive: 0.1 });
  return (
    <group ref={ref} scale={0.6}>
      <mesh ref={l} material={m}>
        <circleGeometry args={[0.13, 6, 0, Math.PI]} />
      </mesh>
      <mesh ref={r} material={m} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.13, 6, 0, Math.PI]} />
      </mesh>
    </group>
  );
}

export function Scenery({ health, onBedTap, butterflies }: { health: number; onBedTap: (e: ThreeEvent<MouseEvent>) => void; butterflies: number }) {
  return (
    <>
      <Island health={health} />
      <Bed onTap={onBedTap} />
      <Fence />
      <Barn />
      <Pond />
      <Decor />
      <Clouds />
      {["#ffa94d", "#ffffff", "#74c0fc"].slice(0, butterflies).map((c, i) => (
        <Butterfly key={c} seed={i * 2.1} color={c} />
      ))}
    </>
  );
}
