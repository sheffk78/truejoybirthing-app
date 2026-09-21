// GrowthSprig — hand-drawn growth-motif SVGs (vegetation only: stems/leaves/buds/blossoms)
// Design-refresh 2026-09-14 · vocabulary per DESIGN-PLAN-2026-09-14.md §3
// Organic curved strokes, varied widths, no geometric perfection. Colors come from theme tokens only.
import React from 'react';
import Svg, { Path, Ellipse, Circle, G } from 'react-native-svg';
import { ViewStyle } from 'react-native';

export type GrowthStage = 'sprout' | 'leafing' | 'budding' | 'blossom';

// Pregnancy week → trimester in plain language (Jeff 09-15: no growth jargon in UI copy)
export const trimesterForWeek = (week?: number | null): string => {
  if (week == null) return 'First trimester';
  if (week <= 13) return 'First trimester';
  if (week <= 27) return 'Second trimester';
  return 'Third trimester';
};

interface GrowthSprigProps {
  stage?: GrowthStage;
  size?: number;
  stroke: string;
  fill: string;
  style?: ViewStyle;
}

// Hand-drawn feel: asymmetric curves, varied stroke widths (2.6 stem / 1.4 leaf edges)
const sprigPaths: Record<GrowthStage, (stroke: string, fill: string) => React.ReactNode> = {
  sprout: (s, f) => (
    <>
      <Path d="M12 21.5 C 11.6 17, 12.4 12.5, 12 8.8" stroke={s} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M11.9 14.6 C 9.6 14.2, 8.2 12.7, 7.9 10.3 C 10.3 10.7, 11.8 12.2, 11.9 14.6 Z" fill={f} stroke={s} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M12.1 11.4 C 14.3 11, 15.7 9.7, 16 7.5 C 13.8 7.9, 12.3 9.2, 12.1 11.4 Z" fill={f} stroke={s} strokeWidth={1.4} strokeLinejoin="round" />
    </>
  ),
  leafing: (s, f) => (
    <>
      <Path d="M12 22 C 11.5 17, 12.5 10.5, 11.8 4.2" stroke={s} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M11.9 16.8 C 9.5 16.4, 8 14.9, 7.7 12.4 C 10.1 12.8, 11.7 14.4, 11.9 16.8 Z" fill={f} stroke={s} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M12.2 12.2 C 14.5 11.8, 15.9 10.4, 16.2 8 C 13.9 8.4, 12.4 9.9, 12.2 12.2 Z" fill={f} stroke={s} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M11.8 8.4 C 9.8 8, 8.6 6.8, 8.3 4.9 C 10.3 5.2, 11.6 6.4, 11.8 8.4 Z" fill={f} stroke={s} strokeWidth={1.3} strokeLinejoin="round" />
    </>
  ),
  budding: (s, f) => (
    <>
      <Path d="M12 22 C 11.6 17.5, 12.4 13, 11.9 8.6" stroke={s} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M11.9 15.4 C 9.7 15, 8.3 13.6, 8 11.4 C 10.2 11.8, 11.7 13.2, 11.9 15.4 Z" fill={f} stroke={s} strokeWidth={1.4} strokeLinejoin="round" />
      <Ellipse cx={11.85} cy={5.9} rx={2.1} ry={3} fill={f} stroke={s} strokeWidth={1.5} transform="rotate(-8 11.85 5.9)" />
      <Path d="M10.4 8.1 C 10.9 7.2, 11.4 6.9, 12 6.8" stroke={s} strokeWidth={1.3} strokeLinecap="round" fill="none" />
    </>
  ),
  blossom: (s, f) => (
    <>
      <Path d="M12 22 C 11.6 18, 12.4 14.5, 12 10.8" stroke={s} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M11.9 17.4 C 9.7 17, 8.3 15.6, 8 13.4 C 10.2 13.8, 11.7 15.2, 11.9 17.4 Z" fill={f} stroke={s} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M12.1 14.6 C 14.3 14.2, 15.7 12.9, 16 10.7 C 13.8 11.1, 12.3 12.4, 12.1 14.6 Z" fill={f} stroke={s} strokeWidth={1.4} strokeLinejoin="round" />
      <G>
        {[0, 72, 144, 216, 288].map((deg) => (
          <Ellipse key={deg} cx={12} cy={4.7} rx={2} ry={2.9} fill={f} stroke={s} strokeWidth={1.3} transform={`rotate(${deg} 12 8)`} />
        ))}
      </G>
      <Circle cx={12} cy={8} r={1.5} fill={s} />
    </>
  ),
};

export default function GrowthSprig({ stage = 'sprout', size = 20, stroke, fill, style }: GrowthSprigProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {sprigPaths[stage](stroke, fill)}
    </Svg>
  );
}

// Delicate stem divider with two tiny leaves — replaces plain rules between sections
export function GrowthDivider({ width = 120, stroke, fill, style }: { width?: number; stroke: string; fill: string; style?: ViewStyle }) {
  return (
    <Svg width={width} height={14} viewBox="0 0 120 14" style={style}>
      <Path d="M3 8.2 C 30 6.4, 58 9.6, 117 6.9" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Path d="M46 7.9 C 44.2 6.7, 43.7 5.1, 44.3 3.3 C 46.5 4, 47.4 6, 46.2 8 Z" fill={fill} stroke={stroke} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d="M72 8.4 C 73.8 7.4, 74.4 5.9, 73.9 4.1 C 71.8 4.9, 70.9 6.7, 72 8.5 Z" fill={fill} stroke={stroke} strokeWidth={1.1} strokeLinejoin="round" />
    </Svg>
  );
}