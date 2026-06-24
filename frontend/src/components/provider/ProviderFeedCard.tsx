// Provider Feed Card Component
// Displays a single research feed article card in the provider dashboard

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Icon } from '../Icon';
import Card from '../Card';
import { SIZES, FONTS } from '../../constants/theme';
import { useColors } from '../../hooks/useThemedStyles';
import { apiRequest } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/api';

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

interface ProviderFeedCardProps {
  article: FeedArticle;
  primaryColor: string;
}

export default function ProviderFeedCard({ article, primaryColor }: ProviderFeedCardProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  const handleTap = async () => {
    if (article.tjb_blog_url) {
      await WebBrowser.openBrowserAsync(article.tjb_blog_url);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report Inaccuracy',
      'Help us improve. What was inaccurate about this summary?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Report',
          onPress: () => {
            // Simple report — sends to backend
            apiRequest(API_ENDPOINTS.FEED_REPORT_INACCURACY, {
              method: 'POST',
              body: { article_id: article.article_id, reason: 'Reported by user' },
            }).catch(() => {});
            Alert.alert('Thank you', 'We review all reports within 24 hours.');
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity onPress={handleTap} activeOpacity={0.8} data-testid="feed-card">
      <Card style={styles.card}>
        {/* Header: Source + Date */}
        <View style={styles.header}>
          <View style={styles.sourceRow}>
            <Icon name="book-outline" size={14} color={primaryColor} />
            <Text style={[styles.sourceName, { color: primaryColor }]}>
              {article.source_name}
            </Text>
          </View>
          <Text style={[styles.date, { color: colors.textLight }]}>
            {formatDate(article.approved_date)}
          </Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {article.title}
        </Text>

        {/* Excerpt */}
        <Text style={[styles.excerpt, { color: colors.textSecondary }]} numberOfLines={3}>
          {article.excerpt}
        </Text>

        {/* Practice Takeaway */}
        {article.practice_takeaway && (
          <View style={[styles.takeaway, { backgroundColor: primaryColor + '12' }]}>
            <Text style={[styles.takeawayLabel, { color: primaryColor }]}>Practice:</Text>
            <Text style={[styles.takeawayText, { color: colors.text }]}>
              {article.practice_takeaway}
            </Text>
          </View>
        )}

        {/* Tags + Actions */}
        <View style={styles.footer}>
          <View style={styles.tagsRow}>
            {article.tags?.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
              </View>
            ))}
            <Text style={[styles.aiTag, { color: colors.textLight }]}>AI</Text>
          </View>
          <TouchableOpacity onPress={handleReport} style={styles.reportBtn}>
            <Icon name="flag-outline" size={14} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      marginBottom: SIZES.sm,
      padding: SIZES.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SIZES.xs,
    },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sourceName: {
      fontSize: SIZES.fontXs,
      fontFamily: FONTS.bodyMedium,
    },
    date: {
      fontSize: SIZES.fontXs,
      fontFamily: FONTS.body,
    },
    title: {
      fontSize: SIZES.fontMd,
      fontFamily: FONTS.subheading,
      marginBottom: SIZES.xs,
    },
    excerpt: {
      fontSize: SIZES.fontSm,
      fontFamily: FONTS.body,
      lineHeight: 20,
      marginBottom: SIZES.sm,
    },
    takeaway: {
      flexDirection: 'row',
      padding: SIZES.sm,
      borderRadius: SIZES.radiusSm,
      marginBottom: SIZES.sm,
      gap: 4,
    },
    takeawayLabel: {
      fontSize: SIZES.fontXs,
      fontFamily: FONTS.bodyBold,
    },
    takeawayText: {
      fontSize: SIZES.fontXs,
      fontFamily: FONTS.body,
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tagsRow: {
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
    },
    tag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    tagText: {
      fontSize: 10,
      fontFamily: FONTS.body,
    },
    aiTag: {
      fontSize: 9,
      fontFamily: FONTS.bodyMedium,
      marginLeft: 2,
    },
    reportBtn: {
      padding: 4,
    },
  });
