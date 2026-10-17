// Small shared UI pieces drawn on the pine island.
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { C, F, R, T } from "@/theme";

export function Ring({ value, size = 64, stroke = 7, color = C.sun, children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.pineLine} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ * v} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function Bar({ value, color = C.moss, height = 6 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: C.pineLine, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

/** Seven small bars, today highlighted. Goal shown as a faint line. */
export function WeekBars({ values, goal, better, width = 96, height = 34 }: { values: number[]; goal?: number; better: "higher" | "lower"; width?: number; height?: number }) {
  const max = Math.max(...values, goal ?? 0) * 1.1 || 1;
  const gap = 4;
  const bw = (width - gap * (values.length - 1)) / values.length;
  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * height);
        const ok = goal === undefined ? true : better === "higher" ? v >= goal : v <= goal;
        const last = i === values.length - 1;
        return (
          <Rect
            key={i}
            x={i * (bw + gap)}
            y={height - h}
            width={bw}
            height={h}
            rx={bw / 2.5}
            fill={ok ? C.moss : C.fern}
            opacity={last ? 1 : 0.55}
          />
        );
      })}
      {goal !== undefined && <Rect x={0} y={height - (goal / max) * height} width={width} height={1} fill={C.mist} opacity={0.5} />}
    </Svg>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, onPress, tone = "soft" }: { label: string; onPress?: () => void; tone?: "soft" | "solid" }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, tone === "solid" && styles.chipSolid, pressed && { opacity: 0.7 }]}>
      <Text style={[styles.chipText, tone === "solid" && { color: C.pine }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint && <Text style={styles.sectionHint}>{hint}</Text>}
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: C.pineRaised, borderRadius: R.card, padding: 16, marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.pineLine, alignSelf: "flex-start" },
  chipSolid: { backgroundColor: C.moss },
  chipText: { color: C.mist, fontSize: T.small, fontWeight: "600" },
  sectionTitle: { color: C.mist, fontFamily: F.display, fontSize: T.title },
  sectionHint: { color: C.fern, fontSize: T.small, marginTop: 2, lineHeight: 18 },
  h: { color: C.mist, fontSize: T.heading, fontWeight: "600" },
  body: { color: C.mist, fontSize: T.body, lineHeight: 21 },
  muted: { color: C.fern, fontSize: T.small, lineHeight: 18 },
  num: { color: C.mist, fontFamily: F.display, fontSize: T.title },
});
