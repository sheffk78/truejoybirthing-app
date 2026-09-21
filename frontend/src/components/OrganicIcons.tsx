// OrganicIcons — the approved icon vocabulary (DESIGN-RULES.md §4.0, Jeff 2026-09-16)
// Every path is ported 1:1 from the approved HTML mockups (auth-screens-4/5.html).
// Soft hand-drawn strokes (1.7–2.0), sage #7C8F6F / rose #B87AA0 / lavender #8E8CB5.
// NO ionicons, NO emoji, NO geometric library shapes on onboarding surfaces.
import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { ViewStyle } from 'react-native';

export const SAGE = '#7C8F6F';
export const ROSE = '#B87AA0';
export const LAV = '#8E8CB5';
export const SAGE_FILL = '#E8EDE5';
export const ROSE_FILL = '#F6E9F0';
export const LAV_FILL = '#F2F1FA';

export type IconProps = {
  size?: number;
  color?: string;
  fillColor?: string;
  opacity?: number;
  style?: ViewStyle;
};

const base = (size: number, opacity = 1, style?: ViewStyle) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  opacity,
  style,
});

const wrap =
  (children: (c: string, f: string) => React.ReactNode) =>
  ({ size = 20, color = SAGE, fillColor = SAGE_FILL, opacity = 1, style }: IconProps) => (
    <Svg {...base(size, opacity, style)}>{children(color, fillColor)}</Svg>
  );

// ── Sprigs (vegetation only) ─────────────────────────────────────────
/** Single stem + one leaf — the zip/marker sprig */
export const SprigOne = wrap((c, f) => (
  <>
    <Path d="M12 21V11" stroke={c} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    <Path d="M12 14c-3.6 0-5.5-2-6-5 3.6 0 5.5 2 6 5z" fill={f} stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
  </>
));

/** Stem + two leaves (up pair) */
export const SprigTwo = wrap((c, f) => (
  <>
    <Path d="M12 21V9" stroke={c} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    <Path d="M12 13c-4.2 0-6.5-2.4-7-6 4.2 0 6.5 2.4 7 6z" fill={f} stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M12 15.5c3.4 0 5.4-1.9 6-4.8-3.4 0-5.4 1.9-6 4.8z" fill={f} stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
  </>
));

/** Stem + rose bud tip */
export const SprigBud = wrap((c, f) => (
  <>
    <Path d="M12 20V7" stroke={c} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    <Circle cx={12} cy={5} r={1.4} fill={ROSE} />
    <Path d="M9.6 7.2c.8-1.8 4-1.8 4.8 0-.8 1.8-4 1.8-4.8 0z" fill={f} stroke={ROSE} strokeWidth={1.2} strokeLinejoin="round" />
  </>
));

// ── Birth-setting icons (mom form) ──────────────────────────────────
/** Soft house with warm door */
export const House = wrap((c) => (
  <>
    <Path d="M4.5 11.5C7 9 10 7.2 12 7.2s5 1.8 7.5 4.3" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6.5 10.6V19c0 .8.7 1.5 1.5 1.5h8c.8 0 1.5-.7 1.5-1.5v-8.4" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 20.3v-4.6c0-1.2.9-2.1 2-2.1s2 .9 2 2.1v4.6" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>
));

/** Shield with care-plus */
export const ShieldPlus = wrap((c) => (
  <>
    <Path d="M12 4.5c2.8 1.1 4.9 1.5 6.8 1.6.3 6.1-1.6 11-6.8 14.4C6.8 17.1 4.9 12.2 5.2 6.1 7.1 6 9.2 5.6 12 4.5z" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 9.5v6M9 12.5h6" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
  </>
));

/** Bassinet with rocker base (reads as cradle, not bell) */
export const Bassinet = wrap((c) => (
  <>
    <Path d="M7.2 11.6c.3-2.8 2.1-4.6 4.8-4.6s4.5 1.8 4.8 4.6" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    <Path d="M6.4 11.6c0 4.2 2.4 6.6 5.6 6.6s5.6-2.4 5.6-6.6" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    <Path d="M4.6 18.6c3 1.6 11.8 1.6 14.8 0" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
  </>
));

/** Hand-drawn question swirl with dot */
export const QuestionSwirl = wrap((c) => (
  <>
    <Path d="M9.5 9.5c.2-2 1.5-3.2 3.2-3.1 1.7.1 3 1.3 3 3 0 2.3-3.1 2.7-3.1 5" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    <Circle cx={12.4} cy={18.2} r={1.1} fill={c} />
  </>
));

// ── Form + list icons ────────────────────────────────────────────────
/** Soft calendar (due date) */
export const Calendar = wrap((c) => (
  <>
    <Rect x={4} y={5.5} width={16} height={15} rx={3} stroke={c} strokeWidth={1.9} fill="none" />
    <Path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
  </>
));

/** Rounded document with list lines (birth plan) — rose */
export const DocList = wrap((c) => (
  <>
    <Path d="M7 4.8C9.5 4.4 14.5 4.4 17 4.8c.4 4.9.4 9.5 0 14.4-2.5.4-7.5.4-10 0-.4-4.9-.4-9.5 0-14.4z" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9.5 9.5h5M9.5 12.5h5M9.5 15.5h3" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
  </>
));

/** Two care figures (team/messaging) — lavender */
export const TwoFigures = wrap((c) => (
  <>
    <Path d="M9.5 11.5C7.5 11.5 6 10 6 8.2S7.5 5 9.5 5s3.5 1.4 3.5 3.2-1.5 3.3-3.5 3.3z" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    <Path d="M4 19.5c.4-3 2.6-4.8 5.5-4.8 1.6 0 3 .5 4 1.4" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    <Path d="M15.5 11c1.7-.3 2.9-1.5 2.9-3.1 0-1.5-1.2-2.7-2.8-2.9" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    <Path d="M16.5 14.6c2.1.5 3.4 2 3.6 4.4" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
  </>
));

// ── Chevrons (stroke 2.2 charcoal, per approved back-chip spec) ──────
export const ChevronLeft = ({ size = 18, color = '#2A2A2A', style }: IconProps) => (
  <Svg {...base(size, 1, style)}>
    <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevronRight = ({ size = 16, color = '#FFFFFF', style }: IconProps) => (
  <Svg {...base(size, 1, style)}>
    <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevronDown = ({ size = 18, color = '#B9B7CE', style }: IconProps) => (
  <Svg {...base(size, 1, style)}>
    <Path d="M6 9.5l6 6 6-6" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/** Tiny sprig (this-week card) — 3-lobe variant */
export const SprigTiny = wrap((c) => (
  <>
    <Path d="M12 21V10" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    <Path d="M12 13c-3.4 0-5.2-1.8-5.6-4.6C9.4 8.4 11.6 10.2 12 13z" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 10.5c3-0.2 4.6-1.9 4.9-4.4-3-.1-4.7 1.5-4.9 4.4z" stroke={c} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>
));

// ── Name-map for data-driven steps (tutorialData icon fields) ────────
export const ORGANIC_ICONS: Record<string, React.ComponentType<IconProps>> = {
  sprigOne: SprigOne,
  sprigTwo: SprigTwo,
  sprigBud: SprigBud,
  sprigTiny: SprigTiny,
  house: House,
  shieldPlus: ShieldPlus,
  bassinet: Bassinet,
  questionSwirl: QuestionSwirl,
  calendar: Calendar,
  docList: DocList,
  twoFigures: TwoFigures,
};