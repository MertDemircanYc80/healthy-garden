// The garden — a fixed, calm, isometric illustration. It never pans, zooms or rotates.
// The sky follows the time of day; the meadow follows 7-day garden health.
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { GARDEN_PLOTS, GARDEN_SIZE, plotNumber, type GardenPlot } from "@/lib/gardenPlots";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";
import { C } from "@/theme";
import type { Plant } from "@/types";
import { mix, shade } from "./color";
import { PlantArt } from "./Plants";

export const BED = GARDEN_SIZE;
const VB_W = 400;
const TILE_W = 64;
const TILE_H = 32;
const BED_DEPTH = 12;

type Phase = "day" | "golden" | "night";

export function phaseFor(hour: number): Phase {
  if (hour >= 6 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "golden";
  return "night";
}

const SKY: Record<Phase, { top: string; bottom: string; haze: string; light: string; tint: string; tintOpacity: number }> = {
  day: { top: "#7EC4E6", bottom: "#D9F0EC", haze: "#A9CFB8", light: "#FFF4C2", tint: "#000000", tintOpacity: 0 },
  golden: { top: "#89A8D8", bottom: "#F8D6A8", haze: "#B9C49A", light: "#FFD27A", tint: "#F08C3C", tintOpacity: 0.08 },
  night: { top: "#16264A", bottom: "#3C5A86", haze: "#4F6B72", light: "#F3EFD6", tint: "#0D1B3D", tintOpacity: 0.28 },
};

interface Props {
  plants: Plant[];
  width: number;
  height: number;
  /** Screen px at the bottom covered by the island — the bed is framed above it. */
  bottomCover: number;
  /** Screen px at the top used by the header. */
  topCover: number;
  health: number;
  hour: number;
  selectedId?: string | null;
  onPlantPress?: (p: Plant) => void;
  onEmptyPlotPress?: (plot: GardenPlot) => void;
  selectedPlot?: GardenPlot | null;
}

export function GardenScene({ plants, width, height, bottomCover, topCover, health, hour, selectedId, onPlantPress, onEmptyPlotPress, selectedPlot }: Props) {
  const phase = phaseFor(hour);
  const sky = SKY[phase];
  const k = VB_W / width; // screen px → viewBox units
  const VB_H = height * k;

  // Fit the bed (plus tall trees behind it) between the header and the island.
  const bedW = (BED.cols + BED.rows) * (TILE_W / 2);
  const bedH = (BED.cols + BED.rows) * (TILE_H / 2) + BED_DEPTH;
  const treeRoom = 80;
  const frontRoom = 26;
  const available = VB_H - (topCover + bottomCover) * k;
  const scale = Math.min(1.25, available / (bedH + treeRoom + frontRoom), (VB_W - 44) / bedW);
  const top = topCover * k + treeRoom * scale + Math.max(0, (available - (bedH + treeRoom + frontRoom) * scale) * 0.7);
  const cx = VB_W / 2 - ((BED.cols - BED.rows) * TILE_W * scale) / 4;
  const horizon = top - 22 * scale;

  // grid (continuous) → screen
  const iso = (c: number, r: number): [number, number] => [cx + (c - r) * (TILE_W / 2) * scale, top + (c + r) * (TILE_H / 2) * scale];
  const corners = { back: iso(0, 0), right: iso(BED.cols, 0), front: iso(BED.cols, BED.rows), left: iso(0, BED.rows) };
  const pts = (...p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(" ");
  const d = BED_DEPTH * scale;

  const meadow = mix("#A9B866", C.meadow, Math.max(0.2, health));
  const meadowFar = mix(meadow, sky.haze, 0.35);

  const sorted = useMemo(() => [...plants].sort((a, b) => a.col + a.row - (b.col + b.row) || a.col - b.col), [plants]);

  const stars = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    return Array.from({ length: 34 }, () => ({ x: rnd() * VB_W, y: 10 + rnd() * Math.max(40, horizon - 60), r: rnd() > 0.8 ? 1.5 : 0.8 }));
  }, [horizon]);

  // fence along the two back edges, slightly outside the bed
  const fence = useMemo(() => {
    const posts: [number, number][] = [];
    for (let c = 0; c <= BED.cols; c++) posts.push(iso(c, -0.45));
    for (let r = 1; r <= BED.rows; r++) posts.push(iso(-0.45, r));
    return posts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cx, top, scale]);

  const emptyPlots = GARDEN_PLOTS.filter(plot => !plants.some(p => p.col === plot.col && p.row === plot.row));

  return (
    <View style={{ width, height }}>
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky.top} />
          <Stop offset="1" stopColor={sky.bottom} />
        </LinearGradient>
        <LinearGradient id="meadow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={meadowFar} />
          <Stop offset="0.35" stopColor={meadow} />
          <Stop offset="1" stopColor={shade(meadow, 0.12)} />
        </LinearGradient>
        <RadialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={sky.light} stopOpacity={0.9} />
          <Stop offset="1" stopColor={sky.light} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* sky */}
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#sky)" />
      {phase === "night" && stars.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={0.75} />)}
      <Circle cx={phase === "night" ? 318 : 312} cy={horizon - 70 * scale} r={46} fill="url(#glow)" />
      {phase === "night" ? (
        <G>
          <Circle cx={318} cy={horizon - 70 * scale} r={13} fill={sky.light} />
          <Circle cx={314} cy={horizon - 73 * scale} r={2.6} fill="#DCD6B8" />
          <Circle cx={322} cy={horizon - 66 * scale} r={1.8} fill="#DCD6B8" />
        </G>
      ) : (
        <Circle cx={312} cy={horizon - 70 * scale} r={15} fill={sky.light} />
      )}
      {phase !== "night" && (
        <G opacity={0.92}>
          <Cloud x={70} y={horizon - 92 * scale} s={1} />
          <Cloud x={210} y={horizon - 120 * scale} s={0.7} />
        </G>
      )}

      {/* far hills + tree line */}
      <Path d={`M0 ${horizon + 6} Q 90 ${horizon - 34} 180 ${horizon - 4} T 400 ${horizon - 10} L 400 ${VB_H} L 0 ${VB_H} Z`} fill={mix(sky.haze, meadow, 0.25)} />
      {[18, 44, 66, 352, 374, 392].map((x, i) => (
        <G key={x} transform={`translate(${x} ${horizon - 2 + (i % 2) * 4})`}>
          <Rect x={-1.5} y={-4} width={3} height={8} fill={shade(sky.haze, 0.4)} />
          <Path d="M0 -26 L 9 -2 L -9 -2 Z" fill={shade(mix(sky.haze, C.meadowDeep, 0.5), 0.15)} />
        </G>
      ))}

      {/* meadow */}
      <Path d={`M0 ${horizon + 14} Q 200 ${horizon - 4} 400 ${horizon + 10} L 400 ${VB_H} L 0 ${VB_H} Z`} fill="url(#meadow)" />

      {/* little pond, back-left */}
      <G transform={`translate(${Math.max(34 * scale, iso(-1.4, 1.1)[0])} ${iso(-1.4, 1.1)[1]}) scale(${scale})`}>
        <Ellipse cx={0} cy={0} rx={30} ry={11} fill="#8FA9A0" />
        <Ellipse cx={0} cy={-1} rx={27} ry={9} fill={phase === "night" ? "#3D6C91" : "#77C1E6"} />
        <Ellipse cx={-8} cy={-3} rx={8} ry={2} fill="#FFFFFF" opacity={0.45} />
        <Ellipse cx={10} cy={2} rx={4.5} ry={1.8} fill="#40C057" />
      </G>

      {/* evening / night light on the surroundings — the bed itself stays bright and readable */}
      {sky.tintOpacity > 0 && <Rect x={0} y={0} width={VB_W} height={VB_H} fill={sky.tint} opacity={sky.tintOpacity} />}

      {/* fence behind the bed */}
      {fence.map(([x, y], i) => (
        <Rect key={i} x={x - 1.6 * scale} y={y - 16 * scale} width={3.2 * scale} height={16 * scale} rx={1} fill="#EADBC0" />
      ))}
      {[10, 5].map((h) => (
        <G key={h}>
          <Path d={`M ${iso(BED.cols, -0.45)[0]} ${iso(BED.cols, -0.45)[1] - h * scale} L ${iso(0, -0.45)[0]} ${iso(0, -0.45)[1] - h * scale}`} stroke="#EADBC0" strokeWidth={1.8 * scale} />
          <Path d={`M ${iso(-0.45, 0)[0]} ${iso(-0.45, 0)[1] - h * scale} L ${iso(-0.45, BED.rows)[0]} ${iso(-0.45, BED.rows)[1] - h * scale}`} stroke="#EADBC0" strokeWidth={1.8 * scale} />
        </G>
      ))}

      {/* raised bed: wooden sides, rim, soil, furrows */}
      <Polygon points={pts(corners.left, corners.front, [corners.front[0], corners.front[1] + d], [corners.left[0], corners.left[1] + d])} fill={shade(C.wood, 0.18)} />
      <Polygon points={pts(corners.front, corners.right, [corners.right[0], corners.right[1] + d], [corners.front[0], corners.front[1] + d])} fill={shade(C.wood, 0.34)} />
      <Polygon points={pts(iso(-0.12, -0.12), iso(BED.cols + 0.12, -0.12), iso(BED.cols + 0.12, BED.rows + 0.12), iso(-0.12, BED.rows + 0.12))} fill={C.wood} />
      <Polygon points={pts(corners.back, corners.right, corners.front, corners.left)} fill={C.soil} />
      {Array.from({ length: BED.rows - 1 }, (_, r) => {
        const [x1, y1] = iso(0.2, r + 1);
        const [x2, y2] = iso(BED.cols - 0.2, r + 1);
        return <Path key={r} d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={C.soilDark} strokeWidth={2 * scale} strokeLinecap="round" opacity={0.55} />;
      })}

      {/* Highlight every empty plot; matching accessible press targets sit above the SVG. */}
      {emptyPlots.map(plot => {
        const active = selectedPlot?.col === plot.col && selectedPlot.row === plot.row;
        const [x, y] = iso(plot.col + 0.5, plot.row + 0.5);
        return <G key={`empty-${plot.col}-${plot.row}`}>
          <Polygon points={pts(iso(plot.col + 0.08, plot.row + 0.08), iso(plot.col + 0.92, plot.row + 0.08), iso(plot.col + 0.92, plot.row + 0.92), iso(plot.col + 0.08, plot.row + 0.92))} fill={active ? C.sun : C.moss} fillOpacity={active ? 0.4 : 0.18} stroke={active ? C.sun : C.moss} strokeWidth={1.2 * scale} strokeDasharray={active ? undefined : `${3 * scale},${2 * scale}`} />
          <Path d={`M ${x - 4 * scale} ${y} H ${x + 4 * scale} M ${x} ${y - 4 * scale} V ${y + 4 * scale}`} stroke={active ? C.sun : C.mist} strokeWidth={1.5 * scale} strokeLinecap="round" />
        </G>;
      })}

      {/* plants, back to front */}
      {sorted.map((p) => {
        const [x, y] = iso(p.col + 0.5, p.row + 0.5);
        return (
          <G key={p.id} transform={`translate(${x} ${y}) scale(${scale})`}>
            <PlantArt plant={p} selected={p.id === selectedId} />
          </G>
        );
      })}

      {/* meadow details in front */}
      {[
        { c: -0.9, r: BED.rows + 0.3, kind: "bush" },
        { c: -0.4, r: BED.rows + 1.1, kind: "tuft" },
        { c: BED.cols + 0.5, r: 0.6, kind: "bush" },
        { c: BED.cols + 1.1, r: 1.5, kind: "tuft" },
        { c: 1.2, r: BED.rows + 1.4, kind: "flowers" },
        { c: BED.cols + 0.6, r: 2.6, kind: "flowers" },
      ].map((o, i) => {
        const [x, y] = iso(o.c, o.r);
        if (x < 8 || x > VB_W - 8) return null;
        return (
          <G key={i} transform={`translate(${x} ${y}) scale(${scale})`}>
            {o.kind === "bush" && (
              <G>
                <Circle cx={-6} cy={-7} r={8} fill={shade(meadow, 0.28)} />
                <Circle cx={5} cy={-8} r={9} fill={shade(meadow, 0.2)} />
                <Circle cx={0} cy={-13} r={7} fill={shade(meadow, 0.12)} />
              </G>
            )}
            {o.kind === "tuft" && <Path d="M -6 0 L -3 -9 L 0 0 L 2 -11 L 4 0 L 7 -7 L 8 0 Z" fill={shade(meadow, 0.22)} />}
            {o.kind === "flowers" && (
              <G>
                {[-8, 0, 7].map((fx, j) => (
                  <G key={j}>
                    <Path d={`M ${fx} 0 L ${fx} -7`} stroke={shade(meadow, 0.3)} strokeWidth={1.4} />
                    <Circle cx={fx} cy={-8} r={2.4} fill={["#FFFFFF", "#F7D154", "#F4A3C4"][j]} />
                  </G>
                ))}
              </G>
            )}
          </G>
        );
      })}

      {/* stepping stones in front */}
      {[0, 1, 2].map((i) => {
        const [x, y] = iso(BED.cols / 2 + 1.2 + i * 0.9, BED.rows + 0.9 + i * 0.9);
        return <Ellipse key={i} cx={x} cy={y} rx={11 * scale} ry={5 * scale} fill="#D9D4C7" />;
      })}

    </Svg>
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, width, height }}>
      {GARDEN_PLOTS.map(plot => {
        const plant = plants.find(p => p.col === plot.col && p.row === plot.row);
        const [x, y] = iso(plot.col + 0.5, plot.row + 0.5);
        const targetW = TILE_W * scale / k * 0.5;
        const targetH = TILE_H * scale / k * 0.9;
        return <Pressable key={`plot-${plot.col}-${plot.row}`} accessibilityRole="button"
          accessibilityLabel={plant ? `Care for plant in plot ${plotNumber(plot)}` : `Plant in empty plot ${plotNumber(plot)}`}
          accessibilityState={{ selected: selectedPlot?.col === plot.col && selectedPlot.row === plot.row }}
          onPress={() => plant ? onPlantPress?.(plant) : onEmptyPlotPress?.(plot)}
          style={{ position: "absolute", left: x / k - targetW / 2, top: y / k - targetH / 2, width: targetW, height: targetH }} />;
      })}
    </View>
    </View>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Ellipse cx={0} cy={0} rx={26} ry={10} fill="#FFFFFF" />
      <Circle cx={-8} cy={-6} r={11} fill="#FFFFFF" />
      <Circle cx={9} cy={-8} r={13} fill="#FFFFFF" />
    </G>
  );
}
