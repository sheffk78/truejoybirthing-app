// Credential vocabulary gate (10/05) — deterministic coverage for what the
// Maestro flow proved visually plus what it couldn't reach (the detail modal):
// vocab-driven filter chips, CD tap -> refetch with credential=CD, custom
// chips (DONA/CAPPA) on the card, and "CODE — Full Name" in the detail modal.
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';

jest.mock('../app/(mom)/marketplace', () => {
  // load the REAL component through jest's module registry with all other
  // mocks applied — default export null was wiping the whole test target
  return jest.requireActual('../app/(mom)/marketplace');
});

import MarketplaceScreen from '../app/(mom)/marketplace';

// --- mocks -------------------------------------------------------------------
jest.mock('expo-router', () => {
  const RealReact = require('react');
  return { useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), useFocusEffect: (cb: any) => RealReact.useEffect(cb, []) };
});
jest.mock('../src/hooks/useThemedStyles', () => ({
  useColors: () => ({
    surface: 'SURFACE', border: 'BORDER', text: 'TEXT', textSecondary: 'TEXT2',
    textLight: 'LIGHT', primary: 'PRIMARY', background: 'BG', white: 'WHITE',
    rose: 'C_ROSE', roseBg: 'C_ROSEBG', roseBorder: 'C_ROSEBORDER',
    lavender: 'C_LAV', lavenderSoft: 'C_LAVSOFT', lavenderBorder: 'C_LAVBORDER',
    error: 'ERR', success: 'OK', textOnPrimary: 'WHITE',
  }),
  createThemedStyles: () => () => ({}),
}));
jest.mock('../src/constants/theme', () => ({
  SIZES: { lg: 16, md: 12, sm: 8, xs: 4, fontLg: 18, fontSm: 12, fontXs: 10, fontMd: 14, radiusMd: 12, radiusSm: 8, xxl: 32, padding: 16 },
  FONTS: { subheading: 's', body: 'b', bodyMedium: 'm', bodyBold: 'bb', uiBold: 'ub', uiSemi: 'us' },
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('../src/components/Icon', () => {
  const RealReact = require('react');
  const { Text } = require('react-native');
  return { Icon: (p: any) => RealReact.createElement(Text, null, `[${p.name}]`) };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
}));
jest.mock('../src/utils/api', () => ({
  __esModule: true,
  SessionExpiredError: class SessionExpiredError extends Error {},
  apiRequest: jest.fn(),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true] }));
jest.mock('@expo-google-fonts/cormorant-garamond', () => ({ CormorantGaramond_600Bold: 'x' }));
jest.mock('@expo-google-fonts/quicksand', () => ({ Quicksand_400Regular: 'x', Quicksand_600SemiBold: 'x', Quicksand_700Bold: 'x' }));
jest.mock('@expo-google-fonts/source-sans-3', () => ({ SourceSans3_400Regular: 'x', SourceSans3_600SemiBold: 'x' }));

import { apiRequest } from '../src/utils/api';
const mockApi = apiRequest as jest.Mock;

const SARAH = {
  provider_type: 'DOULA',
  user: { user_id: 'u-sarah', full_name: 'Sarah Mitchell', role: 'DOULA', picture: null },
  profile: {
    practice_name: 'Heart & Hands Birth Support', location_city: 'Austin',
    location_state: 'TX', years_in_practice: 8, accepting_new_clients: true,
    credentials: 'CD,CLC,DONA,CAPPA', services_offered: ['Birth Doula'],
  },
  credential_chips: {
    codes: ['CD', 'CLC'], custom: ['DONA', 'CAPPA'],
    labels: [{ code: 'CD', name: 'Certified Doula' }, { code: 'CLC', name: 'Certified Lactation Counselor' }, { code: 'DONA', name: 'DONA' }, { code: 'CAPPA', name: 'CAPPA' }],
  },
};
const EMILY = {
  provider_type: 'MIDWIFE',
  user: { user_id: 'u-emily', full_name: 'Emily Thompson', role: 'MIDWIFE', picture: null },
  profile: { practice_name: 'Hill Country Midwifery', location_city: 'Austin', location_state: 'TX', credentials: 'CNM,IBCLC', accepting_new_clients: true },
  credential_chips: { codes: ['CNM', 'IBCLC'], custom: [], labels: [] },
};

// RN Modal + SafeAreaView render fine in RNTL; ScrollView needs layout but
// renders children in test env.

const providersResp = (providers: any[]) => {
  const d = providers.filter(p => p.provider_type === 'DOULA');
  const m = providers.filter(p => p.provider_type === 'MIDWIFE');
  const l = providers.filter(p => p.provider_type === 'LACTATION');
  return { doulas: d, midwives: m, lactation: l };
};


// safe text extraction — toJSON trees contain circular style references
const treeText = (node: any): string => {
  const parts: string[] = [];
  const seen = new Set<any>();
  const walk = (n: any) => {
    if (n === null || n === undefined || typeof n !== 'object') {
      if (typeof n === 'string') parts.push(n);
      return;
    }
    if (seen.has(n)) return;
    seen.add(n);
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n.text === 'string') parts.push(n.text);
    const kids = n.children;
    if (Array.isArray(kids)) kids.forEach(walk);
    else if (typeof kids === 'string') parts.push(kids);
  };
  walk(node);
  return parts.join('|');
};

// --- tests -------------------------------------------------------------------
describe('marketplace credential vocabulary (10/05)', () => {
  beforeEach(() => {
    mockApi.mockReset();
    // default: providers endpoint returns Sarah + Emily; credentials vocab returns 8 filters
    mockApi.mockImplementation((url: string) => {
      if (String(url).includes('/marketplace/credentials')) {
        return Promise.resolve({
          filters: ['CD', 'CLC', 'IBCLC', 'CBE', 'CPM', 'CNM', 'LM', 'DEM'].map(code => ({ code, name: code })),
          all: [],
        });
      }
      if (String(url).includes('/marketplace/providers')) return Promise.resolve(providersResp([SARAH, EMILY]));
      if (String(url).includes('/api/timeline') || String(url).includes('timeline')) return Promise.resolve({ current_week: 29 });
      if (String(url).includes('share-requests')) return Promise.resolve({ requests: [] });
      if (String(url).includes('consultation')) return Promise.resolve([]);
      return Promise.resolve({});
    });
  });

  test('T1 vocabulary drives the filter chip row (8 chips from API, incl LM/DEM)', async () => {
    const tree: any = await render(<MarketplaceScreen />);
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    const t = tree.toJSON();
    const text = treeText(t);
    expect(t).toBeTruthy();
    for (const code of ['CD', 'CLC', 'IBCLC', 'CBE', 'CPM', 'CNM', 'LM', 'DEM']) {
      expect(text).toContain(`|${code}|`);
    }
    // and the fetch for the vocabulary happened
    expect(mockApi).toHaveBeenCalledWith('/marketplace/credentials');
  });

  test('T2 tapping CD refetches providers with credential=CD', async () => {
    const tree: any = await render(<MarketplaceScreen />);
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    // v14 query API on the render object; try testID first, fall back to
    // getByText (data-testid may not map to testID in this RN version)
    // R1#8: CD legitimately renders twice (filter chip + Sarah card tag) —
    // queryAllByText, press [0] (filter row renders before result cards)
    const chips = tree.queryAllByText('CD', { exact: true });
    expect(chips.length).toBeGreaterThanOrEqual(1);
    await act(async () => { fireEvent.press(chips[0]); });
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    const credCalls = mockApi.mock.calls.filter((c: any[]) => String(c[0]).includes('credential=CD'));
    expect(credCalls.length).toBeGreaterThan(0);
  });

  test('T3 Sarah card shows canonical + custom chips (DONA, CAPPA visible)', async () => {
    const tree: any = await render(<MarketplaceScreen />);
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    const text = treeText(tree.toJSON());
    // custom chips render verbatim on the card
    expect(text).toContain('|DONA|');
    expect(text).toContain('|CAPPA|');
    expect(text).toContain('|CD|');
  });

  test('T4 detail modal lists CODE — Full Name for known, verbatim for custom', async () => {
    const tree: any = await render(<MarketplaceScreen />);
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    // real testID (R1#8: host tree drops fn props; data-testid ≠ testID);
    // two cards render → getAllByTestId, press the first
    const vp = tree.getAllByTestId('view-profile-btn')[0];
    expect(vp).toBeTruthy();
    await act(async () => { fireEvent.press(vp); });
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    const text = treeText(tree.toJSON());
    expect(text).toContain('Credentials');
    expect(text).toContain('CD — Certified Doula');
    expect(text).toContain('DONA'); // custom stays verbatim
  });
});