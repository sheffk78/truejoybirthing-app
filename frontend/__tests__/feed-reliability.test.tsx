// Render gate for the Pro Feed reliability fix (10/02).
// Runs the ProviderFeedSection/MomFeedSection visibility matrix against the
// ACTUAL live payload shape (10/02 prod response: one provider article,
// tjb_blog_url: null). Uses @testing-library/react-native v14: render() is
// async and the tree is read via toJSON() (v14 dropped the react-test-renderer
// instance helpers like root.findAllByType).
import React from 'react';
import { render, act } from '@testing-library/react-native';

import ProviderFeedSection from '../src/components/provider/ProviderFeedSection';
import MomFeedSection from '../src/components/provider/MomFeedSection';

// --- mocks -----------------------------------------------------------------
// Minimal structural mocks — loose param types are intentional (jest.mock factories)
jest.mock('../src/components/Icon', () => {
  const RealReact = require('react');
  const { Text } = require('react-native');
  return { Icon: (p: any) => RealReact.createElement(Text, { testID: 'icon' }, p.name) };
});
jest.mock('../src/components/provider/ProviderFeedCard', () => {
  const RealReact = require('react');
  const { Text } = require('react-native');
  return (p: any) => RealReact.createElement(Text, { testID: 'feed-card' }, p.article.title);
});
jest.mock('../src/components/provider/ProviderFeedDisclaimer', () => {
  const RealReact = require('react');
  const { Text } = require('react-native');
  return (props: any) => RealReact.createElement(Text, { testID: 'feed-disclaimer' }, String(props.visible));
});
jest.mock('../src/hooks/useThemedStyles', () => ({
  useColors: () => ({ surface: 'SURFACE', border: 'BORDER', text: 'TEXT', textSecondary: 'TEXT2', textLight: 'LIGHT', primary: 'PRIMARY' }),
}));
jest.mock('../src/constants/theme', () => ({
  SIZES: { lg: 16, md: 12, sm: 8, xs: 4, fontLg: 18, fontSm: 12, fontXs: 10, fontMd: 14, radiusMd: 12, radiusSm: 8, xxl: 32 },
  FONTS: { subheading: 's', body: 'b', bodyMedium: 'm', bodyBold: 'bb' },
}));
jest.mock('../src/constants/api', () => ({ API_ENDPOINTS: { FEED_ARTICLES: '/feed/articles' } }));
jest.mock('@react-native-async-storage/async-storage', () => {
  let cache: string | null = null;
  return {
    __esModule: true,
    default: {
      getItem: async () => cache,
      setItem: async (_k: string, v: string) => { cache = v; },
      removeItem: async () => { cache = null; },
    },
  };
});
jest.mock('../src/utils/api', () => ({
  __esModule: true,
  SessionExpiredError: class SessionExpiredError extends Error {},
  // components import the NAMED apiRequest
  apiRequest: async () => mockFetchImpl(),
  default: async () => mockFetchImpl(),
}));
jest.mock('expo-router', () => {
  const RealReact = require('react');
  return { useFocusEffect: (cb: () => void) => RealReact.useEffect(cb, []) };
});

// Controlled API state per scenario (mock* prefix: jest permits factory refs)
let mockFetchImpl: () => Promise<any> = async () => ({ articles: [] });
const setApi = (impl: () => Promise<any>) => { mockFetchImpl = impl; };

// Reset the shared AsyncStorage mock between scenarios — a prior test's
// successful fetch (T4) caches the article, and with cached content the
// error-state row correctly never shows (T5 assumes a cold cache).
beforeEach(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem('@mom_feed_cache');
  await AsyncStorage.removeItem('@research_feed_cache');
});

// The 10/02 production payload (shape + values verified 16:43Z)
const LIVE_TITLE = 'Effect of Hot Pads Applied to the Breast During Episiotomy Repair on the Amount of Milk, Breastfeeding Motivation, and Perception of Insufficient Milk: A Randomized Controlled Study.';
const LIVE_PAYLOAD = {
  articles: [{
    article_id: '42e861aa-538b-4d1d-b7a0-8a538c5a4f4a',
    approved_date: '2026-10-02T15:00:18.338000',
    audience: 'provider', batch_id: 'weekly_cron_20261002',
    excerpt: 'A randomized controlled trial found that applying hot pads to the breasts during episiotomy repair positively influenced the amount of breast milk, breastfeeding motivation, and reduced the perception of insufficient milk among postpartum women. This non-pharmacological intervention leverages the let-down reflex through warmth during a stressful perineal repair procedure.',
    practice_takeaway: 'Lactation consultants and doulas should recommend the use of warm compresses or hot pads on the breasts during perineal repair procedures to help facilitate early milk production and support breastfeeding motivation in the immediate postpartum period.',
    fetched_at: '2026-10-01T16:12:44.218000', processed_at: '2026-10-02T15:00:18.338000',
    published_date: '2026-10-01T16:12:38.963000', quality_score: 75,
    source_id: 'pubmed-birth', source_name: 'PubMed Birth/Midwifery Research',
    source_url: 'https://pubmed.ncbi.nlm.nih.gov/42806898/',
    source_url_hash: '91138ad96bfdaf4111e83a35d1709ddcb75ee621986f4302a6c642fb5ebb4595',
    status: 'published',
    tags: ['lactation', 'breastfeeding', 'evidence-based', 'postpartum', 'newborn-care'],
    title: LIVE_TITLE,
    tjb_blog_slug: null, tjb_blog_status: null, tjb_blog_title: null, tjb_blog_url: null,
    view_count: 0,
  }],
  pagination: { page: 1, limit: 1, total: 73, total_pages: 73, has_next: true },
};

// RNTL v14: tree access via toJSON() — collect text strings + testID counts
const walkJson = (node: any, visit: (n: any) => void) => {
  if (node === null || node === undefined || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n: any) => walkJson(n, visit)); return; }
  visit(node);
  if (Array.isArray(node.children)) node.children.forEach((c: any) => walkJson(c, visit));
};
const textsOf = (tree: any) => {
  const out: string[] = [];
  walkJson(tree.toJSON(), (n: any) => {
    if (Array.isArray(n.children)) {
      n.children.forEach((c: any) => { if (typeof c === 'string') out.push(c); });
    } else if (typeof n.children === 'string') {
      out.push(n.children);
    }
  });
  return out;
};
const cardCount = (tree: any) => {
  let count = 0;
  walkJson(tree.toJSON(), (n: any) => { if (n.props && n.props.testID === 'feed-card') count += 1; });
  return count;
};

// --- scenarios ---------------------------------------------------------------
describe('feed section reliability (10/02 pro feed wiring fix)', () => {
  test('T1 loading with empty cache shows visible one-liner, never a dead region', async () => {
    setApi(() => new Promise(() => {})); // hang the fetch
    const tree: any = await render(<ProviderFeedSection primaryColor="PRIMARY" />);
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    const t = textsOf(tree);
    expect(t).toContain('Latest in Birth Work');
    expect(t).toContain('Checking latest research...');
  });

  test('T2 failed fetch with empty cache keeps header + retry (never hides)', async () => {
    setApi(() => { throw new Error('net error'); });
    const tree: any = await render(<ProviderFeedSection primaryColor="PRIMARY" />);
    await act(async () => { await new Promise((r) => setTimeout(r, 2300)); }); // cover the 2s auto-retry (also fails)
    const t = textsOf(tree);
    expect(t).toContain('Latest in Birth Work');
    expect(t.some((s: string) => s.includes("Couldn't load the latest research"))).toBe(true);
  });

  test('T3 server-confirmed zero after completed refetch hides section', async () => {
    setApi(async () => ({ articles: [], pagination: { total: 0 } }));
    const tree: any = await render(<ProviderFeedSection primaryColor="PRIMARY" />);
    await act(async () => { await new Promise((r) => setTimeout(r, 2300)); }); // initial + one auto-retry
    expect(textsOf(tree)).toHaveLength(0);
  });

  test('T4 live 10/02 payload renders the card with the article title', async () => {
    setApi(async () => LIVE_PAYLOAD);
    const tree: any = await render(<ProviderFeedSection primaryColor="PRIMARY" />);
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(cardCount(tree)).toBe(1);
    expect(textsOf(tree).some((s: string) => s.includes('Hot Pads Applied to the Breast'))).toBe(true);
  });

  test('T5 MomFeedSection failed fetch keeps header + retry', async () => {
    setApi(() => { throw new Error('net error'); });
    const tree: any = await render(<MomFeedSection />);
    await act(async () => { await new Promise((r) => setTimeout(r, 2300)); });
    const t = textsOf(tree);
    expect(t).toContain("What's New for You");
    expect(t.some((s: string) => s.includes("Couldn't load the latest research"))).toBe(true);
  });

  test('T6 MomFeedSection renders card from live-payload shape', async () => {
    setApi(async () => LIVE_PAYLOAD);
    const tree: any = await render(<MomFeedSection />);
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(cardCount(tree)).toBe(1);
  });
});