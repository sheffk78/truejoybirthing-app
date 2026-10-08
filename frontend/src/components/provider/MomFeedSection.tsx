import { F } from '../../constants/corpus';
// Mom Feed Section
// Renders the "Birth & Baby Reads" section at the bottom of the mom home screen
//
// 10/02 reliability pass (same treatment as ProviderFeedSection): never a dead
// region while loading or after a failed fetch — the header stays with a
// one-liner + tappable retry; a confirmed-empty refetch is the only state
// that hides the section; refetches on screen focus so a session that loaded
// before the publishing batch self-heals.

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

const CACHE_KEY = '@mom_feed_cache';
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

export default function MomFeedSection() {
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
      const data = await apiRequest(`${API_ENDPOINTS.FEED_ARTICLES}?page=1&limit=1&audience=mom`);
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

  // Fetch fresh data on mount + every screen focus (single path via
  // useFocusEffect, which fires on mount). One auto-retry when the first
  // attempt finds nothing — self-heals a cached-empty state and the
  // publishing-batch race (feed loaded seconds before the cron article landed).
  useFocusEffect(
    useCallback(() => {
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
          <Icon name="book-outline" size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            What's New for You
          </Text>
        </View>
        <Icon name="information-circle-outline" size={16} color={colors.textLight} />
      </TouchableOpacity>

      {/* Loading State — always a visible region while we don't know yet */}
      {loading && articles.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
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

      {/* Article Card — single current excerpt for moms */}
      {articles.slice(0, 1).map((article) => (
        <ProviderFeedCard
          key={article.article_id}
          article={article}
          primaryColor={colors.primary}
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