// HBand — approved photo header band (S10/S12) with 3-stop veil fade.
// Construction from common.css .hband: 168px tall, photo covers from top (object-position 50% 18%),
// light veil: rgba(42,42,42,.05) 0% → transparent 45% → rgba(250,248,245,.75) 92% → #FAF8F5 100%.
// Dark veil (approved dark corpus, Jeff 2026-09-23): plum-black fade into #1A1520.
// SVG gradient (react-native-svg) — no new dependency.

import React from 'react';
import { View, StyleSheet, Platform, type ImageSourcePropType } from 'react-native';
import { Image as ExpoImage, type ImageContentPosition } from 'expo-image';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import { veilStopsFor, veilStopsAsCss, rgbaToHex as rgbaToHexSafe, parseRgbaAlpha as parseRgbaAlphaSafe } from '../../constants/corpus';
import { useTheme } from '../../contexts/ThemeContext';

interface HBandProps {
  source: ImageSourcePropType;
  height?: number;
  /** CSS background-position for the web path, e.g. '50% 45%'. Default '50% 18%' (approved S10/S12 anchor). */
  focus?: string;
}

export default function HBand({ source, height = 168, focus = '50% 18%' }: HBandProps) {
  const { themeName } = useTheme();
  const stops = veilStopsFor(themeName);
  // Web: RN-web Image ignores resizeMode for its background-image layer (renders
  // intrinsic-size bg div → zoomed sliver), and react-native-svg defaults to its
  // intrinsic 300×150 size under absoluteFill (veil = misplaced white patch).
  // Bypass BOTH with plain CSS: background-image photo + linear-gradient veil.
  // Native: RN Image (cover) + SVG veil, which size correctly on native.
  const uri =
    Platform.OS === 'web' && typeof (source as any)?.uri === 'string'
      ? (source as any).uri
      : null;
  if (uri) {
    return (
      <View style={{ height, position: 'relative', overflow: 'hidden' }}>
        <View
          style={
            [
              StyleSheet.absoluteFill,
              {
                backgroundImage: `url("${uri}")`,
                backgroundSize: 'cover',
                backgroundPosition: focus,
                backgroundRepeat: 'no-repeat',
              },
            ] as any
          }
        />
        <View
          style={
            [
              StyleSheet.absoluteFill,
              {
                backgroundImage: `linear-gradient(to bottom, ${veilStopsAsCss(stops)})`,
              },
            ] as any
          }
        />
      </View>
    );
  }
  return (
    <View style={{ height, position: 'relative', overflow: 'hidden' }}>
      {/* expo-image: contentFit cover + contentPosition honor the approved focus anchor
          ('50% 18%' etc.) natively — RN Image's absoluteFill+cover mis-scaled to an extreme
          center-face crop (diag hband-diag A vs B, 2026-09-23). */}
      <ExpoImage
        source={source}
        contentFit="cover"
        contentPosition={{ top: focus.split(' ')[1] } as ImageContentPosition}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        transition={0}
      />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <SvgGradient id="hbandVeil" x1="0" y1="0" x2="0" y2="1">
            {stops.map((s, i) => (
              <Stop
                key={i}
                offset={String(s.position)}
                stopColor={s.color.includes('rgba(') ? rgbaToHexSafe(s.color) : s.color}
                stopOpacity={String(s.color.includes('rgba(') ? parseRgbaAlphaSafe(s.color) : 1)}
              />
            ))}
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hbandVeil)" />
      </Svg>
    </View>
  );
}

// rgba(26,21,32,0.15) -> 0.15 ; '#1A1520' -> 1
function parseRgbaAlpha(color: string): number {
  const m = /rgba\([^)]+,\s*([\d.]+)\)/.exec(color);
  return m ? parseFloat(m[1]) : 1;
}