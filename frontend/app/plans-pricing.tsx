import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSubscriptionStore } from '../src/store/subscriptionStore';
import { useAuthStore } from '../src/store/authStore';
import { 
  SUBSCRIPTION_CONFIG, 
  getAnnualSavings, 
  getStatusDisplayText,
  getProviderDisplayName 
} from './config/subscriptionConfig';

// Platform detection helpers
const getCurrentPlatform = () => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
};

const isIAPAvailable = () => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

const COLORS = {
  primary: '#7c3aed',
  secondary: '#059669',
  background: '#faf8f5',
  card: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
};

export default function PlansPricingScreen() {
  const { user } = useAuthStore();
  const { status, pricing, isLoading, fetchStatus, fetchPricing, startTrial, activateSubscription } = useSubscriptionStore();
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [processingAction, setProcessingAction] = useState(false);
  
  // IAP state (for native platforms only)
  const iapAvailable = isIAPAvailable();
  const isPurchasing = false;
  const isRestoring = false;

  useEffect(() => {
    fetchStatus();
    fetchPricing();
  }, []);
  
  // Handle IAP purchase or mock trial
  const handleIAPPurchase = async () => {
    // On web, fall back to mock trial
    handleStartTrial();
  };
  
  // Handle restore purchases (native only)
  const handleRestorePurchases = async () => {
    if (!iapAvailable) {
      Alert.alert('Not Available', 'Restore purchases is only available on iOS and Android.');
      return;
    }
    Alert.alert('Not Available', 'Please use the native iOS or Android app to restore purchases.');
  };

  const handleStartTrial = async () => {
    try {
      setProcessingAction(true);
      await startTrial(selectedPlan);
      Alert.alert(
        'Trial Started!',
        `Your 30-day free trial has begun. You'll have full access to all Pro features.`,
        [{ text: 'Get Started', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start trial');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setProcessingAction(true);
      // In real app, this would open IAP flow
      await activateSubscription(selectedPlan);
      Alert.alert(
        'Subscription Activated!',
        `Your ${selectedPlan === 'annual' ? 'annual' : 'monthly'} subscription is now active.`,
        [{ text: 'Continue', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to activate subscription');
    } finally {
      setProcessingAction(false);
    }
  };

  if (isLoading && !pricing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isMom = user?.role === 'MOM';
  const hasAccess = status?.has_pro_access;
  const isInTrial = status?.is_trial;
  const daysRemaining = status?.days_remaining;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plans & Pricing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Status Banner */}
        {status && !isMom && (
          <View style={[styles.statusBanner, hasAccess ? styles.statusActive : styles.statusInactive]}>
            <Ionicons 
              name={hasAccess ? 'checkmark-circle' : 'information-circle'} 
              size={20} 
              color={hasAccess ? '#10b981' : '#f59e0b'} 
            />
            <Text style={styles.statusText}>
              {hasAccess 
                ? isInTrial 
                  ? `Trial Active - ${daysRemaining} days remaining`
                  : `Pro Active - ${status.plan_type === 'annual' ? 'Annual' : 'Monthly'}`
                : status.subscription_status === 'expired'
                  ? 'Trial Expired - Subscribe to continue'
                  : 'No active subscription'
              }
            </Text>
          </View>
        )}

        {/* MOM FREE Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={24} color="#ec4899" />
            <Text style={styles.sectionTitle}>For Birthing Moms</Text>
          </View>
          <View style={styles.freeCard}>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE FOREVER</Text>
            </View>
            <Text style={styles.freeDescription}>
              True Joy Birthing is completely free for birthing moms. Create your birth plan, 
              track your pregnancy, and connect with your care team at no cost.
            </Text>
            <View style={styles.featureList}>
              {pricing?.mom_features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            {isMom && (
              <View style={styles.currentPlanBadge}>
                <Ionicons name="star" size={16} color="#fff" />
                <Text style={styles.currentPlanText}>Your Current Plan</Text>
              </View>
            )}
          </View>
        </View>

        {/* PRO Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>For Doulas & Midwives</Text>
          </View>
          <Text style={styles.proSubtitle}>
            Professional tools to manage your practice and serve your clients better.
          </Text>

          {/* Plan Selection */}
          <View style={styles.planSelector}>
            {pricing?.plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planOption,
                  selectedPlan === plan.id && styles.planOptionSelected
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                {plan.id === 'annual' && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>Save ${plan.savings}</Text>
                  </View>
                )}
                <Text style={[
                  styles.planName,
                  selectedPlan === plan.id && styles.planNameSelected
                ]}>
                  {plan.period === 'month' ? 'Monthly' : 'Annual'}
                </Text>
                <Text style={[
                  styles.planPrice,
                  selectedPlan === plan.id && styles.planPriceSelected
                ]}>
                  ${plan.price}
                </Text>
                <Text style={[
                  styles.planPeriod,
                  selectedPlan === plan.id && styles.planPeriodSelected
                ]}>
                  /{plan.period}
                </Text>
                {selectedPlan === plan.id && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Pro Features */}
          <View style={styles.proFeaturesCard}>
            <Text style={styles.proFeaturesTitle}>Pro Features Include:</Text>
            <View style={styles.featureList}>
              {pricing?.plans[0]?.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* CTA Buttons */}
          {!isMom && (
            <View style={styles.ctaContainer}>
              {!hasAccess && status?.subscription_status !== 'trial' && (
                <>
                  {/* Start Trial Button (uses mock for web, IAP for native) */}
                  <TouchableOpacity
                    style={styles.trialButton}
                    onPress={iapAvailable ? handleIAPPurchase : handleStartTrial}
                    disabled={processingAction || isPurchasing}
                  >
                    {(processingAction || isPurchasing) ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="gift" size={20} color="#fff" />
                        <Text style={styles.trialButtonText}>
                          {iapAvailable ? 'Start 30-Day Free Trial' : 'Start 30-Day Free Trial'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  {/* Restore Purchases Button (native only) */}
                  {iapAvailable && (
                    <TouchableOpacity
                      style={styles.restoreButton}
                      onPress={handleRestorePurchases}
                      disabled={isRestoring}
                    >
                      {isRestoring ? (
                        <ActivityIndicator color={COLORS.primary} size="small" />
                      ) : (
                        <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
              
              {(status?.subscription_status === 'expired' || status?.subscription_status === 'trial') && (
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={iapAvailable ? handleIAPPurchase : handleSubscribe}
                  disabled={processingAction || isPurchasing}
                >
                  {(processingAction || isPurchasing) ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="card" size={20} color="#fff" />
                      <Text style={styles.subscribeButtonText}>
                        Subscribe Now - ${selectedPlan === 'annual' ? '276/yr' : '29/mo'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <Text style={styles.disclaimer}>
                {status?.subscription_status === 'none' 
                  ? iapAvailable 
                    ? `${SUBSCRIPTION_CONFIG.trialDays}-day free trial. Cancel anytime in ${getCurrentPlatform() === 'ios' ? 'App Store' : 'Google Play'} settings.`
                    : `No credit card required for trial. Cancel anytime.`
                  : isIAPAvailable() 
                    ? `Your subscription will be managed through the ${getCurrentPlatform() === 'ios' ? 'App Store' : 'Google Play Store'}.`
                    : 'Subscriptions are managed through the iOS App Store or Google Play Store on your mobile device.'
                }
              </Text>
            </View>
          )}

          {/* Subscription Management Info for Active Subscribers */}
          {status?.has_pro_access && status?.subscription_provider && (
            <View style={styles.manageSubscriptionCard}>
              <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.manageTitle}>Manage Subscription</Text>
                <Text style={styles.manageDescription}>
                  {status.subscription_provider === 'APPLE' 
                    ? 'Your subscription is managed through the App Store. Go to Settings > [Your Name] > Subscriptions to make changes.'
                    : status.subscription_provider === 'GOOGLE'
                      ? 'Your subscription is managed through Google Play. Open the Play Store > Menu > Subscriptions to make changes.'
                      : 'Your subscription is in test mode.'
                  }
                </Text>
                {(status.subscription_provider === 'APPLE' || status.subscription_provider === 'GOOGLE') && (
                  <TouchableOpacity 
                    style={styles.manageLink}
                    onPress={() => {
                      const url = status.subscription_provider === 'APPLE' 
                        ? 'https://apps.apple.com/account/subscriptions'
                        : 'https://play.google.com/store/account/subscriptions';
                      Linking.openURL(url);
                    }}
                  >
                    <Text style={styles.manageLinkText}>Open {getProviderDisplayName(status.subscription_provider)}</Text>
                    <Ionicons name="open-outline" size={14} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {isMom && (
            <View style={styles.momNote}>
              <Ionicons name="information-circle" size={20} color={COLORS.textSecondary} />
              <Text style={styles.momNoteText}>
                This plan is for doulas and midwives. As a mom, you have free access to all features designed for you!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSecondary },
  
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  statusActive: { backgroundColor: '#d1fae5' },
  statusInactive: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  
  freeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ec4899',
  },
  freeBadge: {
    backgroundColor: '#fce7f3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  freeBadgeText: { color: '#ec4899', fontWeight: '700', fontSize: 12 },
  freeDescription: { color: COLORS.textSecondary, lineHeight: 22, marginBottom: 16 },
  
  featureList: { gap: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: COLORS.text, fontSize: 14, flex: 1 },
  
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ec4899',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  currentPlanText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  proSubtitle: { color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },
  
  planSelector: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  planOption: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  planOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#f5f3ff',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  savingsText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  planName: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 },
  planNameSelected: { color: COLORS.primary },
  planPrice: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  planPriceSelected: { color: COLORS.primary },
  planPeriod: { fontSize: 14, color: COLORS.textSecondary },
  planPeriodSelected: { color: COLORS.primary },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  proFeaturesCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  proFeaturesTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  
  ctaContainer: { gap: 12 },
  trialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  trialButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  restoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  restoreButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  subscribeButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disclaimer: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  
  momNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  momNoteText: { flex: 1, color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  
  // Subscription Management Card
  manageSubscriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  manageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  manageDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  manageLinkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
});
