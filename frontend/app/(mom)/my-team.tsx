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
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [teamData, requestsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.MOM_TEAM),
        apiRequest(API_ENDPOINTS.BIRTH_PLAN_SHARE_REQUESTS),
      ]);
      setTeam(teamData || []);
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

  const acceptedProviders = shareRequests.filter(r => r.status === 'accepted');
  const pendingProviders = shareRequests.filter(r => r.status === 'pending');

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
          Your birth support team with automatic access to your birth plan
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

        {/* Active Team Members */}
        {acceptedProviders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Team</Text>
            {acceptedProviders.map((request) => (
              <Card key={request.request_id} style={styles.teamCard}>
                <View style={styles.teamRow}>
                  {request.provider_picture ? (
                    <Image 
                      source={{ uri: request.provider_picture }} 
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Icon 
                        name={getProviderIcon(request.provider_role)} 
                        size={24} 
                        color={COLORS.white} 
                      />
                    </View>
                  )}
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{request.provider_name}</Text>
                    <View style={styles.roleRow}>
                      <View style={[
                        styles.roleBadge,
                        { backgroundColor: request.provider_role === 'DOULA' ? COLORS.primary + '20' : COLORS.success + '20' }
                      ]}>
                        <Text style={[
                          styles.roleText,
                          { color: request.provider_role === 'DOULA' ? COLORS.primary : COLORS.success }
                        ]}>
                          {request.provider_role}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.accessText}>
                      Has access to your birth plan
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => revokeAccess(request.request_id, request.provider_name)}
                    data-testid={`remove-btn-${request.request_id}`}
                  >
                    <Icon name="close-circle" size={24} color={COLORS.error} />
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
        {acceptedProviders.length === 0 && pendingProviders.length === 0 && (
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
  teamCard: { marginBottom: SIZES.sm },
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
  roleRow: { flexDirection: 'row', marginTop: 4 },
  roleBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  roleText: { fontSize: SIZES.fontXs, fontWeight: '600' },
  accessText: { fontSize: SIZES.fontSm, color: COLORS.success, marginTop: 4 },
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
