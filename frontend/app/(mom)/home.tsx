import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, SHADOWS, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

interface PendingContract {
  contract_id: string;
  provider_name: string;
  provider_role: string;
  status: string;
  created_at: string;
}

interface PendingInvoice {
  invoice_id: string;
  provider_name: string;
  amount: number;
  status: string;
  due_date?: string;
}

export default function MomHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  const styles = getStyles(colors);
  
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [weeklyContent, setWeeklyContent] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingContracts, setPendingContracts] = useState<PendingContract[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  
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
      
      // Fetch contracts and invoices separately to handle errors gracefully
      try {
        const contractsData = await apiRequest('/mom/contracts');
        // Filter for contracts that need mom's signature (status = Sent)
        const pending = (contractsData as any[]).filter((c: any) => 
          c.status === 'Sent' || c.status === 'sent'
        );
        console.log('Fetched contracts:', contractsData.length, 'Pending:', pending.length);
        setPendingContracts(pending);
      } catch (err) {
        console.log('Error fetching contracts:', err);
        setPendingContracts([]);
      }
      
      try {
        const invoicesData = await apiRequest('/mom/invoices');
        // Filter for unpaid invoices
        const pending = (invoicesData as any[]).filter((i: any) => 
          i.status === 'Sent' || i.status === 'sent' || i.status === 'pending'
        );
        console.log('Fetched invoices:', invoicesData.length, 'Pending:', pending.length);
        setPendingInvoices(pending);
      } catch (err) {
        console.log('Error fetching invoices:', err);
        setPendingInvoices([]);
      }
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>Hello, {firstName}</Text>
            {timeline?.current_week && (
              <Text style={[styles.weekText, { color: colors.textSecondary }]}>Week {timeline.current_week} of pregnancy</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={() => router.push('/(mom)/profile')}
            data-testid="profile-avatar-btn"
          >
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatarImage} />
            ) : (
              <Icon name="person-circle-outline" size={44} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Birth Plan Card */}
        <Card style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Icon name="document-text" size={24} color={colors.white} />
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
            <Icon name="arrow-forward-circle" size={16} color={colors.primary} />
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
              <View style={[styles.weeklyIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="bulb" size={22} color={colors.primary} />
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
              <Icon name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </Card>
        )}
        
        {/* Weekly Affirmation Card */}
        {weeklyContent?.affirmation && (
          <Card style={[styles.weeklyCard, styles.affirmationCard]}>
            <View style={styles.weeklyHeader}>
              <View style={[styles.weeklyIconContainer, { backgroundColor: colors.roleDoula + '20' }]}>
                <Icon name="heart" size={22} color={colors.roleDoula} />
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
        
        {/* Pending Actions Section - Contracts & Invoices */}
        {(pendingContracts.length > 0 || pendingInvoices.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Action Required</Text>
            
            {/* Pending Contracts */}
            {pendingContracts.map((contract) => (
              <TouchableOpacity
                key={contract.contract_id}
                onPress={() => {
                  // Navigate to sign contract page based on provider role
                  const role = contract.provider_role?.toLowerCase() || 'doula';
                  if (role === 'midwife') {
                    router.push(`/sign-midwife-contract?contractId=${contract.contract_id}` as any);
                  } else {
                    router.push(`/sign-contract?contractId=${contract.contract_id}` as any);
                  }
                }}
                activeOpacity={0.8}
                data-testid={`pending-contract-${contract.contract_id}`}
              >
                <Card style={styles.actionRequiredCard}>
                  <View style={styles.actionRequiredHeader}>
                    <View style={[styles.actionRequiredIcon, { backgroundColor: colors.warning + '20' }]}>
                      <Icon name="document-text" size={24} color={colors.warning} />
                    </View>
                    <View style={styles.actionRequiredContent}>
                      <Text style={styles.actionRequiredTitle}>Contract to Sign</Text>
                      <Text style={styles.actionRequiredSubtitle}>
                        From {contract.provider_name} ({contract.provider_role})
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={24} color={colors.textLight} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
            
            {/* Pending Invoices */}
            {pendingInvoices.map((invoice) => (
              <TouchableOpacity
                key={invoice.invoice_id}
                onPress={() => router.push('/(mom)/invoices' as any)}
                activeOpacity={0.8}
                data-testid={`pending-invoice-${invoice.invoice_id}`}
              >
                <Card style={styles.actionRequiredCard}>
                  <View style={styles.actionRequiredHeader}>
                    <View style={[styles.actionRequiredIcon, { backgroundColor: colors.roleDoula + '20' }]}>
                      <Icon name="receipt" size={24} color={colors.roleDoula} />
                    </View>
                    <View style={styles.actionRequiredContent}>
                      <Text style={styles.actionRequiredTitle}>Invoice - ${invoice.amount}</Text>
                      <Text style={styles.actionRequiredSubtitle}>
                        From {invoice.provider_name}
                        {invoice.due_date ? ` • Due ${new Date(invoice.due_date).toLocaleDateString()}` : ''}
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={24} color={colors.textLight} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
        
        {/* Key Actions */}
        <Text style={styles.sectionTitle}>Key Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/timeline')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accent + '30' }]}>
              <Icon name="calendar" size={24} color={colors.accent} />
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
            <View style={[styles.actionIcon, { backgroundColor: colors.success + '30' }]}>
              <Icon name="heart" size={24} color={colors.success} />
            </View>
            <Text style={styles.actionTitle}>Wellness</Text>
            <Text style={styles.actionSubtitle}>How are you feeling?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/appointments')}
            activeOpacity={0.8}
            data-testid="key-action-schedule-provider"
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '30' }]}>
              <Icon name="calendar-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Schedule</Text>
            <Text style={styles.actionSubtitle}>With your provider</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
  },
  weekText: {
    fontSize: SIZES.fontMd,
    color: colors.primary,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  cardTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  progressContainer: {
    marginBottom: SIZES.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: SIZES.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  nextStep: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.primary,
    marginBottom: SIZES.md,
  },
  cardButton: {
    marginTop: SIZES.xs,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginBottom: SIZES.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    marginHorizontal: -SIZES.xs,
    marginBottom: SIZES.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
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
    color: colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
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
    color: colors.text,
    marginLeft: SIZES.sm,
  },
  teamText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
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
    color: colors.text,
  },
  weeklyWeek: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.primary,
  },
  weeklyContent: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
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
    color: colors.primary,
  },
  affirmationCard: {
    backgroundColor: colors.roleDoula + '08',
    borderLeftWidth: 3,
    borderLeftColor: colors.roleDoula,
  },
  affirmationContent: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyItalic || FONTS.body,
    color: colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  actionRequiredCard: {
    marginBottom: SIZES.sm,
    padding: SIZES.md,
  },
  actionRequiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRequiredIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  actionRequiredContent: {
    flex: 1,
  },
  actionRequiredTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
    marginBottom: 2,
  },
  actionRequiredSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
}));
