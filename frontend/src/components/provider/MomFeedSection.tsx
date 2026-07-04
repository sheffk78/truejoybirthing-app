// Mom Feed Section
// Renders the "Birth & Baby Reads" section at the bottom of the mom home screen

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Icon } from '../Icon';
import ProviderFeedCard from './ProviderFeedCard';
import ProviderFeedDisclaimer from './ProviderFeedDisclaimer';
import { SIZES, FONTS } from '../../constants/theme';
import { useColors } from '../../hooks/useThemedStyles';
import { apiRequest } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@mom_feed_cache';
const CACHE_COUNT = 1; // Only cache the single current article

interface FeedArticle {
  article_id: string;
  title: string;
  source_name: string;
  excerpt: string;
  practice_takeaway?: string;
  tags?: string[];
  tjb_blog_url: string;
  approved_date: string;
}

export default function MomFeedSection() {
  const colors = useColors();
  const styles = getStyles(colors);

  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Load cached articles first (instant display)
  useEffect(() => {
    loadCache();
  }, []);

  // Then fetch fresh data
  useEffect(() => {
    fetchArticles();
  }, []);

  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setArticles(JSON.parse(cached));
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

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`${API_ENDPOINTS.FEED_ARTICLES}?page=1&limit=1&audience=mom`);
      if (data?.articles) {
        setArticles(data.articles);
        cacheArticles(data.articles);
      }
    } catch {
      // If fetch fails, cached articles remain visible
    } finally {
      setLoading(false);
    }
  };

  if (!loading && articles.length === 0) {
    return null; // Don't show the section if there are no articles
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

      {/* Loading State */}
      {loading && articles.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textLight }]}>
            Loading articles...
          </Text>
        </View>
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
      fontFamily: FONTS.subheading,
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
      fontFamily: FONTS.body,
    },
  });
