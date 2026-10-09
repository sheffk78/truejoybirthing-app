// T.tsx — Type law component (P2 typography law, JOB-2026-10-09i, 2026-10-09)
//
// The H1/H2/H3/body/caption/kicker law as named components, per
// docs/design-refresh/TYPE-SYSTEM.md (app column) and the 10/09 consistency
// plan. Every preset hard-locks face + size + lineHeight from the law ladder —
// a screen cannot render an off-scale heading without touching this file.
//
//   h1      Cormorant 700 26/30   once per screen
//   h2      Cormorant 700 21/25   section headers
//   h3      Cormorant 600 17/21   card titles, sub-blocks
//   body    Quicksand 500 13.5/21
//   caption Quicksand 500 11/16
//   kicker  Quicksand 700 10 / ls 2.2 / caps
//   numeral Cormorant 700 serif numerals — size REQUIRED, must be a lawful
//           numeral {19, 21, 22, 23, 26, 52, 74} (ts literal check)
//
// Preset values live in TYPE_SCALE (single source, exported for tests/gates);
// colors resolve live from ThemeContext (light/dark), values from the P1 leaf.

import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { FONTS, SIZES } from '../constants/tokens';

export const TYPE_SCALE = {
  h1: { fontSize: 26, lineHeight: 30, fontFamily: FONTS.heading, fontWeight: '700' },
  h2: { fontSize: 21, lineHeight: 25, fontFamily: FONTS.heading, fontWeight: '700' },
  h3: { fontSize: 17, lineHeight: 21, fontFamily: FONTS.subheading, fontWeight: '600' },
  body: { fontSize: SIZES.fontMd, lineHeight: 21, fontFamily: FONTS.body, fontWeight: '500' },
  caption: { fontSize: SIZES.fontXs, lineHeight: 16, fontFamily: FONTS.body, fontWeight: '500' },
  kicker: { fontSize: 10, letterSpacing: 2.2, fontFamily: FONTS.bold, fontWeight: '700' },
} as const satisfies Record<string, TextStyle>;

// Lawful numeral sizes (serif stat/clock/display numerals)
export const NUMERAL_SIZES = [19, 21, 22, 23, 26, 52, 74] as const;
export type NumeralSize = (typeof NUMERAL_SIZES)[number];

// Type tag → default color resolution. All resolve from the live theme.
export type TPreset = keyof typeof TYPE_SCALE | 'numeral';

const UPPERCASE_PRESETS = new Set<TPreset>(['kicker']);

export interface TProps extends TextProps {
  preset: TPreset;
  /** Required only for preset="numeral" — must be a lawful numeral size. */
  size?: NumeralSize;
  /** Color override (defaults to theme text color; numerals often accent). */
  color?: string;
  align?: TextStyle['textAlign'];
}

const isNumeralSize = (v: unknown): v is NumeralSize =>
  NUMERAL_SIZES.includes(v as NumeralSize);

/** Law numeral resolver — throws on any non-lawful size (the enforcement point). */
export function numeralStyle(size: unknown): TextStyle {
  if (!isNumeralSize(size)) {
    throw new Error(
      `T numeral: size must be a lawful numeral (${NUMERAL_SIZES.join(', ')}) — got ${String(size)}`,
    );
  }
  return {
    fontSize: size,
    lineHeight: Math.round(size * 1.1),
    fontFamily: FONTS.heading,
    fontWeight: '700',
  };
}

export function T({ preset, size, color, align, style, ...rest }: TProps) {
  const { theme } = useTheme();
  const ink = theme.colors.text.primary;

  let presetStyle: TextStyle;
  if (preset === 'numeral') {
    presetStyle = numeralStyle(size); // throws on non-lawful size (law check)
  } else {
    presetStyle = TYPE_SCALE[preset];
  }

  const resolved: TextStyle = {
    ...presetStyle,
    color: color ?? ink,
    ...(align ? { textAlign: align } : {}),
    ...(UPPERCASE_PRESETS.has(preset) ? { textTransform: 'uppercase' as const } : {}),
  };

  return <Text {...rest} style={[resolved, style]} />;
}

export default T;