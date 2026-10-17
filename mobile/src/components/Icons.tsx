// Hand-drawn line icons for the island (stroke = currentColor-style `color` prop).
import Svg, { Circle, Path } from "react-native-svg";

type IconProps = { color: string; size?: number };
const S = 1.8;

export function LeafIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 19c3-4 6-7 10-9" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export function TargetIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={S} />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={S} />
      <Circle cx={12} cy={12} r={0.8} fill={color} />
    </Svg>
  );
}

export function SparkIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z" stroke={color} strokeWidth={S} strokeLinejoin="round" />
      <Path d="M19 16.5c.2 1.4.8 2 2.2 2.2-1.4.2-2 .8-2.2 2.2-.2-1.4-.8-2-2.2-2.2 1.4-.2 2-.8 2.2-2.2Z" fill={color} />
    </Svg>
  );
}

export function ChartIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19V11M10 19V6M15 19v-5M20 19V9" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" stroke={color} strokeWidth={S} strokeLinejoin="round" />
      <Path d="M10 20.5a2.2 2.2 0 0 0 4 0" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export function DropIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5c3.5 4.4 6 7.6 6 10.5a6 6 0 0 1-12 0c0-2.9 2.5-6.1 6-10.5Z" fill={color} />
    </Svg>
  );
}

export function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill="#F4C95D" />
      <Circle cx={12} cy={12} r={6.5} fill="none" stroke="#C99A2E" strokeWidth={1.6} />
      <Path d="M12 8.5v7" stroke="#C99A2E" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronIcon({ color, size = 18, up }: IconProps & { up?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
