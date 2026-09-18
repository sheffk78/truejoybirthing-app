// HBand — approved photo header band (S10/S12) with 3-stop veil fade.
// Construction from common.css .hband: 168px tall, photo covers from top (object-position 50% 18%),
// veil: rgba(42,42,42,.05) 0% → transparent 45% → rgba(250,248,245,.75) 92% → #FAF8F5 100%.
// SVG gradient (react-native-svg) — no new dependency.

import React from 'react';
import { View, Image, StyleSheet, Platform, type ImageSourcePropType } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';

interface HBandProps {
  source: ImageSourcePropType;
  height?: number;
}

export default function HBand({ source, height = 168 }: HBandProps) {
  // Web: RN-web Image ignores resizeMode for its background-image layer (renders
  // intrinsic-size bg div → zoomed sliver). Bypass with real CSS background styles.
  // Native: keep RN Image with cover.
  const uri =
    Platform.OS === 'web' && typeof (source as any)?.uri === 'string'
      ? (source as any).uri
      : null;
  return (
    <View style={{ height, position: 'relative', overflow: 'hidden' }}>
      {uri ? (
        <View
          style={
            [
              StyleSheet.absoluteFill,
              {
                backgroundImage: `url("${uri}")`,
                backgroundSize: 'cover',
                backgroundPosition: '50% 18%',
                backgroundRepeat: 'no-repeat',
              },
            ] as any
          }
        />
      ) : (
        <Image source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
      )}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="hbandVeil" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2A2A2A" stopOpacity="0.05" />
            <Stop offset="0.45" stopColor="#FAF8F5" stopOpacity="0" />
            <Stop offset="0.92" stopColor="#FAF8F5" stopOpacity="0.75" />
            <Stop offset="1" stopColor="#FAF8F5" stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hbandVeil)" />
      </Svg>
    </View>
  );
}