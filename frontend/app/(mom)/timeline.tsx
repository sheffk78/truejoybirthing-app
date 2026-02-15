import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

export default function TimelineScreen() {
  const [timeline, setTimeline] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchTimeline = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.TIMELINE);
      setTimeline(data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };
  
  useEffect(() => {
    fetchTimeline();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTimeline();
    setRefreshing(false);
  };
  
  const currentWeek = timeline?.current_week || 20;
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pregnancy Timeline</Text>
          {timeline?.due_date && (
            <Text style={styles.dueDate}>Due: {timeline.due_date}</Text>
          )}
        </View>
        
        {/* Current Week Highlight */}
        {currentWeek && (
          <Card style={styles.currentWeekCard}>
            <View style={styles.currentWeekHeader}>
              <View style={styles.weekBadge}>
                <Text style={styles.weekBadgeText}>Week {currentWeek}</Text>
              </View>
              <Text style={styles.currentWeekLabel}>You are here</Text>
            </View>
            
            {timeline?.timeline && (
              <>
                <View style={styles.babySection}>
                  <Icon name="heart" size={24} color={COLORS.accent} />
                  <Text style={styles.babySectionTitle}>Baby Development</Text>
                </View>
                <Text style={styles.babyText}>
                  {timeline.timeline.find((w: any) => w.week === currentWeek)?.baby_development ||
                    'Your baby is growing every day!'}
                </Text>
                
                <View style={styles.tipSection}>
                  <Icon name="bulb" size={20} color={COLORS.warning} />
                  <Text style={styles.tipSectionTitle}>Tip of the Week</Text>
                </View>
                <Text style={styles.tipText}>
                  {timeline.timeline.find((w: any) => w.week === currentWeek)?.tip ||
                    'Stay hydrated and rest when you can!'}
                </Text>
              </>
            )}
          </Card>
        )}
        
        {/* Timeline List */}
        <Text style={styles.sectionTitle}>Week by Week</Text>
        {timeline?.timeline?.map((week: any) => (
          <Card
            key={week.week}
            style={[
              styles.weekCard,
              week.week === currentWeek && styles.weekCardCurrent,
            ]}
          >
            <View style={styles.weekRow}>
              <View
                style={[
                  styles.weekNumber,
                  week.week === currentWeek && styles.weekNumberCurrent,
                  week.week < currentWeek && styles.weekNumberPast,
                ]}
              >
                <Text
                  style={[
                    styles.weekNumberText,
                    (week.week === currentWeek || week.week < currentWeek) && styles.weekNumberTextLight,
                  ]}
                >
                  {week.week}
                </Text>
              </View>
              <View style={styles.weekContent}>
                <Text style={styles.weekTitle}>Week {week.week}</Text>
                <Text style={styles.weekDescription} numberOfLines={2}>
                  {week.baby_development}
                </Text>
              </View>
              {week.week === currentWeek && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Now</Text>
                </View>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  header: {
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dueDate: {
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  currentWeekCard: {
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
    backgroundColor: COLORS.primaryLight + '15',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  currentWeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  weekBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginRight: SIZES.sm,
  },
  weekBadgeText: {
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    fontWeight: '700',
  },
  currentWeekLabel: {
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontWeight: '500',
  },
  babySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  babySectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  babyText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SIZES.md,
  },
  tipSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  tipSectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  tipText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  weekCard: {
    marginBottom: SIZES.sm,
  },
  weekCardCurrent: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  weekNumberCurrent: {
    backgroundColor: COLORS.primary,
  },
  weekNumberPast: {
    backgroundColor: COLORS.success,
  },
  weekNumberText: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  weekNumberTextLight: {
    color: COLORS.white,
  },
  weekContent: {
    flex: 1,
  },
  weekTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  weekDescription: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  currentBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  currentBadgeText: {
    color: COLORS.white,
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
});
