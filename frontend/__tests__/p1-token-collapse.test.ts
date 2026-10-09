/**
 * p1-token-collapse.test.ts — P1 regression lock (JOB-2026-10-09h).
 *
 * Pins the collapsed token system to the values that shipped before the
 * collapse: if anyone changes a rendered color by accident, this fails BEFORE
 * a screen changes appearance. The intentional-value-change path is the
 * corpus law file + Jeff's eyeball pass (P1b list in corpus.ts) — never a
 * quiet edit here.
 */
// corpus.ts hosts the useCorpus hooks, whose import chain reaches
// ThemeContext -> themeStore (zustand + AsyncStorage). Mock the native module
// for the token tests — values under test are pure constants.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve(undefined)),
  removeItem: jest.fn(() => Promise.resolve(undefined)),
  multiRemove: jest.fn(() => Promise.resolve(undefined)),
}));

import { COLORS, FONTS, SIZES, BRAND } from '../src/constants/theme';
import { SEM_LIGHT, SEM_DARK, FONTS as CF, SIZES as CS, BRAND as CB } from '../src/constants/corpus';
import { getTheme, LIGHT_THEME, DARK_THEME } from '../src/constants/themeTokens';

// The flat palette as theme.ts shipped it on 2026-10-09 before the collapse
// (read verbatim from git history at 5fd4fc3c..d80ae294).
const SHIPPED_COLORS = {
  primary: '#6E6C99', primaryLight: '#D5D3E8', primaryDark: '#5B5982',
  secondary: '#B87AA0', secondaryLight: '#E6BBD8', secondaryDark: '#9A5E84',
  accent: '#A8B5A0', accentLight: '#E8EDE5', accentDark: '#7F8E76',
  white: '#FFFFFF', background: '#FAF8F5', surface: '#FDFCFA', subtle: '#F5F3EF',
  border: '#E6E4F4',
  textPrimary: '#2A2A2A', textSecondary: '#6A6B6C', textLight: '#9A9B9C',
  textOnPrimary: '#FFFFFF',
  success: '#A8B5A0', warning: '#E6C685', error: '#D48A8A', info: '#8E8CB5',
  moodVeryLow: '#D48A8A', moodLow: '#E6C685', moodNeutral: '#B0A6B4',
  moodGood: '#A8B5A0', moodGreat: '#8E8CB5',
  roleMom: '#B87AA0', roleDoula: '#8E8CB5', roleMidwife: '#A8B5A0',
  roleLactation: '#6BAFA0', roleAdmin: '#6A6B6C',
};

const SHIPPED_FONTS = {
  heading: 'CormorantGaramond_700Bold',
  subheading: 'CormorantGaramond_600SemiBold',
  headingItalic: 'CormorantGaramond_600SemiBold_Italic',
  body: 'Quicksand_500Medium',
  bodyMedium: 'Quicksand_500Medium',
  bodyItalic: 'Quicksand_400Regular',
  bodyBold: 'Quicksand_700Bold',
  regular: 'Quicksand_400Regular',
  medium: 'Quicksand_500Medium',
  semiBold: 'Quicksand_600SemiBold',
  bold: 'Quicksand_700Bold',
};

const SHIPPED_SIZES = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
  radiusXs: 4, radiusSm: 8, radiusMd: 12, radiusLg: 16, radiusXl: 24, radiusFull: 9999,
  fontXs: 11, fontSm: 13.5, fontMd: 13.5, fontLg: 17, fontXl: 21, fontXxl: 26,
  fontTitle: 26, fontHero: 34, touchMin: 44,
};

describe('P1 token collapse — zero rendered-value change', () => {
  test('theme.ts shim COLORS matches the pre-collapse shipped palette exactly', () => {
    expect(Object.keys(COLORS).sort()).toEqual(Object.keys(SHIPPED_COLORS).sort());
    for (const [k, v] of Object.entries(SHIPPED_COLORS)) {
      expect({ key: k, shipped: v, now: (COLORS as Record<string, string>)[k] }).toEqual({
        key: k, shipped: v, now: v,
      });
    }
  });

  test('theme.ts shim FONTS/SIZES match pre-collapse values exactly', () => {
    expect(FONTS).toEqual(SHIPPED_FONTS);
    expect(SIZES).toEqual(SHIPPED_SIZES);
    expect(BRAND.name).toBe('True Joy Birthing');
    expect(BRAND.logoPng).toBeDefined();
    expect(BRAND.logoIconPng).toBeDefined();
  });

  test('corpus re-exports are the same objects the shim serves', () => {
    expect(CF).toBe(FONTS);
    expect(CS).toBe(SIZES);
    expect(CB).toBe(BRAND);
    expect(SEM_LIGHT.background.primary).toBe(SHIPPED_COLORS.background);
    expect(SEM_LIGHT.accent.primaryDark).toBe(SHIPPED_COLORS.primary);
    expect(SEM_LIGHT.role.lactation).toBe(SHIPPED_COLORS.roleLactation);
  });

  test('getTheme serves the semantic maps (light + dark)', () => {
    expect(LIGHT_THEME.colors.background.primary).toBe('#FAF8F5');
    expect(DARK_THEME.colors.background.primary).toBe('#1A1520');
    expect(getTheme('DARK')).toBe(DARK_THEME);
    expect(getTheme('LIGHT')).toBe(LIGHT_THEME);
    expect(getTheme('DARK').colors.status.error).toBe('#AE7698'); // law D.rose
  });

  test('dark maps: every member is a law dark-corpus value except declared LEGACY entries', () => {
    // Declared exceptions (P1b eyeball list in corpus.ts)
    const legacyDark = new Set(['#7BC9B8']);
    const lawDark = new Set([
      '#1A1520', '#F5F3F6', '#B6B1B9', '#9E97A4', '#7F7388', '#AE7698',
      '#C09BB6', '#BD7FA5', '#372031', '#6E6C99', '#9796B9', '#8E8CB5',
      '#434059', '#222235', '#728F60', '#293522', '#473943', '#3C3540',
      '#2A2330', '#2F2C3A', '#756273', '#221B20', '#FFFFFF', '#000000',
    ]);
    const walk = (v: unknown): string[] =>
      typeof v === 'string' ? [v] : Array.isArray(v) ? [] : typeof v === 'object' && v !== null ? Object.values(v).flatMap(walk) : [];
    const values = walk(SEM_DARK).filter((v) => v.startsWith('#'));
    for (const v of values) {
      expect(legacyDark.has(v) || lawDark.has(v)).toBe(true);
    }
  });
});