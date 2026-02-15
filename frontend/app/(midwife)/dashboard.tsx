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
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

export default function MidwifeDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchStats = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.MIDWIFE_DASHBOARD);
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };
  
  useEffect(() => {
    fetchStats();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };
  
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleMidwife} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {firstName}</Text>
            <Text style={styles.subtitle}>Midwife Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.avatarContainer}>
            <Icon name="person-circle-outline" size={44} color={COLORS.roleMidwife} />
          </TouchableOpacity>
        </View>
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.prenatal_clients || 0}</Text>
            <Text style={styles.statLabel}>Prenatal Clients</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.total_clients || 0}</Text>
            <Text style={styles.statLabel}>Total Clients</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.accent }]}>
              {stats?.visits_this_month || 0}
            </Text>
            <Text style={styles.statLabel}>Visits This Month</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {stats?.births_this_month || 0}
            </Text>
            <Text style={styles.statLabel}>Births This Month</Text>
          </Card>
        </View>
        
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(midwife)/clients')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.roleMidwife + '30' }]}>
              <Icon name="person-add" size={24} color={COLORS.roleMidwife} />
            </View>
            <Text style={styles.actionTitle}>Add Client</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(midwife)/visits')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.accent + '30' }]}>
              <Icon name="create" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.actionTitle}>Add Visit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '30' }]}>
              <Icon name="document-text" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionTitle}>Birth Summary</Text>
          </TouchableOpacity>
        </View>
        
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Icon name="information-circle" size={20} color={COLORS.roleMidwife} />
            <Text style={styles.infoTitle}>Midwifery Tools</Text>
          </View>
          <Text style={styles.infoText}>
            This is a simplified client management system for home and birth center midwives. Track prenatal visits, birth summaries, and postpartum care.
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
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.roleMidwife,
    fontWeight: '500',
    marginTop: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.roleMidwife + '20',
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
    fontWeight: '700',
    color: COLORS.roleMidwife,
  },
  statLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  actionsContainer: {
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
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.roleMidwife + '10',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  infoTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  infoText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
