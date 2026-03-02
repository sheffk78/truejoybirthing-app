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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

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

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  picture?: string;
  profile?: any;
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

export default function MyTeamScreen() {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMemberResponse[]>([]);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [teamData, requestsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.MOM_TEAM),
        apiRequest(API_ENDPOINTS.BIRTH_PLAN_SHARE_REQUESTS),
      ]);
      console.log('Team data received:', JSON.stringify(teamData));
      console.log('Share requests received:', JSON.stringify(requestsData));
      setTeamMembers(teamData || []);
      setShareRequests(requestsData.requests || []);
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

  const getProviderIcon = (role: string) => {
    return role === 'DOULA' ? 'people' : 'medkit';
  };

  const getRelationshipLabel = (type: string) => {
    switch(type) {
      case 'active_client': return 'Active Client';
      case 'converted_lead': return 'Active Client';
      case 'birth_plan_shared': return 'Birth Plan Shared';
      default: return 'Connected';
    }
  };

  const pendingProviders = shareRequests.filter(r => r.status === 'pending');
  
  // Combine team members with accepted share requests, avoiding duplicates
  const seenProviderIds = new Set<string>();
  const allTeamProviders: any[] = [];
  
  // First add team members from the API (clients, converted leads)
  teamMembers.forEach(member => {
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
        source: 'team_api'
      });
    }
  });
  
  // Then add accepted share requests not already in the list
  const acceptedProviders = shareRequests.filter(r => r.status === 'accepted');
  acceptedProviders.forEach(request => {
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
        source: 'share_request'
      });
    }
  });

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
        <Text style={styles.title}>My Care Team</Text>
        <Text style={styles.subtitle}>
          Complete your birth plan before inviting your care team. Doulas and midwives will first see key details to consider working together, then your full plan after you approve them.
        </Text>

        {/* Browse Marketplace Button */}
        <TouchableOpacity
          style={styles.marketplaceButton}
          onPress={() => router.push('/marketplace')}
          data-testid="browse-marketplace-btn"
        >
          <Icon name="search" size={20} color={COLORS.white} />
          <Text style={styles.marketplaceButtonText}>Browse Provider Marketplace</Text>
          <Icon name="chevron-forward" size={16} color={COLORS.white} />
        </TouchableOpacity>

        {/* Birth Team Summary */}
        {allTeamProviders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Birth Team</Text>
            <Text style={styles.sectionSubtitle}>
              Your care providers who are helping you on your birthing journey
            </Text>
            {allTeamProviders.map((member) => (
              <Card key={member.id} style={styles.teamCard}>
                {/* Provider Header */}
                <View style={styles.teamRow}>
                  {member.provider_picture ? (
                    <Image 
                      source={{ uri: member.provider_picture }} 
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Icon 
                        name={getProviderIcon(member.provider_role)} 
                        size={24} 
                        color={COLORS.white} 
                      />
                    </View>
                  )}
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{member.provider_name}</Text>
                    <View style={styles.roleRow}>
                      <View style={[
                        styles.roleBadge,
                        { backgroundColor: member.provider_role === 'DOULA' ? COLORS.primary + '20' : COLORS.success + '20' }
                      ]}>
                        <Text style={[
                          styles.roleText,
                          { color: member.provider_role === 'DOULA' ? COLORS.primary : COLORS.success }
                        ]}>
                          {member.provider_role}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: COLORS.success + '15' }]}>
                        <Text style={[styles.statusText, { color: COLORS.success }]}>
                          {getRelationshipLabel(member.relationship_type)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Provider Details */}
                {member.profile && (
                  <View style={styles.providerDetails}>
                    {/* Location & Experience */}
                    <View style={styles.detailsRow}>
                      {(member.profile.location_city || member.profile.location_state) && (
                        <View style={styles.detailItem}>
                          <Icon name="location-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.detailText}>
                            {[member.profile.location_city, member.profile.location_state].filter(Boolean).join(', ')}
                          </Text>
                        </View>
                      )}
                      {(member.profile.years_in_practice || member.profile.experience_years) && (
                        <View style={styles.detailItem}>
                          <Icon name="ribbon-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.detailText}>
                            {member.profile.years_in_practice || member.profile.experience_years} years experience
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bio snippet */}
                    {member.profile.bio && (
                      <Text style={styles.bioText} numberOfLines={2}>
                        {member.profile.bio}
                      </Text>
                    )}

                    {/* Services */}
                    {member.profile.services_offered && member.profile.services_offered.length > 0 && (
                      <View style={styles.servicesRow}>
                        {member.profile.services_offered.slice(0, 3).map((service: string, idx: number) => (
                          <View key={idx} style={styles.serviceTag}>
                            <Text style={styles.serviceTagText}>{service}</Text>
                          </View>
                        ))}
                        {member.profile.services_offered.length > 3 && (
                          <Text style={styles.moreServices}>
                            +{member.profile.services_offered.length - 3} more
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Birth Plan Access */}
                {member.share_request && (
                  <View style={styles.accessRow}>
                    <Icon name="document-text-outline" size={14} color={COLORS.success} />
                    <Text style={styles.accessText}>Has access to your birth plan</Text>
                  </View>
                )}

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => router.push(`/(mom)/messages?providerId=${member.provider_id}&providerName=${encodeURIComponent(member.provider_name)}`)}
                    data-testid={`message-btn-${member.id}`}
                  >
                    <Icon name="chatbubble-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.quickActionText}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => router.push(`/(mom)/appointments?providerId=${member.provider_id}&providerName=${encodeURIComponent(member.provider_name)}`)}
                    data-testid={`schedule-btn-${member.id}`}
                  >
                    <Icon name="calendar-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.quickActionText}>Schedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => router.push(`/provider-detail?providerId=${member.provider_id}`)}
                    data-testid={`profile-btn-${member.id}`}
                  >
                    <Icon name="person-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.quickActionText}>View Profile</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Pending Invitations */}
        {pendingProviders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Invitations</Text>
            <Text style={styles.sectionSubtitle}>
              Waiting for providers to accept your invitation
            </Text>
            {pendingProviders.map((request) => (
              <Card key={request.request_id} style={[styles.teamCard, styles.pendingCard]}>
                <View style={styles.teamRow}>
                  {request.provider_picture ? (
                    <Image 
                      source={{ uri: request.provider_picture }} 
                      style={[styles.avatarImage, { opacity: 0.7 }]}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.pendingAvatar]}>
                      <Icon 
                        name={getProviderIcon(request.provider_role)} 
                        size={24} 
                        color={COLORS.warning} 
                      />
                    </View>
                  )}
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{request.provider_name}</Text>
                    <View style={styles.roleRow}>
                      <View style={[styles.roleBadge, { backgroundColor: COLORS.warning + '20' }]}>
                        <Text style={[styles.roleText, { color: COLORS.warning }]}>
                          {request.provider_role}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statusRow}>
                      <Icon name="time" size={14} color={COLORS.warning} />
                      <Text style={styles.pendingText}>Invitation pending</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => revokeAccess(request.request_id, request.provider_name)}
                    data-testid={`cancel-btn-${request.request_id}`}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Empty State */}
        {allTeamProviders.length === 0 && pendingProviders.length === 0 && (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon name="people" size={48} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No Team Members Yet</Text>
            <Text style={styles.emptyText}>
              Find and connect with a doula or midwife in the marketplace. They'll automatically get access to your birth plan once connected.
            </Text>
            <Button
              title="Find Providers"
              onPress={() => router.push('/marketplace')}
              style={styles.emptyButton}
              data-testid="find-providers-btn"
            />
          </Card>
        )}

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Icon name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoTitle}>About Your Team</Text>
          </View>
          <Text style={styles.infoText}>
            Team members can view your birth plan and add professional notes to help you prepare for birth. 
            You can remove team members at any time, which will revoke their access to your plan.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  title: { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, marginBottom: SIZES.lg },
  addButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.primary, 
    padding: SIZES.md, 
    borderRadius: SIZES.radiusMd, 
    marginBottom: SIZES.lg, 
    gap: SIZES.xs 
  },
  addButtonText: { color: COLORS.white, fontWeight: '600', fontSize: SIZES.fontMd },
  marketplaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.lg,
  },
  marketplaceButtonText: { 
    flex: 1, 
    color: COLORS.white, 
    fontWeight: '600', 
    fontSize: SIZES.fontMd, 
    marginLeft: SIZES.sm 
  },
  section: { marginBottom: SIZES.lg },
  sectionTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.xs },
  sectionSubtitle: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: SIZES.md },
  teamCard: { marginBottom: SIZES.sm, overflow: 'visible' },
  pendingCard: { borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.warning },
  teamRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    backgroundColor: COLORS.primary, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  pendingAvatar: { backgroundColor: COLORS.warning + '20' },
  teamInfo: { flex: 1, marginLeft: SIZES.md },
  teamName: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary },
  roleRow: { flexDirection: 'row', marginTop: 4, flexWrap: 'wrap', gap: 4 },
  roleBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  roleText: { fontSize: SIZES.fontXs, fontWeight: '600' },
  statusBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  statusText: { fontSize: SIZES.fontXs, fontWeight: '600' },
  accessText: { fontSize: SIZES.fontSm, color: COLORS.success, marginLeft: 4 },
  accessRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '50',
  },
  providerDetails: {
    marginTop: SIZES.md,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '50',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
    marginBottom: SIZES.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  bioText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    lineHeight: 18,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SIZES.sm,
  },
  serviceTag: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: SIZES.radiusSm,
  },
  serviceTagText: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  moreServices: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    alignSelf: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  pendingText: { fontSize: SIZES.fontSm, color: COLORS.warning },
  removeBtn: { padding: SIZES.sm },
  cancelBtn: { 
    paddingHorizontal: SIZES.md, 
    paddingVertical: SIZES.sm, 
    backgroundColor: COLORS.textLight + '20', 
    borderRadius: SIZES.radiusMd 
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: SIZES.fontSm },
  quickActions: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'flex-start', 
    marginTop: SIZES.md, 
    paddingTop: SIZES.md, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border,
    gap: 8,
  },
  quickActionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10', 
    paddingVertical: 6, 
    paddingHorizontal: 10, 
    borderRadius: SIZES.radiusMd,
    gap: 4,
    minWidth: 80,
  },
  quickActionText: { 
    fontSize: SIZES.fontSm, 
    color: COLORS.primary, 
    fontWeight: '500' 
  },
  emptyCard: { alignItems: 'center', padding: SIZES.xl, marginBottom: SIZES.lg },
  emptyIcon: { marginBottom: SIZES.md },
  emptyTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.xs },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SIZES.lg },
  emptyButton: { minWidth: 160 },
  infoCard: { backgroundColor: COLORS.primary + '08' },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.sm },
  infoTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.primary },
  infoText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, lineHeight: 20 },
});
