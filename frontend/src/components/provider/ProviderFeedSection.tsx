import { F } from '../../constants/corpus';
// Provider Feed Section
// Renders the "Latest in Birth Work" section at the bottom of the provider dashboard
//
// 10/02 reliability pass: the section hid itself (returned null) whenever the
// feed came back empty or the fetch failed with no cache — a dead region Jeff
// hit on the pro dashboard. Now: loading keeps a visible one-liner, a failed
// fetch shows a tappable retry (no new colors — existing tokens only), an
// empty result is auto-retried once and then confirmed-empty is the ONLY
// state that hides the section, and screen focus refetches so a session that
// loaded before the publishing batch self-heals without a full app relaunch.

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Icon } from '../Icon';
import ProviderFeedCard from './ProviderFeedCard';
import ProviderFeedDisclaimer from './ProviderFeedDisclaimer';
import { SIZES } from '../../constants/theme';
import { useColors } from '../../hooks/useThemedStyles';
import { apiRequest } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@research_feed_cache';
const CACHE_COUNT = 1; // Only cache the single current article
const EMPTY_RETRY_DELAY_MS = 2000; // one silent retry when the first attempt finds nothing

interface FeedArticle {
  article_id: string;
  title: string;
  source_name: string;
  excerpt: string;
  practice_takeaway?: string;
  tags?: string[];
  // Backend sends null until the blog pass publishes the post (10/02 payload had null)
  tjb_blog_url?: string | null;
  approved_date: string;
}

interface ProviderFeedSectionProps {
  primaryColor: string;
}

export default function ProviderFeedSection({ primaryColor }: ProviderFeedSectionProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  // Server CONFIRMED zero after a completed refetch — the only state that hides the section
  const [emptyAfterRefetch, setEmptyAfterRefetch] = useState(false);
  // Latest attempt failed (network/auth) — show a tappable retry, never a dead region
  const [fetchFailed, setFetchFailed] = useState(false);

  const inFlightRef = useRef(false);
  const skipFirstFocusRef = useRef(true);

  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setArticles(parsed);
        }
      }
    } catch {
      // Silent fail — cache is optional
    }
  };

  const cacheArticles = async (newArticles: FeedArticle[]) => {
    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify(newArticles.slice(0, CACHE_COUNT))
      );
    } catch {
      // Silent fail
    }
  };

  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // Silent fail
    }
  };

  const fetchArticles = async (): Promise<FeedArticle[]> => {
    if (inFlightRef.current) return [];
    inFlightRef.current = true;
    try {
      setLoading(true);
      const data = await apiRequest(`${API_ENDPOINTS.FEED_ARTICLES}?page=1&limit=1&audience=provider`);
      const list = Array.isArray(data?.articles) ? data.articles : [];
      if (list.length > 0) {
        setArticles(list);
        cacheArticles(list);
      } else {
        // Server has nothing — self-heal a stale/empty cache
        setArticles([]);
        clearCache();
      }
      setEmptyAfterRefetch(true);
      setFetchFailed(false);
      return list;
    } catch {
      // Fetch failed: cached articles (if any) remain visible; with nothing
      // cached the header stays with a retry affordance instead of going dead
      setFetchFailed(true);
      setEmptyAfterRefetch(false);
      return [];
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  // Load cached articles first (instant display)
  useEffect(() => {
    loadCache();
  }, []);

  // Then fetch fresh data; if the first attempt finds nothing (empty or
  // failed), auto-retry once — self-heals a cached-empty state and the
  // publishing-batch race (feed loaded seconds before the cron article landed)
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const first = await fetchArticles();
      if (cancelled || first.length > 0) return;
      retryTimer = setTimeout(async () => {
        if (!cancelled) await fetchArticles();
      }, EMPTY_RETRY_DELAY_MS);
    })();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Self-heal on screen focus: a session that missed the publishing batch
  // (feed empty at load, app left in background) refetches when the tab is
  // reopened — without this an empty first load hid the card until a full
  // app relaunch
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocusRef.current) {
        skipFirstFocusRef.current = false;
        return;
      }
      fetchArticles();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Hidden ONLY when a completed fetch CONFIRMED zero articles — anything
  // else (loading, failed, uncached unknown) keeps a visible region
  if (!loading && articles.length === 0 && emptyAfterRefetch && !fetchFailed) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setShowDisclaimer(true)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Icon name="book-outline" size={18} color={primaryColor} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Latest in Birth Work
          </Text>
        </View>
        <Icon name="information-circle-outline" size={16} color={colors.textLight} />
      </TouchableOpacity>

      {/* Loading State — always a visible region while we don't know yet */}
      {loading && articles.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={primaryColor} />
          <Text style={[styles.loadingText, { color: colors.textLight }]}>
            Checking latest research...
          </Text>
        </View>
      )}

      {/* Fetch failed with nothing cached — tappable retry, never a dead region */}
      {!loading && articles.length === 0 && fetchFailed && (
        <TouchableOpacity
          style={styles.loadingContainer}
          onPress={() => fetchArticles()}
          activeOpacity={0.7}
        >
          <Text style={[styles.loadingText, { color: colors.textLight }]}>
            Couldn't load the latest research — tap to retry
          </Text>
        </TouchableOpacity>
      )}

      {/* Article Card — single current excerpt */}
      {articles.slice(0, 1).map((article) => (
        <ProviderFeedCard
          key={article.article_id}
          article={article}
          primaryColor={primaryColor}
        />
      ))}

      {/* Disclaimer Modal */}
      <ProviderFeedDisclaimer
        visible={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
      />
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginTop: SIZES.lg,
      marginBottom: SIZES.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SIZES.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontSize: SIZES.fontLg,
      fontFamily: F.serifSemi,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: SIZES.lg,
      gap: SIZES.sm,
    },
    loadingText: {
      fontSize: SIZES.fontSm,
      fontFamily: F.ui,
    },
  });