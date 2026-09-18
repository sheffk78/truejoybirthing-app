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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import MomFeedSection from '../../src/components/provider/MomFeedSection';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS, BRAND } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { getBabyDevData } from '../../src/constants/babyDevelopmentData';
import { getPregnancyIllustration, hasPregnancyIllustration } from '../../src/constants/pregnancyIllustrations';
import HBand from '../../src/components/mom/HBand';
import { BAND_HOME, C, F } from '../../src/constants/designRefresh';

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

interface RecentlyPaidInvoice {
  invoice_id: string;
  provider_name: string;
  amount: number;
  paid_at: string;
}

export default function MomHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [weeklyContent, setWeeklyContent] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingContracts, setPendingContracts] = useState<PendingContract[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [recentlyPaid, setRecentlyPaid] = useState<RecentlyPaidInvoice[]>([]);
  const [dismissedPaid, setDismissedPaid] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  
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
      setLoadError(null);
      
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

        // Recently Paid: invoices marked Paid in the last 5 days (auto-expires),
        // minus ones the mom dismissed. Gives closure after a provider marks paid.
        const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
        const paid = (invoicesData as any[])
          .filter((i: any) =>
            (i.status === 'Paid' || i.status === 'paid') &&
            i.paid_at && new Date(i.paid_at).getTime() >= fiveDaysAgo
          )
          .map((i: any) => ({
            invoice_id: i.invoice_id,
            provider_name: i.provider_name || i.provider_email || 'Your provider',
            amount: i.amount,
            paid_at: i.paid_at,
          }))
          .sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
        setRecentlyPaid(paid);
      } catch (err) {
        console.log('Error fetching invoices:', err);
        setPendingInvoices([]);
        setRecentlyPaid([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoadError('Unable to load your home screen. Pull to refresh or try again.');
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

  const dismissRecentlyPaid = (invoiceId: string) => {
    setDismissedPaid((prev) => new Set(prev).add(invoiceId));
  };
  
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const initials = (user?.full_name || 'EV')
    .trim().split(/\s+/).slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? '').join('') || 'EV';
  const weekNum = Number(weeklyContent?.week ?? timeline?.current_week ?? 0);
  const trimesterSub =
    weekNum >= 28 ? "Third trimester begins — let's keep it steady"
    : weekNum >= 14 ? 'Second trimester — steady and strong'
    : 'First trimester — welcome, mama';
  
  return (
    <ErrorBoundary
      fallback={
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={48} color={colors.textLight} />
            <Text style={styles.errorTitle}>Unable to Load Home</Text>
            <Text style={styles.errorMessage}>
              Something went wrong. Pull down to refresh or try again later.
            </Text>
            <Button
              title="Try Again"
              onPress={fetchData}
              style={{ marginTop: SIZES.md }}
              icon={<Icon name="refresh" size={18} color={colors.white} />}
            />
          </View>
        </SafeAreaView>
      }
      onError={(error) => {
        console.error('[Home Screen] Render error caught by ErrorBoundary:', error);
      }}
    >
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Inline Error State */}
        {loadError && (
          <Card style={styles.errorCard}>
            <Icon name="alert-circle-outline" size={32} color={colors.error} />
            <Text style={styles.errorText}>{loadError}</Text>
            <Button
              title="Retry"
              onPress={fetchData}
              style={{ marginTop: SIZES.sm }}
              icon={<Icon name="refresh" size={16} color={colors.white} />}
            />
          </Card>
        )}
        
        {/* Header — approved S10: photo band under the status bar, greeting rows on the veil */}
        <View style={[styles.bandWrap, { marginTop: -insets.top }]}>
          <HBand source={BAND_HOME} height={190 + insets.top} />
          <View style={[styles.header, { paddingTop: insets.top + 30 }]}>
            <View style={styles.headerTopRow}>
              <Text style={styles.overline}>
                Week {timeline?.current_week ?? '—'} · Day {timeline?.current_day ?? 0}
              </Text>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={() => router.push('/(mom)/profile')}
                data-testid="profile-avatar-btn"
              >
                {user?.picture ? (
                  <Image source={{ uri: user.picture }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.greeting}>
              Hello, <Text style={styles.greetingAccent}>{firstName}</Text>
            </Text>
            <Text style={styles.weekText}>{trimesterSub}</Text>
          </View>
        </View>
        
        {/* Birth Plan Card */}
        <TouchableOpacity
          onPress={() => router.push('/(mom)/birth-plan')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open your Joyful Birth Plan"
        >
          <Card style={styles.mainCard}>
            <View style={styles.birthPlanTopRow}>
              <View style={styles.birthPlanTextGroup}>
                <Text style={styles.kickerRose}>BIRTH PLAN</Text>
                <Text style={styles.cardTitle}>Joyful Birth Plan</Text>
                <Text style={styles.nextStep} numberOfLines={1}>
                  Next: {getNextStep()}
                </Text>
              </View>
              <View style={styles.birthPlanAction}>
                <Icon name="chevron-forward" size={18} color={C.chev} />
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${birthPlan?.completion_percentage || 0}%` },
                ]}
              />
            </View>
          </Card>
        </TouchableOpacity>
        
        {/* Baby Development Card */}
        {(() => {
          // Determine the current pregnancy week for baby development
          // Ensure currentWeek is a number (API may return numeric string)
          const rawWeek = weeklyContent?.week;
          const currentWeek = typeof rawWeek === 'number' ? rawWeek : Number(rawWeek);
          const isPostpartum = weeklyContent?.is_postpartum;
          if (isPostpartum || !currentWeek || currentWeek < 4 || currentWeek > 40) return null;
          
          // Use local data first (offline-first), fall back to API data
          const localBabyDev = getBabyDevData(currentWeek);
          const babyDev = weeklyContent?.baby_development || localBabyDev;

          if (!babyDev) return null;
          
          return (
            <Card style={styles.babyDevCard}>
              <View style={styles.cardKickerRow}>
                <Text style={styles.kickerSage}>Baby Development</Text>
                <Text style={styles.cardKickerMeta}>
                  {weeklyContent.display_week || `Week ${currentWeek}`}
                </Text>
              </View>
              {/* Baby development illustration — full-width watercolor, 150px */}
              <View style={styles.babyDevImageContainer}>
                {hasPregnancyIllustration(currentWeek) ? (
                  <Image
                    source={getPregnancyIllustration(currentWeek)}
                    style={styles.babyDevImage}
                    resizeMode="cover"
                    accessibilityLabel={
                      babyDev.phase === 'size_reference'
                        ? `Illustration showing the size of a ${babyDev.food} at week ${currentWeek} of pregnancy`
                        : `Cross-section illustration showing baby at ${currentWeek} weeks inside the uterus`
                    }
                    onError={(e) => console.warn(`Failed to load pregnancy illustration for week ${currentWeek}:`, e.nativeEvent?.error)}
                  />
                ) : (
                  <View style={styles.babyDevImagePlaceholder}>
                    <Icon name="image-outline" size={48} color={C.roseSoft} />
                  </View>
                )}
              </View>
              {babyDev.phase === 'size_reference' && babyDev.sizeNote && (
                <View style={styles.babyDevSizeBadge}>
                  <Text style={styles.babyDevSizeBadgeText}>{babyDev.sizeNote}</Text>
                </View>
              )}
              <Text style={styles.cardH3}>{babyDev.title}</Text>
              <Text style={styles.babyDevDescription} numberOfLines={4}>
                {babyDev.description}
              </Text>
              <TouchableOpacity 
                style={styles.weeklyReadMore}
                onPress={() => router.push('/(mom)/weekly-tips')}
              >
                <Text style={styles.linkRose}>Learn more</Text>
                <Icon name="chevron-forward" size={14} color={C.rose} />
              </TouchableOpacity>
            </Card>
          );
        })()}
        
        {/* Weekly Tip Card */}
        {weeklyContent?.tip && (
          <Card style={styles.weeklyCard}>
            <View style={styles.cardKickerRow}>
              <Text style={styles.kickerRose}>Weekly Tip</Text>
              <Text style={styles.tipWeekChip}>
                {weeklyContent.display_week || `Week ${weeklyContent.week || '...'}`}
              </Text>
            </View>
            <Text style={styles.weeklyContent} numberOfLines={4}>
              {weeklyContent.tip}
            </Text>
            <TouchableOpacity 
              style={styles.weeklyReadMore}
              onPress={() => router.push('/(mom)/weekly-tips')}
            >
              <Text style={styles.linkRose}>Read more</Text>
              <Icon name="chevron-forward" size={14} color={C.rose} />
            </TouchableOpacity>
          </Card>
        )}
        
        {/* Weekly Affirmation Card */}
        {weeklyContent?.affirmation && (
          <Card style={[styles.weeklyCard, styles.affirmationCard]}>
            <Text style={styles.kickerRose}>Weekly Affirmation</Text>
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
                    <View style={styles.actionRequiredIcon}>
                      <Icon name="document-text" size={18} color={C.rose} />
                    </View>
                    <View style={styles.actionRequiredContent}>
                      <Text style={styles.rowTitle}>Contract to sign</Text>
                      <Text style={styles.rowMeta}>From {contract.provider_name} · {contract.provider_role}</Text>
                    </View>
                    <Icon name="chevron-forward" size={14} color={C.chev} />
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
                    <View style={styles.actionRequiredIcon}>
                      <Icon name="receipt" size={18} color={C.rose} />
                    </View>
                    <View style={styles.actionRequiredContent}>
                      <Text style={styles.rowTitle}>Invoice — ${invoice.amount}</Text>
                      <Text style={styles.rowMeta}>
                        From {invoice.provider_name}
                        {invoice.due_date ? ` · Due ${new Date(invoice.due_date).toLocaleDateString()}` : ''}
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={14} color={C.chev} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Recently Paid ✓ — closure after a provider marks an invoice paid.
            Auto-expires 5 days after paid_at; mom can dismiss early. */}
        {recentlyPaid.filter((inv) => !dismissedPaid.has(inv.invoice_id)).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recently paid ✓</Text>
            {recentlyPaid
              .filter((inv) => !dismissedPaid.has(inv.invoice_id))
              .map((invoice) => (
                <Card key={invoice.invoice_id} style={styles.recentlyPaidCard}>
                  <View style={styles.actionRequiredHeader}>
                    <View style={[styles.actionRequiredIcon, styles.iconChipSage]}>
                      <Icon name="checkmark-circle" size={18} color={C.sage} />
                    </View>
                    <View style={styles.actionRequiredContent}>
                      <Text style={styles.rowTitle}>Invoice paid — ${invoice.amount}</Text>
                      <Text style={styles.rowMeta}>
                        From {invoice.provider_name} · {new Date(invoice.paid_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => dismissRecentlyPaid(invoice.invoice_id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Dismiss paid invoice of $${invoice.amount}`}
                    >
                      <Icon name="close-circle-outline" size={22} color={colors.textLight} />
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
          </>
        )}

        {/* Key Actions — approved .acts grid */}
        <Text style={styles.sectionTitle}>Key Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/timeline')}
            activeOpacity={0.8}
          >
            <View style={styles.iconChipLav}>
              <Icon name="calendar" size={18} color={C.lavender} />
            </View>
            <Text style={styles.actionTitle}>Timeline</Text>
            <Text style={styles.actionSubtitle}>
              {timeline?.current_week ? `${timeline.current_week} weeks ${timeline.current_day ?? 0} days` : 'Track progress'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/wellness')}
            activeOpacity={0.8}
          >
            <View style={styles.iconChipSage}>
              <Icon name="heart" size={18} color={C.sage} />
            </View>
            <Text style={styles.actionTitle}>Wellness</Text>
            <Text style={styles.actionSubtitle}>How are you feeling today?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(mom)/appointments')}
            activeOpacity={0.8}
            data-testid="key-action-schedule-provider"
          >
            <View style={styles.iconChipRose}>
              <Icon name="calendar-outline" size={18} color={C.rose} />
            </View>
            <Text style={styles.actionTitle}>Schedule</Text>
            <Text style={styles.actionSubtitle}>With your provider</Text>
          </TouchableOpacity>
        </View>
        
        {/* Research Feed — Birth & Baby Reads */}
        <MomFeedSection />
      </ScrollView>
    </SafeAreaView>
    </ErrorBoundary>
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
  bandWrap: {
    marginHorizontal: -SIZES.md, // bleed to screen edges
  },
  header: {
    // rows sit on the band's veil; padding-top set inline from safe-area insets
    paddingBottom: 4,
    marginBottom: SIZES.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overline: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.ink,
  },
  greeting: {
    fontSize: 26,
    lineHeight: 29,
    fontFamily: F.serif,
    color: C.ink,
    marginTop: 4,
  },
  greetingAccent: {
    color: C.roseSoft,
  },
  weekText: {
    fontSize: 12.5,
    fontFamily: F.ui,
    color: C.gray,
    marginTop: 4,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.lavenderBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarInitials: {
    fontSize: 14,
    fontFamily: F.uiBold,
    color: C.lavender,
  },
  mainCard: {
    marginBottom: SIZES.md,
    padding: SIZES.md,
  },
  kickerRose: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.rose,
    marginBottom: 4,
  },
  kickerSage: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.sage,
  },
  cardKickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardKickerMeta: {
    fontSize: 11,
    fontFamily: F.ui,
    color: C.gray,
  },
  tipWeekChip: {
    fontSize: 9.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.sage,
    backgroundColor: C.sageBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  cardH3: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: F.serifSemi,
    color: C.ink,
  },
  linkRose: {
    fontSize: 12,
    fontFamily: F.uiBold,
    color: C.rose,
  },
  birthPlanTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.sm,
  },
  birthPlanTextGroup: {
    flex: 1,
  },
  birthPlanAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  cardTitle: {
    fontSize: 21,
    lineHeight: 24,
    fontFamily: F.serif,
    color: C.ink,
  },
  progressBar: {
    height: 7,
    backgroundColor: C.track,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 9,
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.lavenderSoft,
    borderRadius: 999,
  },
  nextStep: {
    fontSize: 11.5,
    fontFamily: F.ui,
    color: C.gray,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 24,
    fontFamily: F.serif,
    color: C.ink,
    marginBottom: SIZES.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
    marginBottom: SIZES.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingBottom: 11,
  },
  iconChipLav: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.lavenderBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  iconChipSage: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.sageBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  iconChipRose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  actionTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: F.serifSemi,
    color: C.ink,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 11,
    fontFamily: F.ui,
    color: C.gray,
  },
  // Weekly Tip & Affirmation — approved tipcard vocabulary
  weeklyCard: {
    marginBottom: 8,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  weeklyContent: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: F.ui,
    color: C.body,
    marginBottom: 8,
  },
  weeklyReadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  affirmationCard: {
    borderLeftWidth: 3,
    borderLeftColor: C.roseBorder,
  },
  affirmationContent: {
    fontSize: 16.5,
    lineHeight: 23,
    fontFamily: F.serifItalic,
    color: C.ink,
  },
  actionRequiredCard: {
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  actionRequiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionRequiredIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRequiredContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: F.uiSemi,
    color: C.ink,
  },
  rowMeta: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: F.ui,
    color: C.gray,
    marginTop: 3,
  },
  recentlyPaidCard: {
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  // Error State Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },
  errorTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginTop: SIZES.md,
  },
  errorMessage: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
    paddingHorizontal: SIZES.lg,
  },
  errorCard: {
    marginBottom: SIZES.md,
    padding: SIZES.md,
    alignItems: 'center',
  },
  errorText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  // Baby Development — approved devart watercolor card
  babyDevCard: {
    marginBottom: 8,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  babyDevImage: {
    width: '100%',
    height: 150,
    borderRadius: 14,
  },
  babyDevImageContainer: {
    marginBottom: 10,
  },
  babyDevImagePlaceholder: {
    height: 150,
    borderRadius: 14,
    backgroundColor: C.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  babyDevSizeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.sageBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 6,
  },
  babyDevSizeBadgeText: {
    fontSize: 9.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.sage,
  },
  babyDevDescription: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: F.ui,
    color: C.body,
    marginBottom: 8,
  },
}));
