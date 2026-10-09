import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TIcon from '../../src/components/TIcon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import MomFeedSection from '../../src/components/provider/MomFeedSection';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, BRAND } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { getBabyDevData } from '../../src/constants/babyDevelopmentData';
import { getPregnancyIllustration, hasPregnancyIllustration } from '../../src/constants/pregnancyIllustrations';
import { C, F, useCorpus } from '../../src/constants/corpus';
// Kick Counter entry (10/05 Key Actions 4th card) + local kick-session log.
import { loadSessions, totalsFrom, type KickSession } from '../../src/utils/kickStorage';
// Week-spine mockup v4 additions (Jeff-approved). The birth-plan ring renders
// with react-native-svg circle strokes — svg is already a project dependency
// (contraction-timer.tsx, GrowthSprig, HBand); strokeDasharray reproduces the
// mockup's .ring .arc / .arc2 CSS verbatim.
import Svg, { Circle, Path } from 'react-native-svg';

/* Benchmark #2 — BABY/MOM/BIRTH segmented tabs (approved v4 mockup .seg L169) */
type AudienceTab = 'baby' | 'mom' | 'birth';

const AUDIENCE_TABS: { value: AudienceTab; label: string; a11yLabel: string }[] = [
  { value: 'baby', label: 'For baby', a11yLabel: 'For baby' },
  { value: 'mom', label: 'For mom', a11yLabel: 'For mom' },
  { value: 'birth', label: 'For birth', a11yLabel: 'For birth' },
];

interface PendingContract {
  contract_id: string;
  provider_name: string;
  provider_role: string;
  /* Jeff 10/02 avatar pass: /mom/contracts now enriches provider_picture */
  provider_picture?: string | null;
  status: string;
  created_at: string;
}

interface PendingInvoice {
  invoice_id: string;
  provider_name: string;
  /* Jeff 10/02 avatar pass: /mom/invoices now enriches provider_picture */
  provider_picture?: string | null;
  amount: number;
  status: string;
  due_date?: string;
}

interface RecentlyPaidInvoice {
  invoice_id: string;
  provider_name: string;
  /* Jeff 10/02 avatar pass: /mom/invoices now enriches provider_picture */
  provider_picture?: string | null;
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
  /* Benchmark #2 — BABY/MOM/BIRTH segmented tabs (approved v4 mockup .seg, L169).
     Local-only filter: none of the fetches change. Default 'baby' (mockup shows
     'mom' active, but first-open defaults to the baby-dev card so the screen
     always opens with content above the fold). */
  const [audienceTab, setAudienceTab] = useState<AudienceTab>('baby');
  
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

  // ================= Week-spine additions (mockup v4, Jeff-approved) =================
  // Anchor week for the stepper: the selected chip, defaulting to the live week.
  // Local state only — tapping a chip re-points the Baby Development card data.
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const corpus = useCorpus();

  // Due-date countdown: /timeline returns due_date (care_plans.py get_timeline —
  // due_date_str echoed verbatim). If the API can't provide it (no onboarding),
  // the card renders nothing instead of a placeholder.
  const daysToGo = (() => {
    const due = timeline?.due_date ? new Date(`${timeline.due_date}T00:00:00`) : null;
    if (!due || Number.isNaN(due.getTime())) return null;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((due.getTime() - startOfToday.getTime()) / 86400000);
  })();
  const dueLabel = (() => {
    if (daysToGo === null) return null;
    if (daysToGo > 0) return `${daysToGo} days to go · due ${new Date(`${timeline.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    if (daysToGo === 0) return 'Due today';
    return null; // past the due date → postpartum, the chip reads as clutter
  })();

  // Stepper window: ±3 chips around the anchor week, clamped to 1..42,
  // with the inner range narrowed when the anchor sits near an edge.
  const anchorWeek = selectedWeek ?? (weekNum >= 1 && weekNum <= 42 ? weekNum : 0);
  const weeksToShow: number[] = anchorWeek >= 1
    ? Array.from({ length: 7 }, (_, i) => {
        const rawStart = anchorWeek - 3;
        const clampedStart = Math.max(1, Math.min(rawStart, 42 - 6));
        return clampedStart + i;
      })
    : [];
  const babyWeek = (selectedWeek ?? weekNum) || 0;
  // ====================================================================================

  // Kick Counter — key-action card subtitle from the device-local session log
  // ('N today' with data, 'Start counting' when zero).
  const [kickTotals, setKickTotals] = useState({ sessionCount: 0, kickCount: 0, lastSessionISO: null as string | null });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessions: KickSession[] = await loadSessions();
      if (!cancelled) setKickTotals(totalsFrom(sessions));
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  
  return (
    <ErrorBoundary
      fallback={
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={styles.errorContainer}>
            <TIcon name="status_todo" size={48} color={C.grayLight} />
            <Text style={styles.errorTitle}>Unable to Load Home</Text>
            <Text style={styles.errorMessage}>
              Something went wrong. Pull down to refresh or try again later.
            </Text>
            <Button
              title="Try Again"
              onPress={fetchData}
              style={{ marginTop: SIZES.md }}
              icon={<Text style={{ color: colors.white, fontSize: 17, fontWeight: '700' }}>↻</Text>}
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
            <TIcon name="status_todo" size={32} color={C.roseBorder} />
            <Text style={styles.errorText}>{loadError}</Text>
            <Button
              title="Retry"
              onPress={fetchData}
              style={{ marginTop: SIZES.sm }}
              icon={<Text style={{ color: colors.white, fontSize: 15, fontWeight: '600' }}>↻</Text>}
            />
          </Card>
        )}
        
        {/* Header — Jeff 2026-10-01: photo band removed; straight to week/day + greeting */}
        <View style={styles.header}>
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
          {/* Due-date chip — mockup .duechip (lavender pill, heart glyph).
              Hidden entirely when no due date is available. */}
          {dueLabel && (
            <View style={styles.dueChip}>
              <Svg width={14} height={13} viewBox="0 0 14 13">
                <Path
                  d="M7 11.5 C3.5 8.5 1.5 6.5 1.5 4.2 C1.5 2.5 2.9 1.3 4.4 1.3 C5.5 1.3 6.5 2 7 2.9 C7.5 2 8.5 1.3 9.6 1.3 C11.1 1.3 12.5 2.5 12.5 4.2 C12.5 6.5 10.5 8.5 7 11.5 Z"
                  fill="none"
                  stroke={corpus.dueChipInk}
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={styles.dueChipText}>{dueLabel}</Text>
            </View>
          )}
          {/* Week stepper — mockup .stepper: 7 chips (±3 around the anchor week),
              active chip = rose solid (.wk.active). Tapping a chip re-points the
              Baby Development card (local state only). */}
          {weeksToShow.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekStepper}
            >
              {weeksToShow.map((wk) => {
                const isActive = wk === anchorWeek;
                return (
                  <TouchableOpacity
                    key={wk}
                    onPress={() => setSelectedWeek(wk)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Show pregnancy week ${wk}`}
                    style={[
                      styles.weekChip,
                      isActive && styles.weekChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekChipText,
                        isActive && styles.weekChipTextActive,
                      ]}
                    >
                      {wk}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Benchmark #2 — segmented tabs between the content cards and the header
            (approved v4 mockup L169: .seg). Local filter only. */}
        <View style={styles.seg} accessibilityRole="tablist">
          {AUDIENCE_TABS.map((opt) => {
            const on = opt.value === audienceTab;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setAudienceTab(opt.value)}
                style={[styles.segBtn, on && styles.segBtnOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={opt.a11yLabel}
                testID={`home-tab-${opt.value}`}
              >
                <Text style={[styles.segText, on && styles.segTextOn]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB baby — Baby Development Card */}
        {audienceTab === 'baby' && (
        <>
        {/* Baby Development Card */}
        {(() => {
          // Determine the pregnancy week for baby development — the week-stepper
          // selection takes precedence (local state), else the live API week.
          // Ensure currentWeek is a number (API may return numeric string)
          const rawWeek = babyWeek || weeklyContent?.week;
          const currentWeek = typeof rawWeek === 'number' ? rawWeek : Number(rawWeek);
          const isPostpartum = weeklyContent?.is_postpartum;
          if (isPostpartum || !currentWeek || currentWeek < 4 || currentWeek > 40) return null;
          
          // Use local data first (offline-first), fall back to API data
          const localBabyDev = getBabyDevData(currentWeek);
          const apiBabyDev = weeklyContent?.baby_development;
          const apiDev = apiBabyDev && Number(apiBabyDev.week) === currentWeek ? apiBabyDev : undefined;
          const babyDev = apiDev || localBabyDev;

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
                    <TIcon name="status_todo" size={48} color={C.roseSoft} />
                  </View>
                )}
              </View>
              {/* Mockup .facts — Length · Weight · Size-of row in Cormorant
                  numerals, under the illustration. The project corpus carries
                  per-week sizeNote + food only (no length/weight data exists in
                  the app, the backend, or the website dataset), so Length shows
                  the approved sizeNote and Weight renders only if data ever
                  provides one. Illustration kept. */}
              {(() => {
                const sizeNote = babyDev.sizeNote ?? apiBabyDev?.size_note ?? null;
                const food = babyDev.food ?? apiBabyDev?.food ?? null;
                if (!sizeNote && !food) return null;
                return (
                  <View style={styles.babyFactsRow}>
                    {sizeNote ? (
                      <View style={styles.babyFactCell}>
                        <Text style={styles.babyFactValue}>{sizeNote}</Text>
                        <Text style={styles.babyFactLabel}>Length</Text>
                      </View>
                    ) : null}
                    {food ? (
                      <View style={styles.babyFactsDivider} />
                    ) : null}
                    {food ? (
                      <View style={styles.babyFactCell}>
                        <Text style={styles.babyFactValue} numberOfLines={1}>
                          {food}
                        </Text>
                        <Text style={styles.babyFactLabel}>Size of</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })()}
              <Text style={styles.cardH3}>{babyDev.title}</Text>
              <Text style={styles.babyDevDescription} numberOfLines={4}>
                {babyDev.description}
              </Text>
              <TouchableOpacity 
                style={styles.weeklyReadMore}
                onPress={() => router.push('/(mom)/weekly-tips')}
              >
                <Text style={styles.linkRose}>Learn more</Text>
                <Text style={{ fontSize: 16, color: C.rose, fontWeight: '300' }}>›</Text>
              </TouchableOpacity>
            </Card>
          );
        })()}
        </>
        )}

        {/* TAB mom — Weekly Tip + Weekly Affirmation (v4 mockup mid-state) */}
        {audienceTab === 'mom' && (
        <>
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
              <Text style={{ fontSize: 16, color: C.rose, fontWeight: '300' }}>›</Text>
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
        </>
        )}

        {/* TAB birth — Birth Plan ring card (moved below the tabs, unchanged card)
            or the quiet empty state when no plan data exists yet */}
        {audienceTab === 'birth' && (
          birthPlan?.completion_percentage != null ? (
            <TouchableOpacity
              onPress={() => router.push('/(mom)/birth-plan')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Open your Joyful Birth Plan"
            >
              <Card style={styles.mainCard}>
                {/* Birth-plan row — mockup v4: ring centered-left with the chevron
                    kept flush-right; text group flexes between them. */}
                <View style={styles.birthPlanTopRow}>
                  <View style={styles.birthPlanRingWrap}>
                    <Svg width={56} height={56} viewBox="0 0 56 56">
                      {/* Track — .ring .track #F0E6E2, w5, round caps */}
                      <Circle
                        cx={28}
                        cy={28}
                        r={25}
                        stroke={C.ringTrack}
                        strokeWidth={5}
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Arc — .ring .arc #C48CA8, w5; dasharray length = pct of the
                          full circumference (2πr ≈ 157; mockup full arc 150/157) */}
                      <Circle
                        cx={28}
                        cy={28}
                        r={25}
                        stroke={C.ringArc}
                        strokeWidth={5}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${(157 * (birthPlan?.completion_percentage || 0)) / 100} 157`}
                        // .ring { svg { transform:rotate(-90deg) } }
                        rotation="-90"
                        originX={28}
                        originY={28}
                      />
                      {/* Dashed halo — .ring .arc2 #D8A0C4, w2.2, 11-7 dash, 55% opacity */}
                      <Circle
                        cx={28}
                        cy={28}
                        r={25}
                        stroke={C.ringArcDashed}
                        strokeWidth={2.2}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="11 7"
                        opacity={0.55}
                      />
                    </Svg>
                    {/* .ring .pct — centered, Cormorant 700 16px, ink token */}
                    <View pointerEvents="none" style={styles.ringPctWrap}>
                      <Text style={styles.ringPctText}>
                        {Math.round(birthPlan?.completion_percentage || 0)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.birthPlanTextGroup}>
                    <Text style={styles.kickerRose}>BIRTH PLAN</Text>
                    <Text style={styles.cardTitle}>Joyful Birth Plan</Text>
                    <Text style={styles.nextStep} numberOfLines={1}>
                      Next: {getNextStep()}
                    </Text>
                  </View>
                  <View style={styles.birthPlanAction}>
                    <Text style={{ fontSize: 20, color: C.chev, fontWeight: '300' }}>›</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ) : (
            <Card style={styles.mainCard}>
              <Text style={styles.kickerRose}>BIRTH PLAN</Text>
              <Text style={styles.cardTitle}>Joyful Birth Plan</Text>
              <Text style={styles.segEmptyText}>
                Your birth plan starts with you — complete onboarding or open Birth
                Plan from the tab bar.
              </Text>
              <TouchableOpacity
                style={styles.segEmptyPill}
                onPress={() => router.push('/(mom)/birth-plan')}
                accessibilityRole="button"
                accessibilityLabel="Open Birth Plan"
              >
                <Text style={styles.segEmptyPillText}>Open Birth Plan</Text>
              </TouchableOpacity>
            </Card>
          )
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
                testID={`pending-contract-${contract.contract_id}`}
              >
                <Card style={styles.actionRequiredCard}>
                  <View style={styles.actionRequiredHeader}>
                    <View style={styles.actionRequiredIcon}>
                      {/* Jeff 10/02 avatar pass: provider photo when available */}
                      {contract.provider_picture ? (
                        <Image source={{ uri: contract.provider_picture }} style={styles.actionRequiredPhoto} />
                      ) : (
                        <TIcon name="ar_contract" size={18} color={C.rose} />
                      )}
                    </View>
                    <View style={styles.actionRequiredContent}>
                      <Text style={styles.rowTitle}>Contract to sign</Text>
                      <Text style={styles.rowMeta}>From {contract.provider_name} · {contract.provider_role}</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: C.chev, fontWeight: '300' }}>›</Text>
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
                      {/* Jeff 10/02 avatar pass: provider photo when available */}
                      {invoice.provider_picture ? (
                        <Image source={{ uri: invoice.provider_picture }} style={styles.actionRequiredPhoto} />
                      ) : (
                        <TIcon name="ar_invoice" size={18} color={C.rose} />
                      )}
                    </View>
                    <View style={styles.actionRequiredContent}>
                      <Text style={styles.rowTitle}>Invoice — ${invoice.amount}</Text>
                      <Text style={styles.rowMeta}>
                        From {invoice.provider_name}
                        {invoice.due_date ? ` · Due ${new Date(invoice.due_date).toLocaleDateString()}` : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, color: C.chev, fontWeight: '300' }}>›</Text>
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
                      {/* Jeff 10/02 avatar pass: provider photo when available */}
                      {invoice.provider_picture ? (
                        <Image source={{ uri: invoice.provider_picture }} style={styles.actionRequiredPhoto} />
                      ) : (
                        <TIcon name="ar_invoice_paid" size={18} color={C.sage} />
                      )}
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
                      <Text style={{ fontSize: 22, color: C.grayLight, fontWeight: '300' }}>×</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
          </>
        )}

        {/* Key Actions — approved .acts grid. 10/05: 4th card 'Count Kicks'.
            4 cards at flex:1 on 390px leaves ~54px of text width per card —
            'With your provider' truncates to 'With your…' at 11px, so the grid
            reads 2×2 (flexWrap, ~48% basis; ~142px per card, mockup's own
            preference for 4 items). Existing onTap handlers preserved. */}
        <Text style={styles.sectionTitle}>Key Actions</Text>
        <View style={[styles.actionsGrid, styles.actionsGridWrap]}>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardWrap]}
            onPress={() => router.push('/(mom)/timeline')}
            activeOpacity={0.8}
          >
            <View style={styles.iconChipLav}>
              <TIcon name="k_timeline" size={18} color={C.lavender} />
            </View>
            <Text style={styles.actionTitle}>Timeline</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>
              {timeline?.current_week ? `${timeline.current_week} weeks ${timeline.current_day ?? 0} days` : 'Track progress'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardWrap]}
            onPress={() => router.push('/(mom)/wellness')}
            activeOpacity={0.8}
          >
            <View style={styles.iconChipSage}>
              {/* heart-form glyph from the approved set (10/01: plain status ring read as 'just a circle') */}
              <TIcon name="labor_delivery" size={18} color={C.sage} />
            </View>
            <Text style={styles.actionTitle}>Wellness</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>
              How are you feeling today?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardWrap]}
            onPress={() => router.push('/(mom)/appointments')}
            activeOpacity={0.8}
            data-testid="key-action-schedule-provider"
          >
            <View style={styles.iconChipRose}>
              <TIcon name="bell" size={18} color={C.rose} />
            </View>
            <Text style={styles.actionTitle}>Schedule</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>
              With your provider
            </Text>
          </TouchableOpacity>

          {/* 4th card — Count Kicks (sage iconChip variant, per approved mockup) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardWrap]}
            onPress={() => router.push('/(mom)/kick-counter')}
            activeOpacity={0.8}
            testID="key-action-count-kicks"
            data-testid="key-action-count-kicks"
          >
            <View style={styles.iconChipSage}>
              <TIcon name="k_kick" size={18} color={C.sage} />
            </View>
            <Text style={styles.actionTitle}>Count Kicks</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>
              {kickTotals.kickCount > 0
                ? `${kickTotals.kickCount} today`
                : 'Start counting'}
            </Text>
          </TouchableOpacity>

          {/* Full-width Contraction Timer strip — gated to week 34+ (call-B rec:
              prominent labor tool from ~week 34; invisible before to keep Home calm) */}
          {weekNum >= 34 && (
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardFull]}
              onPress={() => router.push('/(mom)/contraction-timer')}
              activeOpacity={0.8}
              testID="key-action-contraction-timer"
              data-testid="key-action-contraction-timer"
            >
              <View style={styles.iconChipLav}>
                <TIcon name="timer" size={18} color={C.lavender} />
              </View>
              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>Contraction Timer</Text>
                <Text style={styles.actionSubtitle} numberOfLines={1}>
                  Start timing contractions
                </Text>
              </View>
            </TouchableOpacity>
          )}
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
  header: {
    // padding-top set inline from safe-area insets (band removed 10/01)
    paddingHorizontal: 20, // Jeff-approved edge padding (matches S12 header)
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
    fontSize: 11,
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
    marginBottom: SIZES.sm, // 10/01: lg(24)+feed mt(24) stacked to 48px dead gap; sm reads right
  },
  // 10/05 — 4-card 2×2 variant: wrap + ~48% basis so each card gets ~142px of
  // text width (3-in-row at flex:1 leaves ~54px — 'With your provider' truncates).
  actionsGridWrap: {
    flexWrap: 'wrap',
    rowGap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingBottom: 11,
  },
  // Basis override for the wrapped 2×2 grid: 48% minus half the 10px gutter.
  actionCardWrap: {
    flex: 0,
    flexBasis: '48%',
  },
  // Full-width variant (contraction-timer strip, week 34+): icon left, text block right.
  actionCardFull: {
    flexBasis: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  actionTextBlock: {
    flex: 1,
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
    fontSize: 13.5,
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
  /* —— Benchmark #2 segmented tabs (.seg, approved v4 mockup L169) ——
     Construction copied verbatim from kick-counter.tsx's approved .seg styles:
     bg #F1E9F5 (lavenderBg role), rounded-full, padding 4; items flex-1,
     12.5px w600 #74716A padding 7; ACTIVE = white bg + lavenderSoft text +
     tiny shadow. All colors via corpus C → Proxy-flips dark-aware. */
  seg: {
    flexDirection: 'row',
    backgroundColor: C.lavenderBg, // mockup .seg pill-bg role
    borderRadius: 999,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 14, // mockup .seg margin-top:14px
  },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 999,
  },
  segBtnOn: {
    backgroundColor: C.surface,
    // .seg .on box-shadow -> RN shadow surrogate
    shadowColor: C.lavender,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segText: {
    fontSize: 12.5, // mockup .seg div 12.5px
    fontFamily: F.uiSemi,
    color: C.gray,
  },
  segTextOn: {
    fontFamily: F.uiBold,
    color: C.lavenderSoft, // .seg .on color #8E8CB5
  },
  // QUIET EMPTY STATE (tab 'birth', no plan data) — card + lavender pill
  segEmptyText: {
    fontFamily: F.ui,
    fontSize: 13.5,
    lineHeight: 21,
    color: C.body,
    marginTop: 6,
    marginBottom: 12,
  },
  segEmptyPill: {
    alignSelf: 'flex-start',
    backgroundColor: C.lavender,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  segEmptyPillText: {
    fontFamily: F.uiBold,
    fontSize: 13.5,
    color: C.surface,
  },
  affirmationCard: {},
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
    overflow: 'hidden' as const,
  },
  /* Jeff 10/02 avatar pass: real provider photo on home action cards */
  actionRequiredPhoto: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  actionRequiredContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 11,
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
    fontFamily: F.serifSemi,
    color: colors.text,
    marginTop: SIZES.md,
  },
  errorMessage: {
    fontSize: SIZES.fontSm,
    fontFamily: F.ui,
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
    fontFamily: F.ui,
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
  babyDevDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: F.ui,
    color: C.body,
    marginBottom: 8,
  },
  // ---- Week-spine mockup v4 (CSS .stepper / .wk / .duechip / .ring / .facts) ----
  // Week stepper strip — .stepper { display:flex; gap:8px; margin-top:14px }
  weekStepper: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    alignItems: 'center',
  },
  // .wk — 2px #E5DCD5 border, r999, 8px×2px padding, transparent bg, #858585 text
  weekChip: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.wkChipBorder,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 34,
    alignItems: 'center',
  },
  // .wk.active — solid #D8A0C4, border #C48CA8, text #4B2E42
  weekChipActive: {
    backgroundColor: C.wkActiveBg,
    borderColor: C.wkActiveBorder,
  },
  weekChipText: {
    fontSize: 11,
    fontFamily: F.uiReg,
    color: C.gray,
  },
  weekChipTextActive: {
    fontFamily: F.uiBold,
    color: C.wkActiveInk,
  },
  // .duechip — lavender pill with heart glyph; no hex in mockup CSS (web default
  // lavender family) → light #5A5885 text / stroke #6E6C99, dark #9796B9
  dueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.lavenderBorder,
    backgroundColor: C.lavenderBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dueChipText: {
    fontSize: 11,
    fontFamily: F.uiSemi,
    color: C.dueChipInk,
  },
  // Birth-plan double-stroke ring row — .ring { width:56px; height:56px }
  birthPlanRingWrap: {
    width: 56,
    height: 56,
    flexShrink: 0,
  },
  // .ring .pct — centered, Cormorant 700 16px, #2D2D2D → ink token
  ringPctWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPctText: {
    fontFamily: F.serif,
    fontSize: 17,
    color: C.ink,
  },
  // .facts — 12px caps #A3908B labels, 21px Cormorant #4B4B4B numerals,
  // 1px #E8DCD8 separators, centered cells
  babyFactsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  babyFactCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  babyFactsDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: C.factDivider,
    marginVertical: 3,
  },
  babyFactValue: {
    fontSize: 21,
    lineHeight: 25,
    fontFamily: F.serifSemi,
    color: C.body,
    textAlign: 'center',
  },
  babyFactLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: F.uiSemi,
    color: C.factLabel,
    marginTop: 3,
    textAlign: 'center',
  },
}));
