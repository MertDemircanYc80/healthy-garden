// Tiny colour helpers for the garden illustration.

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

/** Mix a → b by t (0..1). */
export function mix(a: string, b: string, t: number) {
  const A = parse(a);
  const B = parse(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export const shade = (c: string, t: number) => mix(c, "#000000", t);
export const tint = (c: string, t: number) => mix(c, "#ffffff", t);

/** Resting (neglected) plants fade toward dry straw — never brown/dead. */
export const rest = (c: string, resting: boolean) => (resting ? mix(c, "#BDB49C", 0.62) : c);
