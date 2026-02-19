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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, SHADOWS, FONTS } from '../../src/constants/theme';

interface ShareRequest {
  request_id: string;
  mom_user_id: string;
  mom_name: string;
  status: string;
  created_at: string;
}

export default function DoulaDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [stats, setStats] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchData = async () => {
    try {
      const [dashboardData, requestsData, profileData] = await Promise.all([
        apiRequest(API_ENDPOINTS.DOULA_DASHBOARD),
        apiRequest(API_ENDPOINTS.PROVIDER_SHARE_REQUESTS),
        apiRequest(API_ENDPOINTS.DOULA_PROFILE),
      ]);
      setStats(dashboardData);
      setProfile(profileData);
      setShareRequests(requestsData.requests?.filter((r: ShareRequest) => r.status === 'pending') || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await apiRequest(`${API_ENDPOINTS.PROVIDER_SHARE_REQUESTS}/${requestId}/respond`, {
        method: 'PUT',
        body: { action: 'accept' },
      });
      Alert.alert('Success', 'You are now connected with this mom!');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this share request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.PROVIDER_SHARE_REQUESTS}/${requestId}/respond`, {
                method: 'PUT',
                body: { action: 'decline' },
              });
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline request');
            }
          },
        },
      ]
    );
  };
  
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleDoula} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {firstName}</Text>
            <Text style={styles.subtitle}>Doula Dashboard</Text>
          </View>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => router.push('/(doula)/profile')}
            data-testid="profile-avatar-btn"
          >
            {profile?.picture || user?.picture ? (
              <Image 
                source={{ uri: profile?.picture || user?.picture }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Icon name="person-circle-outline" size={44} color={COLORS.roleDoula} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.active_clients || 0}</Text>
            <Text style={styles.statLabel}>Active Clients</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.accent }]}>
              {stats?.upcoming_appointments || 0}
            </Text>
            <Text style={styles.statLabel}>Upcoming Appts</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>
              {stats?.contracts_pending_signature || 0}
            </Text>
            <Text style={styles.statLabel}>Pending Contracts</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {stats?.pending_invoices || 0}
            </Text>
            <Text style={styles.statLabel}>Pending Invoices</Text>
          </Card>
        </View>

        {/* Pending Share Requests */}
        {shareRequests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              <Icon name="heart" size={18} color={COLORS.roleDoula} /> New Connection Requests
            </Text>
            {shareRequests.map((request) => (
              <Card key={request.request_id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestAvatar}>
                    <Icon name="person" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{request.mom_name}</Text>
                    <Text style={styles.requestSubtext}>
                      Wants to share their birth plan with you
                    </Text>
                    <Text style={styles.requestDate}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDeclineRequest(request.request_id)}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request.request_id)}
                  >
                    <Icon name="checkmark" size={16} color={COLORS.white} />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}
        
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(doula)/clients')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.roleDoula + '30' }]}>
              <Icon name="people" size={24} color={COLORS.roleDoula} />
            </View>
            <Text style={styles.actionTitle}>See Clients</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(doula)/contracts')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.accent + '30' }]}>
              <Icon name="document-text" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.actionTitle}>New Contract</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(doula)/invoices')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '30' }]}>
              <Icon name="cash-outline" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionTitle}>New Invoice</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(doula)/appointments')}
            activeOpacity={0.8}
            data-testid="appointments-action"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '30' }]}>
              <Icon name="calendar-outline" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.actionTitle}>Appointments</Text>
          </TouchableOpacity>
        </View>
        
        {/* Tip Card */}
        <Card style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Icon name="bulb" size={20} color={COLORS.warning} />
            <Text style={styles.tipTitle}>Doula Tip</Text>
          </View>
          <Text style={styles.tipText}>
            Keep your client records updated regularly. This helps you provide better care and maintain professional documentation.
          </Text>
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
  subtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.roleDoula,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.roleDoula + '20',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SIZES.xs,
    marginBottom: SIZES.lg,
  },
  statCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: SIZES.sm,
    alignItems: 'center',
    padding: SIZES.md,
  },
  statNumber: {
    fontSize: SIZES.fontHero,
    fontFamily: FONTS.heading,
    color: COLORS.roleDoula,
  },
  statLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SIZES.xs,
    marginBottom: SIZES.lg,
  },
  actionCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    margin: '1%',
    alignItems: 'center',
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
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  tipCard: {
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
  // Share Request Styles
  requestCard: {
    marginBottom: SIZES.md,
    padding: SIZES.md,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  requestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  requestName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  requestSubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  requestDate: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZES.sm,
  },
  declineButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.roleDoula,
    gap: 4,
  },
  acceptButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.white,
  },
});
