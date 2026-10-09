/**
 * t-component.test.tsx — P2 law lock (JOB-2026-10-09i).
 *
 * Pins T.tsx presets to the law table (TYPE-SYSTEM.md app column). These are
 * the values every heading/body in the app will inherit after the P2 codemod —
 * a quiet change here changes every screen.
 *
 * NOTE: @testing-library/react-native v14 = render() is ASYNC; trees are read
 * via toJSON() (same pattern as feed-reliability.test.tsx).
 */
import React from 'react';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { T, TYPE_SCALE, NUMERAL_SIZES, numeralStyle } from '../src/components/T';
import { FONTS, SIZES } from '../src/constants/tokens';

import { render } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve(undefined)),
  removeItem: jest.fn(() => Promise.resolve(undefined)),
  multiRemove: jest.fn(() => Promise.resolve(undefined)),
}));

const renderT = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

type RnNode = { type: string; props?: Record<string, unknown>; children?: unknown[] };

/** Flatten all style objects on a rendered node (props.style may be array/nested). */
function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

/** Find first Text node whose text equals `text`, walking the RNTL tree. */
function findTextNode(node: RnNode, text: string): RnNode | null {
  if (node.type === 'Text' && typeof node.props?.text !== 'string') {
    const kids = node.children ?? [];
    if (kids.length === 1 && kids[0] === text) return node;
  }
  for (const child of node.children ?? []) {
    if (child && typeof child === 'object') {
      const hit = findTextNode(child as RnNode, text);
      if (hit) return hit;
    }
  }
  return null;
}

describe('T.tsx type law', () => {
  test('TYPE_SCALE presets match TYPE-SYSTEM.md app column exactly', () => {
    expect(TYPE_SCALE.h1).toMatchObject({ fontSize: 26, lineHeight: 30, fontFamily: FONTS.heading });
    expect(TYPE_SCALE.h2).toMatchObject({ fontSize: 21, lineHeight: 25, fontFamily: FONTS.heading });
    expect(TYPE_SCALE.h3).toMatchObject({ fontSize: 17, lineHeight: Math.round(17 * 1.25), fontFamily: FONTS.subheading });
    expect(TYPE_SCALE.body).toMatchObject({ fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.body });
    expect(TYPE_SCALE.caption).toMatchObject({ fontSize: SIZES.fontXs, lineHeight: 16, fontFamily: FONTS.body });
    expect(TYPE_SCALE.kicker).toMatchObject({ fontSize: 10, letterSpacing: 2.2 });
  });

  test('lawful numeral set is exactly the ratified serif-numeral sizes', () => {
    expect([...NUMERAL_SIZES].sort((a, b) => a - b)).toEqual([19, 21, 22, 23, 26, 52, 74]);
  });

  test('numeral law check throws on off-scale sizes, passes every lawful size', () => {
    expect(() => numeralStyle(20)).toThrow(/lawful numeral/i);
    expect(() => numeralStyle(13.5)).toThrow(/lawful numeral/i);
    for (const s of NUMERAL_SIZES) {
      expect(numeralStyle(s)).toMatchObject({ fontSize: s, fontFamily: FONTS.heading });
    }
  });

  test('numeral lineHeight law chord = size * 1.1 rounded', () => {
    expect(numeralStyle(19).lineHeight).toBe(21);
    expect(numeralStyle(26).lineHeight).toBe(29);
  });

  test('renders with law values + theme ink through a real ThemeProvider', async () => {
    const rs = await renderT(<T preset="kicker">your birth team</T>);
    const tree = rs.toJSON() as unknown as RnNode;
    const node = findTextNode({ type: 'root', props: {}, children: [tree] }, 'your birth team');
    expect(node).toBeTruthy();
    const merged = flattenStyle(node!.props?.style);
    expect(merged.fontSize).toBe(10);
    expect(merged.letterSpacing).toBe(2.2);
    expect(merged.textTransform).toBe('uppercase'); // applied by T at resolve time
    rs.unmount();
  });
});