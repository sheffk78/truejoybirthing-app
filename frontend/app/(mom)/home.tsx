import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, SHADOWS, FONTS } from '../../src/constants/theme';

export default function MomHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [weeklyContent, setWeeklyContent] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchData = async () => {
    try {
      const [planData, timelineData, contentData] = await Promise.all([
        apiRequest(API_ENDPOINTS.BIRTH_PLAN),
        apiRequest(API_ENDPOINTS.TIMELINE),
        apiRequest(API_ENDPOINTS.WEEKLY_CONTENT),
      ]);
      setBirthPlan(planData);
      setTimeline(timelineData);
      setWeeklyContent(contentData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  const getNextStep = () => {
    if (!birthPlan?.sections) return 'Start your birth plan';
    const incomplete = birthPlan.sections.find((s: any) => s.status !== 'Complete');
    return incomplete ? `Complete: ${incomplete.title}` : 'Review your birth plan';
  };
  
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  
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
          <View>
            <Text style={styles.greeting}>Hello, {firstName}</Text>
            {timeline?.current_week && (
              <Text style={styles.weekText}>Week {timeline.current_week} of pregnancy</Text>
            )}
          </View>
          <TouchableOpacity style={styles.avatarContainer}>
            <Icon name="person-circle-outline" size={44} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Birth Plan Card */}
        <Card style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Icon name="document-text" size={24} color={COLORS.white} />
            </View>
            <Text style={styles.cardTitle}>Joyful Birth Plan</Text>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${birthPlan?.completion_percentage || 0}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(birthPlan?.completion_percentage || 0)}% complete
            </Text>
          </View>
          
          <Text style={styles.nextStep}>
            <Icon name="arrow-forward-circle" size={16} color={COLORS.primary} />
            {' '}{getNextStep()}
          </Text>
          
          <Button
            title="Open Birth Plan"
            onPress={() => router.push('/(mom)/birth-plan')}
            fullWidth
            style={styles.cardButton}
          />
        </Card>
        
        {/* Weekly Tip Card */}
        {weeklyContent?.tip && (
          <Card style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <View style={[styles.weeklyIconContainer, { backgroundColor: COLORS.primary + '20' }]}>
                <Icon name="bulb" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.weeklyHeaderText}>
                <Text style={styles.weeklyLabel}>Weekly Tip</Text>
                <Text style={styles.weeklyWeek}>
                  {weeklyContent.display_week || `Week ${weeklyContent.week || '...'}`}
                </Text>
              </View>
            </View>
            <Text style={styles.weeklyContent} numberOfLines={4}>
              {weeklyContent.tip}
            </Text>
            <TouchableOpacity 
              style={styles.weeklyReadMore}
              onPress={() => router.push('/(mom)/weekly-tips')}
            >
              <Text style={styles.weeklyReadMoreText}>Read more</Text>
              <Icon name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </Card>
        )}
        
        {/* Weekly Affirmation Card */}
        {weeklyContent?.affirmation && (
          <Card style={[styles.weeklyCard, styles.affirmationCard]}>
            <View style={styles.weeklyHeader}>
              <View style={[styles.weeklyIconContainer, { backgroundColor: COLORS.roleDoula + '20' }]}>
                <Icon name="heart" size={22} color={COLORS.roleDoula} />
              </View>
              <View style={styles.weeklyHeaderText}>
                <Text style={styles.weeklyLabel}>Weekly Affirmation</Text>
                <Text style={styles.weeklyWeek}>
                  {weeklyContent.display_week || `Week ${weeklyContent.week || '...'}`}
                </Text>
              </View>
            </View>
            <Text style={styles.affirmationContent}>
              "{weeklyContent.affirmation}"
            </Text>
          </Card>
        )}
        
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/timeline')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.accent + '30' }]}>
              <Icon name="calendar" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.actionTitle}>Timeline</Text>
            <Text style={styles.actionSubtitle}>
              {timeline?.current_week ? `Week ${timeline.current_week}` : 'Track progress'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/wellness')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '30' }]}>
              <Icon name="heart" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionTitle}>Wellness</Text>
            <Text style={styles.actionSubtitle}>How are you feeling?</Text>
          </TouchableOpacity>
        </View>
        
        {/* More Actions Row */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/postpartum')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '30' }]}>
              <Icon name="happy" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.actionTitle}>Postpartum</Text>
            <Text style={styles.actionSubtitle}>Fourth trimester plan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/appointments')}
            activeOpacity={0.8}
            data-testid="appointments-quick-action"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.roleDoula + '30' }]}>
              <Icon name="calendar-number" size={24} color={COLORS.roleDoula} />
            </View>
            <Text style={styles.actionTitle}>Appointments</Text>
            <Text style={styles.actionSubtitle}>Upcoming visits</Text>
          </TouchableOpacity>
        </View>
        
        {/* Team Row */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/my-team')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '30' }]}>
              <Icon name="people" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionTitle}>My Team</Text>
            <Text style={styles.actionSubtitle}>Care providers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/marketplace')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.roleMidwife + '30' }]}>
              <Icon name="search" size={24} color={COLORS.roleMidwife} />
            </View>
            <Text style={styles.actionTitle}>Find Providers</Text>
            <Text style={styles.actionSubtitle}>Browse marketplace</Text>
          </TouchableOpacity>
        </View>
        
        {/* Share Your Plan */}
        <Card style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <Icon name="share-social" size={20} color={COLORS.primary} />
            <Text style={styles.teamTitle}>Share Your Birth Plan</Text>
          </View>
          <Text style={styles.teamText}>
            Share your birth plan with your doula or midwife so they can review it and add their professional notes.
          </Text>
          <Button
            title="Share with Provider"
            onPress={() => router.push('/(mom)/share-birth-plan')}
            variant="outline"
            size="sm"
          />
        </Card>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  greeting: {
    fontSize: SIZES.fontXxl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  weekText: {
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCard: {
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  cardTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  progressContainer: {
    marginBottom: SIZES.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: SIZES.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  nextStep: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.primary,
    marginBottom: SIZES.md,
  },
  cardButton: {
    marginTop: SIZES.xs,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    marginHorizontal: -SIZES.xs,
    marginBottom: SIZES.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginHorizontal: SIZES.xs,
    ...SHADOWS.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  actionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  tipCard: {
    marginBottom: SIZES.lg,
    backgroundColor: COLORS.warning + '15',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  tipTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  tipText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  teamCard: {
    marginBottom: SIZES.md,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  teamTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  teamText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
    lineHeight: 20,
  },
  // Weekly Tip & Affirmation Card Styles
  weeklyCard: {
    marginBottom: SIZES.md,
    padding: SIZES.md,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  weeklyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  weeklyHeaderText: {
    flex: 1,
  },
  weeklyLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  weeklyWeek: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.primary,
  },
  weeklyContent: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SIZES.sm,
  },
  weeklyReadMore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyReadMoreText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.primary,
  },
  affirmationCard: {
    backgroundColor: COLORS.roleDoula + '08',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.roleDoula,
  },
  affirmationContent: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyItalic || FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
});
