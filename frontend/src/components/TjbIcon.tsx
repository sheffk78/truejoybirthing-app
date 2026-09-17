/**
 * TJB Custom Icons — hand-drawn glyph set, locked 2026-09-15 (Jeff approved).
 * Source of truth: docs/design-refresh/surfaces-2026-09-14/icons.mjs (mockups).
 * Style: sage-ink strokes, 1.7px at 24 box, round caps/joins, curves-first.
 * Rendered via react-native-svg (already a dependency).
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type TjbIconName =
  // tab bar
  | 'tjb-home' | 'tjb-birthplan' | 'tjb-timer' | 'tjb-team' | 'tjb-messages' | 'tjb-profile'
  // birth-plan sections (match SECTION_ICONS keys 1:1)
  | 'tjb-about-me' | 'tjb-labor-delivery' | 'tjb-labor-support' | 'tjb-pain-management'
  | 'tjb-monitoring-iv' | 'tjb-induction' | 'tjb-pushing-safe-word' | 'tjb-birth-preferences'
  | 'tjb-post-delivery' | 'tjb-after-birth' | 'tjb-newborn-care' | 'tjb-other-considerations'
  // status
  | 'tjb-status-todo' | 'tjb-status-wip' | 'tjb-status-done'
  // utility
  | 'tjb-autoshare';

const GLYPHS: Record<TjbIconName, React.ReactNode> = {
  // ── Tab bar ──────────────────────────────────────────────
  'tjb-home': (
    <>
      <Path d="M4.5 11.2 C7 8.4 9.5 6.4 12 6.4 C14.5 6.4 17 8.4 19.5 11.2" />
      <Path d="M6.2 10.4 L6.2 18.2 C6.2 18.9 6.7 19.4 7.4 19.4 L16.6 19.4 C17.3 19.4 17.8 18.9 17.8 18.2 L17.8 10.4" />
      <Path d="M10.2 19.4 L10.2 15.6 C10.2 14.9 10.7 14.4 11.4 14.4 L12.6 14.4 C13.3 14.4 13.8 14.9 13.8 15.6 L13.8 19.4" />
      <Path d="M12 6.4 C12 5.2 12.6 4.4 13.6 3.9" />
    </>
  ),
  'tjb-birthplan': (
    <>
      <Path d="M6.5 4.6 C9.8 4.2 13.6 4.3 17.4 4.6 C18 4.6 18.5 5.1 18.5 5.8 L18.5 19 C18.5 19.6 18 20.1 17.4 20.1 C13.8 20.4 9.9 20.4 6.5 20.1 C5.9 20.1 5.4 19.6 5.4 19 L5.4 5.8 C5.4 5.1 5.9 4.6 6.5 4.6 Z" />
      <Path d="M8.8 9.2 C10.9 8.9 13.1 8.9 15.2 9.2" />
      <Path d="M8.8 12.4 C10.4 12.2 12 12.2 13.5 12.4" />
      <Path d="M8.8 15.6 C10 15.5 11 15.5 12 15.6" />
      <Path d="M14.6 15.2 C15.4 14.4 16.2 14.3 16.6 14.9 C16.9 15.4 16.5 16 15.7 16.6" />
    </>
  ),
  'tjb-timer': (
    <>
      <Circle cx="12" cy="13.4" r="7.2" />
      <Path d="M12 9.6 L12 13.4 L14.6 15.2" />
      <Path d="M9.8 3.6 L14.2 3.6" />
      <Path d="M12 3.6 L12 6.2" />
    </>
  ),
  'tjb-team': (
    <>
      <Path d="M9.2 11.4 C6.9 11.4 5.2 9.7 5.2 7.7 C5.2 5.8 6.9 4.3 9.2 4.3 C11.4 4.3 13.1 5.8 13.1 7.7 C13.1 9.7 11.4 11.4 9.2 11.4 Z" />
      <Path d="M3.6 19.3 C3.9 15.9 6.1 13.9 9.2 13.9 C12.2 13.9 14.4 15.9 14.8 19.3" />
      <Path d="M15.4 11 C17.2 10.7 18.7 9.5 18.7 7.9 C18.7 6.8 18 5.9 17 5.4" />
      <Path d="M16.6 14.2 C18.6 14.6 19.9 16.4 20.2 19.3" />
    </>
  ),
  'tjb-messages': (
    <>
      <Path d="M4.4 8.2 C4.4 6.3 5.9 4.8 7.8 4.8 L16.2 4.8 C18.1 4.8 19.6 6.3 19.6 8.2 L19.6 13.4 C19.6 15.3 18.1 16.8 16.2 16.8 L10.6 16.8 L6.6 19.8 L6.9 16.7 C5.4 16.3 4.4 15 4.4 13.4 Z" />
      <Path d="M8.4 9.4 C9.8 9.1 11.2 9.1 12.6 9.4" />
      <Path d="M8.4 12.2 C9.4 12 10.4 12 11.4 12.2" />
    </>
  ),
  'tjb-profile': (
    <>
      <Circle cx="12" cy="8.6" r="4.2" />
      <Path d="M5 19.6 C5.6 15.9 8.2 14 12 14 C15.8 14 18.4 15.9 19 19.6" />
      <Path d="M12 19.6 C12.8 19.6 13.5 19.5 14.2 19.4" />
    </>
  ),

  // ── Birth-plan sections (12) ────────────────────────────
  'tjb-about-me': (
    <>
      <Circle cx="12" cy="8.4" r="3.9" />
      <Path d="M5.4 19.6 C6 16 8.5 14.2 12 14.2 C15.5 14.2 18 16 18.6 19.6" />
      <Path d="M9.9 8.2 C10.6 7.4 11.6 7 12.6 7.2" />
    </>
  ),
  'tjb-labor-delivery': (
    <>
      <Path d="M12 20 C8.4 16.4 5.6 13.2 5.6 9.8 C5.6 6.9 7.8 4.8 10.4 4.8 C11 4.8 11.6 5 12 5.3 C12.4 5 13 4.8 13.6 4.8 C16.2 4.8 18.4 6.9 18.4 9.8 C18.4 13.2 15.6 16.4 12 20 Z" />
      <Path d="M12 5.3 L12 9.4" />
      <Path d="M12 9.4 C13.8 9.4 15 10.4 15 12" />
    </>
  ),
  'tjb-labor-support': (
    <>
      <Path d="M8.4 19.2 L8.4 10.6 C8.4 9.9 8.9 9.4 9.6 9.4 L14.4 9.4 C15.1 9.4 15.6 9.9 15.6 10.6 L15.6 19.2" />
      <Path d="M8.4 12.6 L5.9 14.3 C5.3 14.7 5.2 15.5 5.6 16.1 L7.6 18.6" />
      <Path d="M15.6 12.6 L18.1 14.3 C18.7 14.7 18.8 15.5 18.4 16.1 L16.4 18.6" />
      <Path d="M12 9.4 C12 7.6 12.8 6.4 14.2 5.6" />
    </>
  ),
  'tjb-pain-management': (
    <>
      <Path d="M12 4.6 C10 6.8 9 9 9 11.4 C9 14.4 10.3 16.4 12 16.4 C13.7 16.4 15 14.4 15 11.4 C15 9 14 6.8 12 4.6 Z" />
      <Path d="M12 16.4 L12 19.4" />
      <Path d="M9.6 18 C11.2 18.6 12.8 18.6 14.4 18" />
    </>
  ),
  'tjb-monitoring-iv': (
    <>
      <Path d="M7.6 4.6 L7.6 8.4 C7.6 10.4 8.9 11.8 10.8 12 L10.8 19.4" />
      <Path d="M13.2 19.4 L13.2 12 C15.1 11.8 16.4 10.4 16.4 8.4 L16.4 4.6" />
      <Path d="M6.4 4.6 L9.6 4.6" />
      <Path d="M14.4 4.6 L17.6 4.6" />
      <Path d="M10.8 15.6 L13.2 15.6" />
      <Path d="M12 20.6 C12.8 20.6 13.4 20 13.4 19.4 C13.4 18.8 12.8 18.2 12 18.2 C11.2 18.2 10.6 18.8 10.6 19.4 C10.6 20 11.2 20.6 12 20.6 Z" />
    </>
  ),
  'tjb-induction': (
    <>
      <Path d="M9.4 4.6 L14.6 4.6 L14.6 9.2 C14.6 11 15.6 12.2 15.6 14.4 C15.6 17.4 14.1 19.4 12 19.4 C9.9 19.4 8.4 17.4 8.4 14.4 C8.4 12.2 9.4 11 9.4 9.2 Z" />
      <Path d="M9.4 6.8 L14.6 6.8" />
      <Path d="M12 19.4 L12 21" />
    </>
  ),
  'tjb-pushing-safe-word': (
    <>
      <Path d="M4.6 12.4 C7.2 10.2 9.8 9.2 12 9.2 C14.2 9.2 16.8 10.2 19.4 12.4" />
      <Path d="M6.4 16.8 C8.6 15.2 10.4 14.4 12 14.4 C13.6 14.4 15.4 15.2 17.6 16.8" />
      <Path d="M9 20 C10 19.3 11 19 12 19 C13 19 14 19.3 15 20" />
      <Path d="M12 9.2 C12 6.6 12.6 4.9 14 3.8" />
    </>
  ),
  'tjb-birth-preferences': (
    <>
      <Rect x="5.4" y="4.6" width="13.2" height="15" rx="2.4" />
      <Path d="M8.6 9.6 L10.8 11.8 L15.2 7.6" />
      <Path d="M8.6 14.6 L15.4 14.6" />
      <Path d="M8.6 16.8 L13 16.8" />
    </>
  ),
  'tjb-post-delivery': (
    <>
      <Path d="M5.2 14.2 C7.6 12.6 10 11.8 12 11.8 C14 11.8 16.4 12.6 18.8 14.2" />
      <Path d="M12 11.8 C12 9.8 12.9 8.5 14.6 7.8" />
      <Path d="M4.9 17.6 C5.6 17.9 6.3 18 7 17.8" />
      <Path d="M17 17.8 C17.7 18 18.4 17.9 19.1 17.6" />
      <Path d="M12 19.8 C12.9 19.8 13.6 19.6 14.2 19.2" />
    </>
  ),
  'tjb-after-birth': (
    <>
      <Path d="M12 19.2 C9 16.6 6.6 14 6.6 11 C6.6 8.3 8.6 6.4 11 6.4 C11.4 6.4 11.7 6.5 12 6.6 C12.3 6.5 12.6 6.4 13 6.4 C15.4 6.4 17.4 8.3 17.4 11 C17.4 14 15 16.6 12 19.2 Z" />
      <Path d="M6.6 11 C4.9 10.9 3.8 10.1 3.6 8.8" />
      <Path d="M17.4 11 C19.1 10.9 20.2 10.1 20.4 8.8" />
    </>
  ),
  'tjb-newborn-care': (
    <>
      <Circle cx="12" cy="13.2" r="6.4" />
      <Path d="M9.9 5.6 C10.6 4.5 11.3 4 12 4 C12.7 4 13.4 4.5 14.1 5.6" />
      <Path d="M9.8 12.4 C10.6 13 11.4 13.3 12 13.3 C12.6 13.3 13.4 13 14.2 12.4" />
      <Path d="M9.6 15.6 C11.2 16.4 12.8 16.4 14.4 15.6" />
    </>
  ),
  'tjb-other-considerations': (
    <>
      <Path d="M9 5.4 C11.4 5 13.9 5 16.9 5.4 C17.5 5.5 18 6 18 6.6 L18 18.2 C18 18.8 17.5 19.3 16.9 19.4 C13.9 19.8 11.4 19.8 9 19.4" />
      <Path d="M9 5.4 C7.3 5.6 6.4 6.5 6.4 8 L6.4 16.9 C6.4 18.4 7.3 19.3 9 19.4" />
      <Path d="M10.6 9.4 C12.4 9.2 14 9.2 15.6 9.4" />
      <Path d="M10.6 12.4 C12 12.3 13.2 12.3 14.4 12.4" />
      <Path d="M10.6 15.4 C11.6 15.3 12.4 15.3 13.4 15.4" />
    </>
  ),

  // ── Status (3) ──────────────────────────────────────────
  'tjb-status-todo': <Circle cx="12" cy="12" r="7.6" />,
  'tjb-status-wip': (
    <>
      <Path d="M12 4.4 C15.9 4.4 19.6 7.7 19.6 12 C19.6 16.3 15.9 19.6 12 19.6" />
      <Path d="M12 9.6 L12 13.4 L14.6 15.2" />
    </>
  ),
  'tjb-status-done': (
    <>
      <Circle cx="12" cy="12" r="7.6" />
      <Path d="M8.4 12.2 L10.8 14.6 L15.6 9.6" />
    </>
  ),

  // ── Utility ─────────────────────────────────────────────
  'tjb-autoshare': (
    <>
      <Path d="M4.8 10.6 L4.8 17.2 C4.8 18 5.4 18.6 6.2 18.6 L17.8 18.6 C18.6 18.6 19.2 18 19.2 17.2 L19.2 10.6" />
      <Path d="M4.8 10.6 L10.6 14.2 C11.5 14.8 12.5 14.8 13.4 14.2 L19.2 10.6" />
      <Path d="M12 9.2 C12 6.4 13.4 4.6 16 4.2" />
      <Path d="M13.8 6.2 L16 4.2 L18.2 5.9" />
    </>
  ),
};

interface TjbIconProps {
  name: TjbIconName;
  size?: number;
  color?: string;
}

export function TjbIcon({ name, size = 24, color = '#2A2A2A' }: TjbIconProps) {
  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPHS[name]}
    </Svg>
  );
}

export default TjbIcon;