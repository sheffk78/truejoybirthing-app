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
  home: `<pathd="M4.511.2C78.49.56.4126.4C14.56.4178.419.511.2"/><pathd="M6.210.4L6.218.2C6.218.96.719.47.419.4L16.619.4C17.319.417.818.917.818.2L17.810.4"/><pathd="M10.219.4L10.215.6C10.214.910.714.411.414.4L12.614.4C13.314.413.814.913.815.6L13.819.4"/><pathd="M126.4C125.212.64.413.63.9"/>`,
  birthplan: `<pathd="M6.54.6C9.84.213.64.317.44.6C184.618.55.118.55.8L18.519C18.519.61820.117.420.1C13.820.49.920.46.520.1C5.920.15.419.65.419L5.45.8C5.45.15.94.66.54.6Z"/><pathd="M8.89.2C10.98.913.18.915.29.2"/><pathd="M8.812.4C10.412.21212.213.512.4"/><pathd="M8.815.6C1015.51115.51215.6"/><pathd="M14.615.2C15.414.416.214.316.614.9C16.915.416.51615.716.6"/>`,
  timer: `<circlecx="12"cy="13.4"r="7.2"/><pathd="M129.6L1213.4L14.615.2"/><pathd="M9.83.6L14.23.6"/><pathd="M123.6L126.2"/>`,
  team: `<pathd="M9.211.4C6.911.45.29.75.27.7C5.25.86.94.39.24.3C11.44.313.15.813.17.7C13.19.711.411.49.211.4Z"/><pathd="M3.619.3C3.915.96.113.99.213.9C12.213.914.415.914.819.3"/><pathd="M15.411C17.210.718.79.518.77.9C18.76.8185.9175.4"/><pathd="M16.614.2C18.614.619.916.420.219.3"/>`,
  messages: `<pathd="M4.48.2C4.46.35.94.87.84.8L16.24.8C18.14.819.66.319.68.2L19.613.4C19.615.318.116.816.216.8L10.616.8L6.619.8L6.916.7C5.416.34.4154.413.4Z"/><pathd="M8.49.4C9.89.111.29.112.69.4"/><pathd="M8.412.2C9.41210.41211.412.2"/>`,
  profile: `<circlecx="12"cy="8.6"r="4.2"/><pathd="M519.6C5.615.98.2141214C15.81418.415.91919.6"/><pathd="M1219.6C12.819.613.519.514.219.4"/>`,
  about_me: `<circlecx="12"cy="8.4"r="3.9"/><pathd="M5.419.6C6168.514.21214.2C15.514.2181618.619.6"/><pathd="M9.98.2C10.67.411.6712.67.2"/>`,
  labor_delivery: `<pathd="M1220C8.416.45.613.25.69.8C5.66.97.84.810.44.8C114.811.65125.3C12.45134.813.64.8C16.24.818.46.918.49.8C18.413.215.616.41220Z"/><pathd="M125.3L129.4"/><pathd="M129.4C13.89.41510.41512"/>`,
  labor_support: `<pathd="M8.419.2L8.410.6C8.49.98.99.49.69.4L14.49.4C15.19.415.69.915.610.6L15.619.2"/><pathd="M8.412.6L5.914.3C5.314.75.215.55.616.1L7.618.6"/><pathd="M15.612.6L18.114.3C18.714.718.815.518.416.1L16.418.6"/><pathd="M129.4C127.612.86.414.25.6"/>`,
  pain_management: `<pathd="M124.6C106.899911.4C914.410.316.41216.4C13.716.41514.41511.4C159146.8124.6Z"/><pathd="M1216.4L1219.4"/><pathd="M9.618C11.218.612.818.614.418"/>`,
  monitoring_iv: `<pathd="M7.64.6L7.68.4C7.610.48.911.810.812L10.819.4"/><pathd="M13.219.4L13.212C15.111.816.410.416.48.4L16.44.6"/><pathd="M6.44.6L9.64.6"/><pathd="M14.44.6L17.64.6"/><pathd="M10.815.6L13.215.6"/><pathd="M1220.6C12.820.613.42013.419.4C13.418.812.818.21218.2C11.218.210.618.810.619.4C10.62011.220.61220.6Z"/>`,
  induction_interventions: `<pathd="M9.44.6L14.64.6L14.69.2C14.61115.612.215.614.4C15.617.414.119.41219.4C9.919.48.417.48.414.4C8.412.29.4119.49.2Z"/><pathd="M9.46.8L14.66.8"/><pathd="M1219.4L1221"/>`,
  pushing_safe_word: `<pathd="M124.8C7.64.84.47.34.410.4C4.4136.81510.215.6C9.4178.3186.818.8C8.918.610.717.812.216.4C16.515.919.613.419.610.4C19.67.316.44.8124.8Z"/><pathd="M10.28.5C10.159.810.1511.110.212.4"/><pathd="M13.88.5C13.859.813.8511.113.812.4"/>`,
  birth_preferences: `<rectx="5.4"y="4.6"width="13.2"height="15"rx="2.4"/><pathd="M8.69.6L10.811.8L15.27.6"/><pathd="M8.614.6L15.414.6"/><pathd="M8.616.8L1316.8"/>`,
  post_delivery: `<pathd="M9.77.1C9.75.610.84.212.44.2C14.14.215.45.615.47.3C15.49.21410.712.310.7C10.710.79.79.49.78.2Z"/><pathd="M11.57.6C12.18.212.98.313.57.9"/><pathd="M4.613.2C5.416.48.418.412.118.4C15.818.418.716.519.413.4"/><pathd="M4.613.2C5.912.67.312.98.213.9"/><pathd="M19.413.4C18.112.716.71315.914"/>`,
  after_birth: `<pathd="M6.210.6C6.26.98.54.6124.6"/><pathd="M5.410.6L18.610.6C18.614.615.917.21217.2C8.117.25.414.65.410.6Z"/><pathd="M7.212.6C10.413.813.613.816.812.6"/><pathd="M7.417C6.618.25.618.94.219.3"/><pathd="M16.617C17.418.218.418.919.819.3"/>`,
  newborn_care: `<circlecx="12"cy="13.2"r="6.4"/><pathd="M9.95.6C10.64.511.34124C12.7413.44.514.15.6"/><pathd="M9.812.4C10.61311.413.31213.3C12.613.313.41314.212.4"/><pathd="M9.615.6C11.216.412.816.414.415.6"/>`,
  other_considerations: `<pathd="M95.4C11.4513.9516.95.4C17.55.5186186.6L1818.2C1818.817.519.316.919.4C13.919.811.419.8919.4"/><pathd="M95.4C7.35.66.46.56.48L6.416.9C6.418.47.319.3919.4"/><pathd="M10.69.4C12.49.2149.215.69.4"/><pathd="M10.612.4C1212.313.212.314.412.4"/><pathd="M10.615.4C11.615.312.415.313.415.4"/>`,
  status_todo: `<circlecx="12"cy="12"r="7.6"/>`,
  status_wip: `<pathd="M124.4C15.94.419.67.719.612C19.616.315.919.61219.6"/><pathd="M129.6L1213.4L14.615.2"/>`,
  status_done: `<circlecx="12"cy="12"r="7.6"/><pathd="M8.412.2L10.814.6L15.69.6"/>`,
  autoshare: `<pathd="M4.810.6L4.817.2C4.8185.418.66.218.6L17.818.6C18.618.619.21819.217.2L19.210.6"/><pathd="M4.810.6L10.614.2C11.514.812.514.813.414.2L19.210.6"/><pathd="M129.2C126.413.44.6164.2"/><pathd="M13.86.2L164.2L18.25.9"/>`,
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
