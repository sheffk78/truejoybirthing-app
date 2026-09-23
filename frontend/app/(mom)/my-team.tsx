import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import HBand from '../../src/components/mom/HBand';
import TIcon from '../../src/components/TIcon';
import { C, F, BAND_MY_TEAM , type Corpus, type LiveCorpus } from '../../src/constants/corpus';

// S8 My Team — approved hband mockup (s7s8s9-mom-core-hbands.html).
// Overline "Your Circle" / Cormorant H1 "Your Care Team" / sub. Sections:
// "Your people" (avatar initials rows + role chips + status), "Shared with your
// team" (birth plan row, ar_contract glyph), footer CTA "Find Providers".
// All existing data flows kept: MOM_TEAM + BIRTH_PLAN_SHARE_REQUESTS, revoke,
// quick actions (Message/Schedule/Profile), empty state, find-providers.
// Colors from designRefresh C.* only. Icons TIcon only.

interface TeamMemberResponse {
  provider: {
    user_id: string;
    full_name: string;
    email: string;
    role: string;
    picture?: string;
  };
  profile?: any;
  share_request?: any;
  client_record?: any;
  lead_record?: any;
  relationship_type: string;
  connection_status: string;
}

interface ShareRequest {
  request_id: string;
  provider_id: string;
  provider_name: string;
  provider_role: string;
  provider_picture?: string;
  status: string;
  created_at: string;
}

interface RowMember {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_role: string;
  provider_picture?: string;
  relationship_type: string;
  connection_status: string;
  profile?: any;
  share_request?: any;
  source: string;
}

const ROLE_LABEL: Record<string, string> = {
  MIDWIFE: 'Midwife',
  DOULA: 'Doula',
  LACTATION: 'Lactation',
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

// Avatar tint rotates rose → default lavender → sage (mockup order).
const avatarTint = (i: number) => {
  const tints = [
    { bg: C.roseSoft, fg: C.rose },
    { bg: C.lavenderSoft, fg: C.lavender },
    { bg: C.sageBg, fg: C.sage },
  ];
  return tints[i % tints.length];
};

export default function MyTeamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = getMyTeamStyles(C);
  const [teamMembers, setTeamMembers] = useState<TeamMemberResponse[]>([]);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [planMeta, setPlanMeta] = useState<{ done: number; total: number } | null>(null);

  const fetchData = async () => {
    try {
      const [teamData, requestsData, planData] = await Promise.all([
        apiRequest(API_ENDPOINTS.MOM_TEAM),
        apiRequest(API_ENDPOINTS.BIRTH_PLAN_SHARE_REQUESTS),
        apiRequest(API_ENDPOINTS.BIRTH_PLAN).catch(() => null),
      ]);
      setTeamMembers(teamData || []);
      setShareRequests(requestsData.requests || []);
      if (planData?.sections) {
        const done = planData.sections.filter((s: any) => s.status === 'Complete').length;
        setPlanMeta({ done, total: planData.sections.length });
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
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

  const revokeAccess = async (requestId: string, providerName: string) => {
    Alert.alert(
      'Remove from Team',
      `Are you sure you want to remove ${providerName} from your care team? They will no longer have access to your birth plan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.BIRTH_PLAN_SHARE}/${requestId}`, {
                method: 'DELETE',
              });
              Alert.alert('Success', `${providerName} has been removed from your team.`);
              await fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove team member');
            }
          },
        },
      ]
    );
  };

  const pendingProviders = shareRequests.filter((r) => r.status === 'pending');

  // Combine team members with accepted share requests, avoiding duplicates
  const seenProviderIds = new Set<string>();
  const allTeamProviders: RowMember[] = [];

  teamMembers.forEach((member) => {
    if (member.provider && !seenProviderIds.has(member.provider.user_id)) {
      seenProviderIds.add(member.provider.user_id);
      allTeamProviders.push({
        id: member.provider.user_id,
        provider_id: member.provider.user_id,
        provider_name: member.provider.full_name,
        provider_role: member.provider.role,
        provider_picture: member.provider.picture,
        relationship_type: member.relationship_type,
        connection_status: member.connection_status,
        profile: member.profile,
        share_request: member.share_request,
        source: 'team_api',
      });
    }
  });

  shareRequests
    .filter((r) => r.status === 'accepted')
    .forEach((request) => {
      if (!seenProviderIds.has(request.provider_id)) {
        seenProviderIds.add(request.provider_id);
        allTeamProviders.push({
          id: request.request_id,
          provider_id: request.provider_id,
          provider_name: request.provider_name,
          provider_role: request.provider_role,
          provider_picture: request.provider_picture,
          relationship_type: 'birth_plan_shared',
          connection_status: 'Active',
          share_request: request,
          source: 'share_request',
        });
      }
    });

  const activeCount = allTeamProviders.length;
  const peopleSub =
    activeCount === 1
      ? '1 team member connected'
      : `${activeCount} team members connected`;
  const sharedNames = allTeamProviders
    .slice(0, 2)
    .map((m) => m.provider_name.split(/\s+/)[0])
    .join(' + ');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lavender} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HBand source={BAND_MY_TEAM} height={168 + insets.top} focus="50% 30%" />

        <View style={styles.mhead}>
          <Text style={styles.overline}>Your Circle</Text>
          <Text style={styles.h1}>
            <Text style={styles.h1em}>Your</Text> Care Team
          </Text>
          <Text style={styles.msub}>The people walking this chapter with you</Text>
        </View>

        {/* Your people */}
        <View style={styles.sect}>
          <Text style={styles.h2}>Your people</Text>
          <Text style={styles.sub}>{peopleSub}</Text>

          {allTeamProviders.length === 0 && pendingProviders.length === 0 && (
            <View style={[styles.srow, styles.srowEmpty]} data-testid="find-providers-btn">
              <Text style={styles.srowEmptyText}>
                No team members yet — tap "Find Providers" below to meet doulas and midwives near you.
              </Text>
            </View>
          )}

          {allTeamProviders.map((member, idx) => {
            const tint = avatarTint(idx);
            const roleLabel = ROLE_LABEL[member.provider_role] ?? member.provider_role;
            const connectedMeta =
              member.source === 'share_request' ? 'Birth plan shared' : 'Connected';
            return (
              <View key={member.id} style={styles.srow} data-testid={`team-member-${member.id}`}>
                {member.provider_picture ? (
                  <Image
                    source={{ uri: member.provider_picture }}
                    style={styles.avatImg}
                  />
                ) : (
                  <View style={[styles.avat, { backgroundColor: tint.bg }]}>
                    <Text style={[styles.avatTxt, { color: tint.fg }]}>
                      {initialsOf(member.provider_name)}
                    </Text>
                  </View>
                )}
                <View style={styles.smid}>
                  <Text style={styles.h3}>{member.provider_name}</Text>
                  <View style={styles.smetaRow}>
                    <View style={[styles.schip, styles.schipWip]}>
                      <Text style={[styles.schipTxt, styles.schipTxtWip]}>{roleLabel}</Text>
                    </View>
                    <Text style={styles.mmeta}>{connectedMeta}</Text>
                  </View>
                </View>
                <View style={[styles.schip, styles.schipDone]}>
                  <Text style={[styles.schipTxt, styles.schipTxtDone]}>Active</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Pending Invitations (mockup "Pending" state) */}
        {pendingProviders.length > 0 && (
          <View style={styles.sect}>
            <Text style={styles.h2}>Pending invites</Text>
            <Text style={styles.sub}>Waiting for your providers to accept</Text>
            {pendingProviders.map((request, idx) => {
              const tint = avatarTint(idx + 1);
              const roleLabel = ROLE_LABEL[request.provider_role] ?? request.provider_role;
              return (
                <View
                  key={request.request_id}
                  style={[styles.srow, styles.srowPending]}
                  data-testid={`pending-invite-${request.request_id}`}
                >
                  {request.provider_picture ? (
                    <Image
                      source={{ uri: request.provider_picture }}
                      style={[styles.avatImg, { opacity: 0.7 }]}
                    />
                  ) : (
                    <View style={[styles.avat, { backgroundColor: tint.bg }]}>
                      <Text style={[styles.avatTxt, { color: tint.fg }]}>
                        {initialsOf(request.provider_name)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.smid}>
                    <Text style={styles.h3}>{request.provider_name}</Text>
                    <View style={styles.smetaRow}>
                      <View style={[styles.schip, styles.schipWip]}>
                        <Text style={[styles.schipTxt, styles.schipTxtWip]}>{roleLabel}</Text>
                      </View>
                      <Text style={styles.mmeta}>Awaiting your invite</Text>
                    </View>
                  </View>
                  <View style={[styles.schip, styles.schipTodo]}>
                    <Text style={[styles.schipTxt, styles.schipTxtTodo]}>Pending</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => revokeAccess(request.request_id, request.provider_name)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    data-testid={`cancel-btn-${request.request_id}`}
                  >
                    <Text style={styles.cancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Shared with your team */}
        {activeCount > 0 && (
          <View style={styles.sect}>
            <Text style={styles.h2}>Shared with your team</Text>
            <Text style={styles.sub}>They see updates the moment you finish a section</Text>
            <View style={styles.srow} data-testid="birth-plan-share-row">
              <View style={[styles.sico, styles.sicoSage]}>
                <TIcon name="birthplan" size={22} color={C.sage} strokeWidth={1.7} />
              </View>
              <View style={styles.smid}>
                <Text style={styles.h3}>Birth plan</Text>
                <View style={styles.smetaRow}>
                  <Text style={styles.mmeta}>
                    {planMeta
                      ? `${planMeta.done} of ${planMeta.total} sections · visible to ${sharedNames}`
                      : `Visible to ${sharedNames}`}
                  </Text>
                </View>
              </View>
              <View style={[styles.schip, styles.schipDone]}>
                <Text style={[styles.schipTxt, styles.schipTxtDone]}>Sharing</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer CTA (.dl .abtn .hint) */}
        <View style={styles.dl}>
          <TouchableOpacity
            style={styles.abtn}
            onPress={() => router.push('/marketplace')}
            activeOpacity={0.85}
            data-testid="browse-marketplace-btn"
          >
            <Text style={styles.abtnTxt}>Find Providers</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Doulas, midwives, and other birthing professionals near you
          </Text>
        </View>

        <View style={{ height: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getMyTeamStyles = (c: LiveCorpus) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.cream },
  scrollContent: { paddingBottom: 48 },

  // —— m-head (common.css) ——
  mhead: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  overline: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: C.rose,
    marginBottom: 5,
  },
  h1: { fontFamily: F.serif, fontWeight: '700', fontSize: 26, lineHeight: 30, color: C.ink },
  h1em: { fontFamily: F.serif, fontWeight: '700', color: C.roseSoft },
  msub: { fontSize: 12.5, color: C.gray, marginTop: 4, fontWeight: '500' },

  // —— sect ——
  sect: { paddingHorizontal: 20, marginTop: 14 },
  h2: { fontFamily: F.serif, fontWeight: '700', fontSize: 21, color: C.ink, marginBottom: 2 },
  sub: { fontSize: 11.5, color: C.gray, marginBottom: 8, fontWeight: '500' },

  // —— srow ——
  srow: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  srowEmpty: { backgroundColor: C.cardBg },
  srowPending: { backgroundColor: C.cardBg, borderStyle: 'dashed' },
  srowEmptyText: { fontSize: 12, color: C.gray, fontWeight: '500', lineHeight: 17 },

  // —— avat ——
  avat: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatImg: { width: 38, height: 38, borderRadius: 19, flexShrink: 0 },
  avatTxt: { fontSize: 14, fontWeight: '700' },

  smid: { flex: 1, minWidth: 0 },
  h3: { fontFamily: F.serif, fontWeight: '600', fontSize: 17, color: C.ink },
  smetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  mmeta: { fontSize: 11, color: C.gray, fontWeight: '500', flexShrink: 1 },

  // —— schip ——
  schip: {
    fontSize: 9.5,
    letterSpacing: 0.6,
    fontWeight: '700',
    textTransform: 'uppercase',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  schipTxt: { fontSize: 9.5, letterSpacing: 0.6, fontWeight: '700', textTransform: 'uppercase', translateY: -0.5 },
  schipDone: { backgroundColor: C.sageBg },
  schipTxtDone: { color: C.sage },
  schipWip: { backgroundColor: C.lavenderSoft },
  schipTxtWip: { color: C.lavender },
  schipTodo: { backgroundColor: C.track },
  schipTxtTodo: { color: C.grayLight },

  cancelTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: C.rose,
    paddingHorizontal: 6,
  },

  // —— sico ——
  sico: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sicoSage: { backgroundColor: C.sageBg },

  // —— footer CTA (.dl .abtn .hint) ——
  dl: { paddingHorizontal: 20, marginTop: 16, marginBottom: 6 },
  abtn: {
    backgroundColor: C.lavender,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  abtnTxt: { color: C.white, fontSize: 13, fontWeight: '600' },
  hint: { textAlign: 'center', fontSize: 11, color: C.gray, marginTop: 7, fontWeight: '500' },
});