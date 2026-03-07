// Shared Dashboard Screen for Doula and Midwife
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../Icon';
import Card from '../Card';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, SHADOWS, FONTS } from '../../constants/theme';
import { useColors } from '../../hooks/useThemedStyles';
import { ProviderConfig } from './config/providerConfig';

interface ShareRequest {
  request_id: string;
  mom_user_id: string;
  mom_name: string;
  status: string;
  created_at: string;
}

interface ProviderDashboardProps {
  config: ProviderConfig;
}

export default function ProviderDashboard({ config }: ProviderDashboardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  
  const [stats, setStats] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const primaryColor = config.primaryColor;
  
  const fetchData = async () => {
    try {
      const [dashboardData, requestsData, profileData] = await Promise.all([
        apiRequest(config.endpoints.dashboard),
        apiRequest(API_ENDPOINTS.PROVIDER_SHARE_REQUESTS),
        apiRequest(config.endpoints.profile),
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
  
  // Re-fetch when screen comes back into focus (e.g., after updating profile)
  // Web-compatible approach using visibility change detection
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchData();
        }
      };
      const handleFocus = () => {
        fetchData();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
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
  
  const getStatColor = (colorKey?: string) => {
    switch (colorKey) {
      case 'accent': return COLORS.accent;
      case 'warning': return COLORS.warning;
      case 'success': return COLORS.success;
      default: return primaryColor;
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']} data-testid={`${config.role.toLowerCase()}-dashboard`}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>Hello, {firstName}</Text>
            <Text style={[styles.subtitle, { color: primaryColor }]}>{config.dashboard.title}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.avatarContainer, { backgroundColor: primaryColor + '20' }]}
            onPress={() => router.push(config.routes.profile as any)}
            data-testid="profile-avatar-btn"
          >
            {profile?.picture || user?.picture ? (
              <Image 
                key={profile?.picture || user?.picture} 
                source={{ uri: profile?.picture || user?.picture }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Icon name="person-circle-outline" size={44} color={primaryColor} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {config.dashboard.statsCards.map((stat, index) => {
            // Handle array values (like upcoming_appointments) - show the length
            const value = stats?.[stat.key];
            const displayValue = Array.isArray(value) ? value.length : (value || 0);
            return (
              <Card key={stat.key} style={styles.statCard}>
                <Text style={[styles.statNumber, { color: getStatColor(stat.colorKey) }]}>
                  {displayValue}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Card>
            );
          })}
        </View>

        {/* Lead Insights Card */}
        {stats?.lead_insights && (stats.lead_insights.total_leads > 0 || stats.lead_insights.active_leads > 0) && (
          <TouchableOpacity 
            style={styles.leadInsightsCard}
            onPress={() => router.push(config.routes.leads as any)}
            activeOpacity={0.8}
            data-testid="lead-insights-card"
          >
            <View style={styles.leadInsightsHeader}>
              <View style={[styles.leadInsightsIcon, { backgroundColor: primaryColor + '20' }]}>
                <Icon name="disc-outline" size={20} color={primaryColor} />
              </View>
              <Text style={styles.leadInsightsTitle}>Lead Insights</Text>
              <Icon name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </View>
            <View style={styles.leadInsightsStats}>
              <View style={styles.leadInsightsStat}>
                <Text style={[styles.leadInsightsValue, { color: COLORS.warning }]}>
                  {stats.lead_insights.active_leads}
                </Text>
                <Text style={styles.leadInsightsLabel}>Open</Text>
              </View>
              <View style={styles.leadInsightsDivider} />
              <View style={styles.leadInsightsStat}>
                <Text style={[styles.leadInsightsValue, { color: COLORS.success }]}>
                  {stats.lead_insights.converted_leads}
                </Text>
                <Text style={styles.leadInsightsLabel}>Converted</Text>
              </View>
              <View style={styles.leadInsightsDivider} />
              <View style={styles.leadInsightsStat}>
                <Text style={[styles.leadInsightsValue, { color: primaryColor }]}>
                  {stats.lead_insights.conversion_rate}%
                </Text>
                <Text style={styles.leadInsightsLabel}>Rate</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Pending Share Requests */}
        {shareRequests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              <Icon name="heart" size={18} color={primaryColor} /> New Connection Requests
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
                    data-testid={`decline-request-${request.request_id}`}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: primaryColor }]}
                    onPress={() => handleAcceptRequest(request.request_id)}
                    data-testid={`accept-request-${request.request_id}`}
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
          {config.dashboard.quickActions.map((action, index) => (
            <TouchableOpacity
              key={action.route}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
              data-testid={`action-${action.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <View style={[styles.actionIcon, { backgroundColor: getStatColor(action.colorKey) + '30' }]}>
                <Icon name={action.icon as any} size={24} color={getStatColor(action.colorKey)} />
              </View>
              <Text style={styles.actionTitle}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Tip Card */}
        <Card style={[styles.tipCard, { backgroundColor: primaryColor + '15' }]}>
          <View style={styles.tipHeader}>
            <Icon name="information-circle" size={20} color={primaryColor} />
            <Text style={styles.tipTitle}>{config.dashboard.tipTitle}</Text>
          </View>
          <Text style={styles.tipText}>{config.dashboard.tipText}</Text>
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
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  statLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
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
  tipCard: {},
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
    gap: 4,
  },
  acceptButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.white,
  },
  // Lead Insights Card Styles
  leadInsightsCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.sm,
  },
  leadInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  leadInsightsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  leadInsightsTitle: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  leadInsightsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  leadInsightsStat: {
    alignItems: 'center',
    flex: 1,
  },
  leadInsightsValue: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
  },
  leadInsightsLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  leadInsightsDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
});
