// Shared geometry, materials and layout for the 3D garden.
// Everything is procedural (no downloaded models) → no asset licences to worry about.
import * as THREE from "three";
import { GARDEN_GRID } from "@/lib/economy";

/** Size of one planting plot in world units. */
export const PLOT = 1.15;
export const BED_W = GARDEN_GRID.cols * PLOT + 0.5;
export const BED_D = GARDEN_GRID.rows * PLOT + 0.5;
export const BED_TOP = 0.16;

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Plot (x,y) → world (x,z), with a little seeded jitter so rows don't look like a spreadsheet. */
export function plotToWorld(x: number, y: number): [number, number] {
  const r = rng(x * 131 + y * 977 + 7);
  const jx = (r() - 0.5) * 0.28;
  const jz = (r() - 0.5) * 0.28;
  return [(x - (GARDEN_GRID.cols - 1) / 2) * PLOT + jx, (y - (GARDEN_GRID.rows - 1) / 2) * PLOT + jz];
}

export function worldToPlot(wx: number, wz: number): { x: number; y: number } | null {
  const x = Math.round(wx / PLOT + (GARDEN_GRID.cols - 1) / 2);
  const y = Math.round(wz / PLOT + (GARDEN_GRID.rows - 1) / 2);
  if (x < 0 || y < 0 || x >= GARDEN_GRID.cols || y >= GARDEN_GRID.rows) return null;
  return { x, y };
}

// ---- geometry cache (shared by every plant) ----
export const GEO = {
  sphere: new THREE.SphereGeometry(0.5, 12, 8),
  lowSphere: new THREE.IcosahedronGeometry(0.5, 1),
  blob: new THREE.IcosahedronGeometry(0.5, 0),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 7),
  taper: new THREE.CylinderGeometry(0.32, 0.5, 1, 7),
  cone: new THREE.ConeGeometry(0.5, 1, 7),
  box: new THREE.BoxGeometry(1, 1, 1),
  leaf: (() => {
    // a flat pointed leaf shape, extruded very thin
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.5, 0.35, 0, 1);
    s.quadraticCurveTo(-0.5, 0.35, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -0.01);
    return g;
  })(),
};

// ---- material cache: one material per colour (+ dormant variant) ----
const mats = new Map<string, THREE.MeshStandardMaterial>();
const DORMANT_GREY = new THREE.Color("#a59f8f");

export function mat(color: string, opts: { dormant?: boolean; flat?: boolean; emissive?: number; rough?: number } = {}) {
  const key = `${color}|${opts.dormant ? 1 : 0}|${opts.flat ? 1 : 0}|${opts.emissive ?? 0}|${opts.rough ?? 0.75}`;
  let m = mats.get(key);
  if (!m) {
    const c = new THREE.Color(color);
    if (opts.dormant) c.lerp(DORMANT_GREY, 0.65);
    m = new THREE.MeshStandardMaterial({
      color: c,
      roughness: opts.rough ?? 0.75,
      flatShading: opts.flat ?? false,
      emissive: opts.emissive ? c : new THREE.Color(0),
      emissiveIntensity: opts.emissive ?? 0,
      side: THREE.DoubleSide,
    });
    mats.set(key, m);
  }
  return m;
}
