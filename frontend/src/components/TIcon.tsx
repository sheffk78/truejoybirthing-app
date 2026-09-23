import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// TIcon — TJB approved icon system (hand-drawn organic set, rev 2).
// Source of truth: docs/design-refresh/surfaces-2026-09-14/icons.mjs
// (rev 2, 2026-09-18: 3 section glyphs redrawn as objects — Jeff approved).
// 9 utility glyphs added verbatim from the approved s10s11s12 mockup — no new
// drawings invented: ta_history/ta_add/ta_share/gear/k_timeline/bell (the mockup's
// single bell drawing, reused for schedule + prenatal + birthplan-review rows),
// ar_contract/ar_invoice/ar_invoice_paid for the action-required rows.
// Law: stroke 1.7 @ 24 box, round caps/joins, stroke=currentColor — color flows
// from the `color` prop. No library icons on redesigned screens.
const GLYPHS: Record<string, string> = {
  home: `<path d="M4.5 11.2 C7 8.4 9.5 6.4 12 6.4 C14.5 6.4 17 8.4 19.5 11.2" /><path d="M6.2 10.4 L6.2 18.2 C6.2 18.9 6.7 19.4 7.4 19.4 L16.6 19.4 C17.3 19.4 17.8 18.9 17.8 18.2 L17.8 10.4" /><path d="M10.2 19.4 L10.2 15.6 C10.2 14.9 10.7 14.4 11.4 14.4 L12.6 14.4 C13.3 14.4 13.8 14.9 13.8 15.6 L13.8 19.4" /><path d="M12 6.4 C12 5.2 12.6 4.4 13.6 3.9" />`,
  birthplan: `<path d="M6.5 4.6 C9.8 4.2 13.6 4.3 17.4 4.6 C18 4.6 18.5 5.1 18.5 5.8 L18.5 19 C18.5 19.6 18 20.1 17.4 20.1 C13.8 20.4 9.9 20.4 6.5 20.1 C5.9 20.1 5.4 19.6 5.4 19 L5.4 5.8 C5.4 5.1 5.9 4.6 6.5 4.6 Z" /><path d="M8.8 9.2 C10.9 8.9 13.1 8.9 15.2 9.2" /><path d="M8.8 12.4 C10.4 12.2 12 12.2 13.5 12.4" /><path d="M8.8 15.6 C10 15.5 11 15.5 12 15.6" /><path d="M14.6 15.2 C15.4 14.4 16.2 14.3 16.6 14.9 C16.9 15.4 16.5 16 15.7 16.6" />`,
  timer: `<circle cx="12" cy="13.4" r="7.2" /><path d="M12 9.6 L12 13.4 L14.6 15.2" /><path d="M9.8 3.6 L14.2 3.6" /><path d="M12 3.6 L12 6.2" />`,
  team: `<path d="M9.2 11.4 C6.9 11.4 5.2 9.7 5.2 7.7 C5.2 5.8 6.9 4.3 9.2 4.3 C11.4 4.3 13.1 5.8 13.1 7.7 C13.1 9.7 11.4 11.4 9.2 11.4 Z" /><path d="M3.6 19.3 C3.9 15.9 6.1 13.9 9.2 13.9 C12.2 13.9 14.4 15.9 14.8 19.3" /><path d="M15.4 11 C17.2 10.7 18.7 9.5 18.7 7.9 C18.7 6.8 18 5.9 17 5.4" /><path d="M16.6 14.2 C18.6 14.6 19.9 16.4 20.2 19.3" />`,
  messages: `<path d="M4.4 8.2 C4.4 6.3 5.9 4.8 7.8 4.8 L16.2 4.8 C18.1 4.8 19.6 6.3 19.6 8.2 L19.6 13.4 C19.6 15.3 18.1 16.8 16.2 16.8 L10.6 16.8 L6.6 19.8 L6.9 16.7 C5.4 16.3 4.4 15 4.4 13.4 Z" /><path d="M8.4 9.4 C9.8 9.1 11.2 9.1 12.6 9.4" /><path d="M8.4 12.2 C9.4 12 10.4 12 11.4 12.2" />`,
  profile: `<circle cx="12" cy="8.6" r="4.2" /><path d="M5 19.6 C5.6 15.9 8.2 14 12 14 C15.8 14 18.4 15.9 19 19.6" /><path d="M12 19.6 C12.8 19.6 13.5 19.5 14.2 19.4" />`,
  about_me: `<circle cx="12" cy="8.4" r="3.9" /><path d="M5.4 19.6 C6 16 8.5 14.2 12 14.2 C15.5 14.2 18 16 18.6 19.6" /><path d="M9.9 8.2 C10.6 7.4 11.6 7 12.6 7.2" />`,
  labor_delivery: `<path d="M12 20 C8.4 16.4 5.6 13.2 5.6 9.8 C5.6 6.9 7.8 4.8 10.4 4.8 C11 4.8 11.6 5 12 5.3 C12.4 5 13 4.8 13.6 4.8 C16.2 4.8 18.4 6.9 18.4 9.8 C18.4 13.2 15.6 16.4 12 20 Z" /><path d="M12 5.3 L12 9.4" /><path d="M12 9.4 C13.8 9.4 15 10.4 15 12" />`,
  labor_support: `<path d="M8.4 19.2 L8.4 10.6 C8.4 9.9 8.9 9.4 9.6 9.4 L14.4 9.4 C15.1 9.4 15.6 9.9 15.6 10.6 L15.6 19.2" /><path d="M8.4 12.6 L5.9 14.3 C5.3 14.7 5.2 15.5 5.6 16.1 L7.6 18.6" /><path d="M15.6 12.6 L18.1 14.3 C18.7 14.7 18.8 15.5 18.4 16.1 L16.4 18.6" /><path d="M12 9.4 C12 7.6 12.8 6.4 14.2 5.6" />`,
  pain_management: `<path d="M12 4.6 C10 6.8 9 9 9 11.4 C9 14.4 10.3 16.4 12 16.4 C13.7 16.4 15 14.4 15 11.4 C15 9 14 6.8 12 4.6 Z" /><path d="M12 16.4 L12 19.4" /><path d="M9.6 18 C11.2 18.6 12.8 18.6 14.4 18" />`,
  monitoring_iv: `<path d="M7.6 4.6 L7.6 8.4 C7.6 10.4 8.9 11.8 10.8 12 L10.8 19.4" /><path d="M13.2 19.4 L13.2 12 C15.1 11.8 16.4 10.4 16.4 8.4 L16.4 4.6" /><path d="M6.4 4.6 L9.6 4.6" /><path d="M14.4 4.6 L17.6 4.6" /><path d="M10.8 15.6 L13.2 15.6" /><path d="M12 20.6 C12.8 20.6 13.4 20 13.4 19.4 C13.4 18.8 12.8 18.2 12 18.2 C11.2 18.2 10.6 18.8 10.6 19.4 C10.6 20 11.2 20.6 12 20.6 Z" />`,
  induction_interventions: `<path d="M9.4 4.6 L14.6 4.6 L14.6 9.2 C14.6 11 15.6 12.2 15.6 14.4 C15.6 17.4 14.1 19.4 12 19.4 C9.9 19.4 8.4 17.4 8.4 14.4 C8.4 12.2 9.4 11 9.4 9.2 Z" /><path d="M9.4 6.8 L14.6 6.8" /><path d="M12 19.4 L12 21" />`,
  pushing_safe_word: `<path d="M12 4.8 C7.6 4.8 4.4 7.3 4.4 10.4 C4.4 13 6.8 15 10.2 15.6 C9.4 17 8.3 18 6.8 18.8 C8.9 18.6 10.7 17.8 12.2 16.4 C16.5 15.9 19.6 13.4 19.6 10.4 C19.6 7.3 16.4 4.8 12 4.8 Z" /><path d="M10.2 8.5 C10.15 9.8 10.15 11.1 10.2 12.4" /><path d="M13.8 8.5 C13.85 9.8 13.85 11.1 13.8 12.4" />`,
  birth_preferences: `<rect x="5.4" y="4.6" width="13.2" height="15" rx="2.4" /><path d="M8.6 9.6 L10.8 11.8 L15.2 7.6" /><path d="M8.6 14.6 L15.4 14.6" /><path d="M8.6 16.8 L13 16.8" />`,
  post_delivery: `<path d="M9.7 7.1 C9.7 5.6 10.8 4.2 12.4 4.2 C14.1 4.2 15.4 5.6 15.4 7.3 C15.4 9.2 14 10.7 12.3 10.7 C10.7 10.7 9.7 9.4 9.7 8.2 Z" /><path d="M11.5 7.6 C12.1 8.2 12.9 8.3 13.5 7.9" /><path d="M4.6 13.2 C5.4 16.4 8.4 18.4 12.1 18.4 C15.8 18.4 18.7 16.5 19.4 13.4" /><path d="M4.6 13.2 C5.9 12.6 7.3 12.9 8.2 13.9" /><path d="M19.4 13.4 C18.1 12.7 16.7 13 15.9 14" />`,
  after_birth: `<path d="M6.2 10.6 C6.2 6.9 8.5 4.6 12 4.6" /><path d="M5.4 10.6 L18.6 10.6 C18.6 14.6 15.9 17.2 12 17.2 C8.1 17.2 5.4 14.6 5.4 10.6 Z" /><path d="M7.2 12.6 C10.4 13.8 13.6 13.8 16.8 12.6" /><path d="M7.4 17 C6.6 18.2 5.6 18.9 4.2 19.3" /><path d="M16.6 17 C17.4 18.2 18.4 18.9 19.8 19.3" />`,
  newborn_care: `<circle cx="12" cy="13.2" r="6.4" /><path d="M9.9 5.6 C10.6 4.5 11.3 4 12 4 C12.7 4 13.4 4.5 14.1 5.6" /><path d="M9.8 12.4 C10.6 13 11.4 13.3 12 13.3 C12.6 13.3 13.4 13 14.2 12.4" /><path d="M9.6 15.6 C11.2 16.4 12.8 16.4 14.4 15.6" />`,
  other_considerations: `<path d="M9 5.4 C11.4 5 13.9 5 16.9 5.4 C17.5 5.5 18 6 18 6.6 L18 18.2 C18 18.8 17.5 19.3 16.9 19.4 C13.9 19.8 11.4 19.8 9 19.4" /><path d="M9 5.4 C7.3 5.6 6.4 6.5 6.4 8 L6.4 16.9 C6.4 18.4 7.3 19.3 9 19.4" /><path d="M10.6 9.4 C12.4 9.2 14 9.2 15.6 9.4" /><path d="M10.6 12.4 C12 12.3 13.2 12.3 14.4 12.4" /><path d="M10.6 15.4 C11.6 15.3 12.4 15.3 13.4 15.4" />`,
  status_todo: `<circle cx="12" cy="12" r="7.6" />`,
  status_wip: `<path d="M12 4.4 C15.9 4.4 19.6 7.7 19.6 12 C19.6 16.3 15.9 19.6 12 19.6" /><path d="M12 9.6 L12 13.4 L14.6 15.2" />`,
  status_done: `<circle cx="12" cy="12" r="7.6" /><path d="M8.4 12.2 L10.8 14.6 L15.6 9.6" />`,
  autoshare: `<path d="M4.8 10.6 L4.8 17.2 C4.8 18 5.4 18.6 6.2 18.6 L17.8 18.6 C18.6 18.6 19.2 18 19.2 17.2 L19.2 10.6" /><path d="M4.8 10.6 L10.6 14.2 C11.5 14.8 12.5 14.8 13.4 14.2 L19.2 10.6" /><path d="M12 9.2 C12 6.4 13.4 4.6 16 4.2" /><path d="M13.8 6.2 L16 4.2 L18.2 5.9" />`,
  ta_history: `<path d="M7 4.5 L7 19.5"/><path d="M17 4.5 L17 19.5"/><path d="M4.5 8 L19.5 8"/><path d="M4.5 16 L19.5 16"/>`,
  ta_add: `<path d="M12 5 L12 19"/><path d="M5 12 L19 12"/>`,
  ta_share: `<path d="M14.5 9.5 L20 4 M15.5 4 L20 4 L20 8.5"/><path d="M20 13.2 C20 17 17 20 13.2 20 L10.8 20 C7 20 4 17 4 13.2 L4 10.8 C4 7 7 4 10.8 4"/>`,
  gear: `<circle cx="12" cy="12" r="3.1"/><path d="M12 2.6 L12 5 M12 19 L12 21.4 M4 12 L6.4 12 M17.6 12 L20 12 M6.3 6.3 L8 8 M16 16 L17.7 17.7 M17.7 6.3 L16 8 M8 16 L6.3 17.7"/>`,
  k_timeline: `<path d="M4.5 11.2 C7 8.4 9.5 6.4 12 6.4 C14.5 6.4 17 8.4 19.5 11.2"/><path d="M6.2 10.4 L6.2 18.2 C6.2 18.9 6.7 19.4 7.4 19.4 L16.6 19.4 C17.3 19.4 17.8 18.9 17.8 18.2 L17.8 10.4"/>`,
  ar_contract: `<path d="M6.5 4.6 C9.8 4.2 13.6 4.3 17.4 4.6 C18 4.6 18.5 5.1 18.5 5.8 L18.5 19 C18.5 19.6 18 20.1 17.4 20.1 C13.8 20.4 9.9 20.4 6.5 20.1 C5.9 20.1 5.4 19.6 5.4 19 L5.4 5.8 C5.4 5.1 5.9 4.6 6.5 4.6 Z"/><path d="M8.8 9.2 C10.9 8.9 13.1 8.9 15.2 9.2"/><path d="M8.8 12.4 C10.4 12.2 12 12.2 13.5 12.4"/>`,
  ar_invoice: `<path d="M6.8 4.4 C9.8 4.1 13.4 4.2 16.6 4.4 C17.4 4.4 17.9 5 17.9 5.7 L17.9 18.9 C17.9 19.6 17.4 20.1 16.7 20.2 C13.5 20.5 9.9 20.5 6.7 20.2 C6 20.1 5.5 19.6 5.5 18.9 L5.5 5.7 C5.5 5 6 4.4 6.8 4.4 Z"/><path d="M8.6 8.4 C11 8.1 13.3 8.1 15.6 8.4"/><path d="M8.6 11.6 C10.2 11.4 11.6 11.4 13.2 11.6"/><path d="M8.6 15 C10 14.8 11.2 14.8 12.6 15"/>`,
  ar_invoice_paid: `<circle cx="12" cy="12" r="7.6"/><path d="M8.8 12.2 C9.4 12.9 10 13.6 10.4 14.3 C11.6 12.4 13.2 10.6 14.8 9.2"/>`,
  bell: `<path d="M12 4.6 C10 6.8 9 9 9 11.4 C9 14.4 10.3 16.4 12 16.4 C13.7 16.4 15 14.4 15 11.4 C15 9 14 6.8 12 4.6 Z"/><path d="M12 16.4 L12 19.4"/><path d="M9.6 18 C11.2 18.6 12.8 18.6 14.4 18"/>`,
};

export type TIconName = keyof typeof GLYPHS;

export default function TIcon({
  name,
  size = 24,
  color = '#2A2A2A',
  strokeWidth,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const markup = GLYPHS[name] as string | undefined;
  if (!markup) return null;
  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth ?? 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {(markup.match(/<(circle|path|rect)[^>]*\/>/g) ?? []).map((el, i) => {
        const kind: 'circle' | 'rect' | 'path' = el.startsWith('<circle') ? 'circle' : el.startsWith('<rect') ? 'rect' : 'path';
        const attrs: Record<string, string | number> = {};
        for (const m of el.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
          const key = m[1] === 'stroke-width' ? 'strokeWidth' : m[1];
          attrs[key] = /^[0-9.]+$/.test(m[2]) ? Number(m[2]) : m[2];
        }
        if (kind === 'circle') return <Circle key={i} {...(attrs as React.ComponentProps<typeof Circle>)} />;
        if (kind === 'rect') return <Rect key={i} {...(attrs as React.ComponentProps<typeof Rect>)} />;
        return <Path key={i} {...(attrs as React.ComponentProps<typeof Path>)} />;
      })}
    </Svg>
  );
}
