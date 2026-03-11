import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

interface WeekContent {
  week: number;
  tip: string;
  affirmation: string;
}

export default function WeeklyTipsScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const [currentContent, setCurrentContent] = useState<any>(null);
  const [allContent, setAllContent] = useState<{ pregnancy: WeekContent[]; postpartum: WeekContent[] } | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [showPostpartum, setShowPostpartum] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [current, all] = await Promise.all([
        apiRequest(API_ENDPOINTS.WEEKLY_CONTENT),
        apiRequest(API_ENDPOINTS.WEEKLY_CONTENT_ALL),
      ]);
      setCurrentContent(current);
      setAllContent(all);
      
      // Set initial selected week based on user's current week
      if (current?.week) {
        setSelectedWeek(current.week > 42 ? (current.postpartum_week || 1) : current.week);
        setShowPostpartum(current.is_postpartum);
      }
    } catch (error) {
      console.error('Error fetching weekly content:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const getDisplayContent = () => {
    if (!allContent) return null;
    const contentArray = showPostpartum ? allContent.postpartum : allContent.pregnancy;
    return contentArray.find(c => c.week === selectedWeek);
  };

  const displayContent = getDisplayContent();
  const isCurrentWeek = currentContent && (
    (showPostpartum && currentContent.is_postpartum && selectedWeek === currentContent.postpartum_week) ||
    (!showPostpartum && !currentContent.is_postpartum && selectedWeek === currentContent.week)
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading weekly content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Tips & Affirmations</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, !showPostpartum && styles.tabActive]}
          onPress={() => {
            setShowPostpartum(false);
            setSelectedWeek(currentContent?.week <= 42 ? currentContent?.week : 1);
          }}
        >
          <Text style={[styles.tabText, !showPostpartum && styles.tabTextActive]}>
            Pregnancy (1-42)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showPostpartum && styles.tabActive]}
          onPress={() => {
            setShowPostpartum(true);
            setSelectedWeek(currentContent?.postpartum_week || 1);
          }}
        >
          <Text style={[styles.tabText, showPostpartum && styles.tabTextActive]}>
            Postpartum (1-6)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Week Selector */}
        <Text style={styles.sectionLabel}>Select Week</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weekScrollContainer}
          contentContainerStyle={styles.weekScrollContent}
        >
          {(showPostpartum ? [1, 2, 3, 4, 5, 6] : Array.from({ length: 42 }, (_, i) => i + 1)).map((week) => {
            const isSelected = selectedWeek === week;
            const isCurrent = currentContent && (
              (showPostpartum && currentContent.is_postpartum && week === currentContent.postpartum_week) ||
              (!showPostpartum && !currentContent.is_postpartum && week === currentContent.week)
            );
            
            return (
              <TouchableOpacity
                key={week}
                style={[
                  styles.weekButton,
                  isSelected && styles.weekButtonSelected,
                  isCurrent && styles.weekButtonCurrent,
                ]}
                onPress={() => setSelectedWeek(week)}
              >
                <Text style={[
                  styles.weekButtonText,
                  isSelected && styles.weekButtonTextSelected,
                ]}>
                  {week}
                </Text>
                {isCurrent && (
                  <View style={styles.currentDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Week Header */}
        <View style={styles.selectedWeekHeader}>
          <Text style={styles.selectedWeekTitle}>
            {showPostpartum ? `Postpartum Week ${selectedWeek}` : `Week ${selectedWeek}`}
          </Text>
          {isCurrentWeek && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Your Current Week</Text>
            </View>
          )}
        </View>

        {/* Weekly Tip Card */}
        {displayContent?.tip && (
          <Card style={styles.contentCard}>
            <View style={styles.contentHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="bulb" size={24} color={colors.primary} />
              </View>
              <Text style={styles.contentLabel}>Weekly Tip</Text>
            </View>
            <Text style={styles.tipText}>{displayContent.tip}</Text>
          </Card>
        )}

        {/* Weekly Affirmation Card */}
        {displayContent?.affirmation && (
          <Card style={[styles.contentCard, styles.affirmationCard]}>
            <View style={styles.contentHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.roleDoula + '20' }]}>
                <Icon name="heart" size={24} color={colors.roleDoula} />
              </View>
              <Text style={styles.contentLabel}>Weekly Affirmation</Text>
            </View>
            <Text style={styles.affirmationText}>"{displayContent.affirmation}"</Text>
          </Card>
        )}

        {!displayContent?.tip && !displayContent?.affirmation && (
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No content available for this week.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: FONTS.bodyBold,
    color: colors.primary,
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl * 2,
  },
  sectionLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: colors.textSecondary,
    marginBottom: SIZES.sm,
  },
  weekScrollContainer: {
    marginBottom: SIZES.lg,
  },
  weekScrollContent: {
    paddingRight: SIZES.lg,
  },
  weekButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  weekButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekButtonCurrent: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  weekButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
  },
  weekButtonTextSelected: {
    color: colors.white,
  },
  currentDot: {
    position: 'absolute',
    bottom: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  selectedWeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  selectedWeekTitle: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  currentBadge: {
    marginLeft: SIZES.sm,
    backgroundColor: colors.accent + '20',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.radiusSm,
  },
  currentBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: colors.accent,
  },
  contentCard: {
    marginBottom: SIZES.md,
    padding: SIZES.lg,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  contentLabel: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
  },
  tipText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  affirmationCard: {
    backgroundColor: colors.roleDoula + '08',
    borderLeftWidth: 4,
    borderLeftColor: colors.roleDoula,
  },
  affirmationText: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.body,
    color: colors.text,
    lineHeight: 28,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
}));
