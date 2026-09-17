// CreamFade — true multi-stop photo→cream dissolve (approved mock §4 fade)
// Uses react-native-svg's LinearGradient (installed v15.15.5) overlaid on the
// photo; CREAM matches the theme canvas #FAF8F5.
import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const CREAM = '#FAF8F5';

interface CreamFadeProps {
  /** height of the fade band in px (default matches mock: 150) */
  height?: number;
}

export default function CreamFade({ height = 150 }: CreamFadeProps) {
  return (
    <Svg
      height={height}
      width="100%"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="creamFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={CREAM} stopOpacity="0" />
          <Stop offset="0.55" stopColor={CREAM} stopOpacity="0.72" />
          <Stop offset="1" stopColor={CREAM} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={height} fill="url(#creamFade)" />
    </Svg>
  );
}