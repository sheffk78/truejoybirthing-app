import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import TIcon from '../../src/components/TIcon';
import Card from '../../src/components/Card';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { getBabyDevData, type BabyDevEntry } from '../../src/constants/babyDevelopmentData';
import { getPregnancyIllustration, hasPregnancyIllustration } from '../../src/constants/pregnancyIllustrations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HBand from '../../src/components/mom/HBand';
import { C, F, BAND_TIPS, trimesterOf } from '../../src/constants/corpus';

interface WeekContent {
  week: number;
  tip: string;
  affirmation: string;
  baby_development?: BabyDevEntry;
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
  const insets = useSafeAreaInsets();

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
      {/* Header — approved S12: photo band under status bar, title on veil */}
      <View style={[styles.bandWrap, { marginTop: -insets.top }]}>
        <HBand source={BAND_TIPS} height={168 + insets.top} />
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.overline}>YOUR WEEK</Text>
          <Text style={styles.headerTitle}>
            Weekly Tips & <Text style={styles.headerTitleAccent}>Affirmations</Text>
          </Text>
          <Text style={styles.headerSub}>One steady rhythm of learning, all 42 weeks</Text>
        </View>
      </View>

      {/* Tab Selector — approved pills */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, !showPostpartum && styles.tabActive]}
          onPress={() => {
            setShowPostpartum(false);
            setSelectedWeek(currentContent?.week <= 42 ? currentContent?.week : 1);
          }}
        >
          <Text style={[styles.tabText, !showPostpartum && styles.tabTextActive]}>
            Pregnancy · 1–42
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
            Postpartum · 1–6
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
        {/* Week Selector — approved week strip */}
        <Text style={styles.sectionLabel}>Select week</Text>
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
            // Approved: show ±5 weeks around current, others faded
            const currentWeekNum = showPostpartum ? currentContent?.postpartum_week : currentContent?.week;
            const isFaded = !isCurrent && !isSelected && currentWeekNum &&
              Math.abs(week - currentWeekNum) > 3;
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
                  isCurrent && !isSelected && styles.weekButtonTextCurrent,
                  isFaded && styles.weekButtonTextFaded,
                ]}>
                  {week}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Week Header — approved layout */}
        <View style={styles.selectedWeekHeader}>
          <Text style={styles.selectedWeekTitle}>
            {showPostpartum
              ? `Postpartum Week ${selectedWeek ?? 1}`
              : `Week ${selectedWeek ?? 1}`}
          </Text>
          {isCurrentWeek && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Your current week</Text>
            </View>
          )}
        </View>
        <Text style={styles.selectedWeekSub}>
          {showPostpartum
            ? 'Postpartum recovery'
            : `${trimesterOf(selectedWeek || 1)}${isCurrentWeek && currentContent?.current_day != null ? ` · day ${currentContent.current_day + 1}` : ''}`}
        </Text>

        {/* Weekly Tip Card — approved tipcard */}
        {displayContent?.tip && (
          <View style={styles.tipCard}>
            <Text style={styles.kickerLav}>WEEKLY TIP</Text>
            <Text style={styles.tipBody}>{displayContent.tip}</Text>
          </View>
        )}

        {/* Affirmation Card — approved tipcard.affirm */}
        {displayContent?.affirmation && (
          <View style={[styles.tipCard, styles.tipCardAffirm]}>
            <Text style={styles.kickerRose}>AFFIRMATION</Text>
            <Text style={styles.affirmQuote}>"{displayContent.affirmation}"</Text>
          </View>
        )}

        {/* Baby Development — approved srow with thumbnail */}
        {!showPostpartum && (() => {
          const week = selectedWeek;
          if (!week || week < 4 || week > 40) return null;
          const localBabyDev = getBabyDevData(week);
          const apiBabyDev = displayContent?.baby_development;
          const babyDev = apiBabyDev || localBabyDev;
          if (!babyDev) return null;
          return (
            <View style={styles.babyDevRow}>
              {hasPregnancyIllustration(week) ? (
                <Image
                  source={getPregnancyIllustration(week)}
                  style={styles.babyDevThumb}
                  resizeMode="cover"
                  accessibilityLabel={`Baby development illustration at week ${week}`}
                />
              ) : (
                <View style={[styles.babyDevThumb, styles.babyDevThumbPlaceholder]}>
                  <TIcon name="status_todo" size={28} color={C.grayLight} />
                </View>
              )}
              <View style={styles.babyDevMid}>
                <Text style={styles.kickerSage}>BABY AT WEEK {week}</Text>
                <Text style={styles.babyDevTitle}>
                  {babyDev.phase !== 'size_reference' ? babyDev.title : `As small as a ${babyDev.food}`}
                </Text>
                <Text style={styles.babyDevDesc} numberOfLines={3}>
                  {babyDev.description}
                </Text>
                <Text style={styles.babyDevLink}>Open this week's full guide</Text>
              </View>
            </View>
          );
        })()}

        {!displayContent?.tip && !displayContent?.affirmation && (
          <View style={styles.emptyState}>
            <TIcon name="ar_contract" size={48} color={C.grayLight} />
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
    backgroundColor: C.cream,
  },
  // —— Approved S12 header (band + title on veil) ——
  bandWrap: {
    position: 'relative',
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  overline: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: C.rose,
    marginBottom: 5,
    fontFamily: F.uiBold,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: F.serif,
    color: C.ink,
    lineHeight: 29,
  },
  headerTitleAccent: {
    color: C.roseSoft,
  },
  headerSub: {
    fontSize: 12.5,
    color: C.gray,
    marginTop: 4,
    fontFamily: F.ui,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.cream,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: F.ui,
    color: C.gray,
  },
  // —— Approved tab pills (.tabs2 .t2) ——
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1.3,
    borderColor: C.lavenderBorder,
    backgroundColor: C.cardBg,
  },
  tabActive: {
    backgroundColor: C.lavender,
    borderColor: C.lavender,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: F.uiBold,
    color: C.lavender,
  },
  tabTextActive: {
    color: C.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 60,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontFamily: F.ui,
    fontWeight: '500',
    color: C.gray,
    marginBottom: 7,
  },
  // —— Approved week strip (.wstrip .wk) ——
  weekScrollContainer: {
    marginBottom: 14,
  },
  weekScrollContent: {
    paddingRight: 20,
    gap: 7,
  },
  weekButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  weekButtonSelected: {
    backgroundColor: C.lavender,
    borderColor: C.lavender,
  },
  weekButtonCurrent: {
    borderColor: C.roseBorder,
    backgroundColor: C.gbandMid,
  },
  weekButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: F.uiBold,
    color: C.gray,
  },
  weekButtonTextSelected: {
    color: C.white,
  },
  weekButtonTextCurrent: {
    color: C.rose,
  },
  weekButtonTextFaded: {
    opacity: 0.45,
  },
  // —— Approved selected week header ——
  selectedWeekHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 2,
  },
  selectedWeekTitle: {
    fontSize: 21,
    fontFamily: F.serif,
    color: C.ink,
  },
  selectedWeekSub: {
    fontSize: 11.5,
    fontFamily: F.ui,
    fontWeight: '500',
    color: C.gray,
    marginBottom: 10,
  },
  currentBadge: {
    backgroundColor: C.lavenderBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  currentBadgeText: {
    fontSize: 9.5,
    letterSpacing: 0.6,
    fontWeight: '700',
    fontFamily: F.uiBold,
    color: C.lavender,
    textTransform: 'uppercase',
  },
  // —— Approved tip cards (.tipcard) ——
  tipCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  tipCardAffirm: {
    borderLeftWidth: 3,
    borderLeftColor: C.roseBorder,
  },
  kickerLav: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: F.uiBold,
    color: C.lavender,
    marginBottom: 6,
  },
  kickerRose: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: F.uiBold,
    color: C.rose,
    marginBottom: 6,
  },
  kickerSage: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: F.uiBold,
    color: C.sage,
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: F.ui,
    fontWeight: '500',
    color: C.body,
  },
  affirmQuote: {
    fontSize: 16.5,
    lineHeight: 23,
    fontFamily: F.serifItalic,
    color: C.ink,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: F.ui,
    color: C.gray,
  },
  // —— Approved baby dev row (.srow with thumbnail) ——
  babyDevRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  babyDevThumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
    flexShrink: 0,
  },
  babyDevThumbPlaceholder: {
    backgroundColor: C.lavenderBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  babyDevMid: {
    flex: 1,
  },
  babyDevTitle: {
    fontSize: 15.5,
    fontFamily: F.serifSemi,
    color: C.ink,
    marginBottom: 4,
  },
  babyDevDesc: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: F.ui,
    fontWeight: '500',
    color: C.gray,
  },
  babyDevLink: {
    fontSize: 11,
    fontFamily: F.uiSemi,
    fontWeight: '600',
    color: C.lavender,
    marginTop: 6,
  },
}));
