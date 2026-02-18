import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
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
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchData = async () => {
    try {
      const [dashboardData, requestsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.DOULA_DASHBOARD),
        apiRequest(API_ENDPOINTS.PROVIDER_SHARE_REQUESTS),
      ]);
      setStats(dashboardData);
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
          <TouchableOpacity style={styles.avatarContainer}>
            <Icon name="person-circle-outline" size={44} color={COLORS.roleDoula} />
          </TouchableOpacity>
        </View>
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.active_clients || 0}</Text>
            <Text style={styles.statLabel}>Active Clients</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.total_clients || 0}</Text>
            <Text style={styles.statLabel}>Total Clients</Text>
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
        
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(doula)/clients')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.roleDoula + '30' }]}>
              <Icon name="person-add" size={24} color={COLORS.roleDoula} />
            </View>
            <Text style={styles.actionTitle}>Add Client</Text>
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
              <Icon name="receipt" size={24} color={COLORS.success} />
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
              <Icon name="calendar-number" size={24} color={COLORS.warning} />
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
});
