// designRefreshDark.ts — Phase 2B dark corpus: the mechanical reversal of the
// approved light palette (designRefresh.ts, rev 3, Jeff-approved 2026-09-17).
//
// Jeff directive 2026-09-23 (`1552320524082741309`): "look at what the design
// is now and set up a structure for when it's this color in this situation it
// reverses to this darker version … shouldn't require major design changes."
// Law: same hues, same roles, same layouts — only luminance flips. Every dark
// hex is derived from its light counterpart by the reversal rules logged in
// JOB-LEDGER 2026-09-23b (WCAG-checked; see PHASE2-DARK-REVERSAL-MAP.md).
//
// Dual-role splits (from the 2026-09-23 role audit):
// - lavender (light #6E6C99) is pill BACKGROUND with white text AND stat-numeral
//   TEXT. Pill bg keeps the midtone (white-on-#6E6C99 = 4.92:1 in both modes);
//   text usage moves to lavenderText (#9796B9 dark, identical to lavender in light).
// - white is card BACKGROUND (107 sites) and on-accent TEXT (23 sites). Card bg
//   moves to surface (light #FFFFFF, dark #2A2330); on-accent text stays #FFFFFF
//   in both modes (4.92:1 on the kept midtone pills).

import type { ThemeName } from '../store/themeStore';
import { C as LIGHT, F, VEIL_STOPS as LIGHT_VEIL_STOPS } from './designRefresh';

// ---- Dark palette: same 23 tokens, same order, reversal values ----
export const C = {
  cream: '#1A1520', // canvas — plum-black reversal of #FAF8F5 (existing dark anchor)
  ink: '#F5F3F6', // headings — lavender-tinted near-white (16.2:1 on canvas)
  body: '#B6B1B9', // tip body — solves to light body's exact 8.51:1
  gray: '#9E97A4', // meta / secondary — light gray-on-card's 5.34:1
  grayLight: '#7F7388', // stat labels, read-source — light's 3.41:1
  rose: '#AE7698', // kickers / warn / overline — 5.0:1 (light 4.49:1)
  roseSoft: '#C09BB6', // H1 accent word, week chips
  roseBorder: '#BD7FA5', // affirmation left border, unread dot
  roseBg: '#372031', // rose icon chip, warn chip bg — dark chip, rose hue kept
  lavender: '#6E6C99', // pill/tab BACKGROUND (kept midtone both modes; white text 4.92:1)
  lavenderText: '#9796B9', // stat numerals / text-on-canvas (NEW split token)
  lavenderSoft: '#8E8CB5', // progress fill, yes-button (kept midtone)
  lavenderBorder: '#434059', // ghost pill border — dark, lavender hue kept
  lavenderBg: '#222235', // icon chip bg — dark chip, lavender hue kept
  sage: '#728F60', // sage kicker — 4.96:1 (light 4.98:1)
  sageBg: '#293522', // sage icon chip, done chip bg — dark chip, sage hue kept
  border: '#473943', // card border — rose-hued dark border
  hairline: '#3C3540', // strip / tab-bar hairline
  cardBg: '#2A2330', // ghost pill bg = raised surface (existing dark anchor)
  halo: '#2F2C3A', // S11 halo rings stroke
  gbandMid: '#221B20', // S11 gband gradient midpoint
  chev: '#756273', // row chevron — 3.2:1 (light 3.4:1 as icon)
  track: '#3C3541', // progress track
  white: '#FFFFFF', // on-accent TEXT only in dark (see surface for card bg)
} as const;

// ---- New role tokens (light values identical to approved corpus) ----
export const ROLES = {
  surface: LIGHT.white, // card/row background (light: white, dark: #2A2330)
} as const;

// ---- Fonts are theme-invariant (Cormorant/Quicksand in both modes) ----
export { F } from './designRefresh';

// ---- Veil: photo-band fade into the DARK canvas (mirrors common.css .veil) ----
export const VEIL_STOPS = [
  { position: 0, color: 'rgba(26,21,32,0.15)' },
  { position: 0.45, color: 'rgba(26,21,32,0)' },
  { position: 0.92, color: 'rgba(26,21,32,0.78)' },
  { position: 1, color: '#1A1520' },
] as const;

// ---- Helpers shared verbatim from the light corpus (theme-invariant logic) ----
export {
  BAND_HOME, BAND_TIPS, BAND_APPOINTMENTS, BAND_MY_TEAM, BAND_MESSAGES,
  HALO_RADII, HALO_STROKES,
  initialsOf, firstNameOf, trimesterOf, kickerStyle, srowBase,
} from './designRefresh';

// srowBase is color-bearing (white bg, #EFE0EB border) — dark needs its own:
export const srowBaseDark = {
  backgroundColor: C.cardBg,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 18,
  paddingVertical: 12,
  paddingHorizontal: 14,
  flexDirection: 'row',
  alignItems: 'center',
} as const;

export type DarkCorpus = typeof C;

// Type guard: the dark corpus must keep the exact token contract of the light
// corpus (plus the split tokens). A missing/renamed token is a compile error.
const _contract: Record<keyof typeof LIGHT, string> = C;
void _contract;