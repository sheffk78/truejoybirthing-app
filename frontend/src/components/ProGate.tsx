import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { SUBSCRIPTION_CONFIG, getStatusDisplayText, getProviderDisplayName } from '../../app/config/subscriptionConfig';

interface ProGateProps {
  children: React.ReactNode;
  feature?: string;
  showUpgradePrompt?: boolean;
}

const COLORS = {
  primary: '#7c3aed',
  background: '#faf8f5',
  card: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
};

/**
 * ProGate component - wraps content that requires Pro subscription
 * 
 * Usage:
 * <ProGate feature="Clients">
 *   <ClientsList />
 * </ProGate>
 */
export function ProGate({ children, feature = 'This feature', showUpgradePrompt = true }: ProGateProps) {
  const { user } = useAuthStore();
  const { status, fetchStatus } = useSubscriptionStore();

  useEffect(() => {
    if (!status) {
      fetchStatus();
    }
  }, []);

  // Moms don't see Pro gates - they see role-specific messages elsewhere
  if (user?.role === 'MOM') {
    return <>{children}</>;
  }

  // If loading or has access, show children
  if (!status || status.has_pro_access) {
    return <>{children}</>;
  }

  // No access - show upgrade prompt
  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Pro Feature</Text>
        <Text style={styles.description}>
          {feature} requires True Joy Pro. Start your free {SUBSCRIPTION_CONFIG.trialDays}-day trial to unlock all professional tools.
        </Text>
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={() => router.push('/plans-pricing')}
        >
          <Ionicons name="gift" size={20} color="#fff" />
          <Text style={styles.upgradeButtonText}>Start Free Trial</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.learnMoreButton}
          onPress={() => router.push('/plans-pricing')}
        >
          <Text style={styles.learnMoreText}>Learn more about Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Hook to check Pro access status
 */
export function useProAccess() {
  const { user } = useAuthStore();
  const { status, fetchStatus, isLoading, getSubscriptionManageUrl } = useSubscriptionStore();

  useEffect(() => {
    if (!status && user) {
      fetchStatus();
    }
  }, [user]);

  // Helper to open subscription management
  const openSubscriptionManagement = async () => {
    const manageUrl = getSubscriptionManageUrl();
    if (manageUrl) {
      try {
        await Linking.openURL(manageUrl);
      } catch (e) {
        console.error('Failed to open subscription management URL:', e);
      }
    }
  };

  return {
    hasProAccess: status?.has_pro_access ?? false,
    isTrialing: status?.is_trial ?? false,
    daysRemaining: status?.days_remaining,
    subscriptionStatus: status?.subscription_status ?? 'none',
    subscriptionProvider: status?.subscription_provider ?? null,
    subscriptionEndDate: status?.subscription_end_date ?? null,
    autoRenewing: status?.auto_renewing ?? false,
    isMom: user?.role === 'MOM',
    isLoading,
    // Helper methods
    openSubscriptionManagement,
    getStatusText: () => getStatusDisplayText(status?.subscription_status ?? 'none', status?.days_remaining),
    getProviderName: () => getProviderDisplayName(status?.subscription_provider ?? 'MOCK'),
    canManageSubscription: () => 
      status?.subscription_provider === 'APPLE' || status?.subscription_provider === 'GOOGLE',
  };
}

/**
 * Trial banner component for showing trial status
 */
export function TrialBanner() {
  const { status, fetchStatus, getSubscriptionManageUrl } = useSubscriptionStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!status && user) {
      fetchStatus();
    }
  }, [user]);

  // Don't show for moms or if no status
  if (!status || user?.role === 'MOM') return null;

  // Don't show if not in trial
  if (!status.is_trial) return null;

  const daysRemaining = status.days_remaining ?? 0;
  const isUrgent = daysRemaining <= 7;

  const handlePress = () => {
    router.push('/plans-pricing');
  };

  return (
    <TouchableOpacity 
      style={[styles.trialBanner, isUrgent && styles.trialBannerUrgent]}
      onPress={handlePress}
    >
      <Ionicons 
        name={isUrgent ? 'warning' : 'time'} 
        size={18} 
        color={isUrgent ? '#f59e0b' : COLORS.primary} 
      />
      <Text style={[styles.trialBannerText, isUrgent && styles.trialBannerTextUrgent]}>
        {daysRemaining <= 0 
          ? 'Trial ended - Subscribe to continue'
          : `Trial: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
        }
      </Text>
      <Ionicons name="chevron-forward" size={16} color={isUrgent ? '#f59e0b' : COLORS.primary} />
    </TouchableOpacity>
  );
}

/**
 * Subscription Info Card - shows current subscription details
 * Use this in profile pages or settings
 */
export function SubscriptionInfoCard() {
  const { status, fetchStatus, getSubscriptionManageUrl } = useSubscriptionStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!status && user) {
      fetchStatus();
    }
  }, [user]);

  // Don't show for moms
  if (user?.role === 'MOM' || !status) return null;

  const manageUrl = getSubscriptionManageUrl();
  const canManage = status.subscription_provider === 'APPLE' || status.subscription_provider === 'GOOGLE';

  const handleManagePress = async () => {
    if (manageUrl) {
      try {
        await Linking.openURL(manageUrl);
      } catch (e) {
        console.error('Failed to open subscription management:', e);
      }
    }
  };

  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Ionicons 
          name={status.has_pro_access ? 'checkmark-shield' : 'shield-outline'} 
          size={24} 
          color={status.has_pro_access ? '#10b981' : COLORS.textSecondary} 
        />
        <Text style={styles.infoTitle}>
          {status.has_pro_access ? 'True Joy Pro' : 'Free Plan'}
        </Text>
      </View>
      
      <Text style={styles.infoStatus}>
        {getStatusDisplayText(status.subscription_status, status.days_remaining)}
      </Text>
      
      {status.subscription_provider && status.subscription_provider !== 'MOCK' && (
        <Text style={styles.infoProvider}>
          Managed through {getProviderDisplayName(status.subscription_provider)}
        </Text>
      )}
      
      {status.subscription_end_date && status.subscription_status === 'active' && (
        <Text style={styles.infoExpiry}>
          {status.auto_renewing ? 'Renews' : 'Expires'}: {new Date(status.subscription_end_date).toLocaleDateString()}
        </Text>
      )}
      
      <View style={styles.infoActions}>
        {!status.has_pro_access && (
          <TouchableOpacity 
            style={styles.upgradeSmallButton}
            onPress={() => router.push('/plans-pricing')}
          >
            <Text style={styles.upgradeSmallButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}
        
        {canManage && status.has_pro_access && (
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={handleManagePress}
          >
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
            <Ionicons name="open-outline" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    width: '100%',
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  learnMoreButton: {
    marginTop: 12,
    padding: 8,
  },
  learnMoreText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  
  // Trial Banner
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f3ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  trialBannerUrgent: {
    backgroundColor: '#fef3c7',
  },
  trialBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
    flex: 1,
  },
  trialBannerTextUrgent: {
    color: '#92400e',
  },
});

export default ProGate;
