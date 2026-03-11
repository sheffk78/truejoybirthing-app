// Subscription Management Page - Shared by Midwife and Doula
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
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { SUBSCRIPTION_PRODUCTS } from '../../services/billing/subscriptionConfig';
import { useIAP } from '../../services/billing/useIAP';
import { SIZES, FONTS } from '../../constants/theme';
import { useColors, createThemedStyles, ThemeColors } from '../../hooks/useThemedStyles';

// Check if running in Expo Go
const IS_EXPO_GO = Constants.appOwnership === 'expo';

interface SubscriptionPageProps {
  primaryColor: string;
  role: 'MIDWIFE' | 'DOULA';
}

export default function SubscriptionPage({ primaryColor, role }: SubscriptionPageProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const { status, pricing, isLoading, fetchStatus, fetchPricing, startTrial, activateSubscription, cancelSubscription, getSubscriptionManageUrl } = useSubscriptionStore();
  const { products, purchase, restore, isLoading: iapLoading, isAvailable: iapAvailable, error: iapError } = useIAP();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchPricing();
  }, []);

  // Determine if user can upgrade (monthly to annual)
  const canUpgradeToAnnual = status?.has_pro_access && 
                             status?.subscription_status === 'active' && 
                             status?.plan_type === 'monthly';

  // Determine if user is on trial and can upgrade to paid
  const canUpgradeFromTrial = status?.has_pro_access && status?.is_trial;

  // Get the product ID for the selected plan
  const getProductIdForPlan = (planType: string) => {
    if (Platform.OS === 'ios') {
      return planType === 'monthly' 
        ? SUBSCRIPTION_PRODUCTS.APPLE.PRO_MONTHLY 
        : SUBSCRIPTION_PRODUCTS.APPLE.PRO_ANNUAL;
    } else if (Platform.OS === 'android') {
      // For Android, we pass the subscription ID and the base plan is determined by offerToken
      return SUBSCRIPTION_PRODUCTS.GOOGLE.SUBSCRIPTION_ID;
    }
    return null;
  };

  // Find IAP product price to display
  const getIAPPrice = (isMonthly: boolean) => {
    const product = products.find(p => p.isMonthly === isMonthly);
    return product?.localizedPrice || (isMonthly ? '$29.00' : '$276.00');
  };

  const handleStartTrial = async () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a plan to start your free trial.');
      return;
    }

    setProcessing(true);
    try {
      await startTrial(selectedPlan);
      Alert.alert('Trial Started!', 'Your 14-day free trial has begun. Enjoy full access to all features!', [
        { text: 'Get Started', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start trial');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a plan to subscribe.');
      return;
    }

    setProcessing(true);
    try {
      // Use real IAP on native platforms
      if (iapAvailable && Platform.OS !== 'web') {
        const productId = getProductIdForPlan(selectedPlan);
        if (productId) {
          // For Android subscriptions with multiple base plans, we need offer token
          const offerToken = Platform.OS === 'android' ? 
            (selectedPlan === 'monthly' ? 'monthly-offer' : 'annual-offer') : 
            undefined;
          
          const result = await purchase(productId, offerToken);
          if (!result.success && result.error) {
            throw new Error(result.error);
          }
          // If successful, the IAP callbacks will handle the rest
          router.back();
          return;
        }
      }
      
      // Fallback to mock activation for web/development
      await activateSubscription(selectedPlan);
      Alert.alert('Subscription Active!', 'Thank you for subscribing! You now have full access.', [
        { text: 'Continue', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to activate subscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!iapAvailable) {
      Alert.alert('Not Available', 'Restore purchases is only available on iOS and Android.');
      return;
    }
    
    setProcessing(true);
    try {
      const result = await restore();
      if (!result.success && result.error !== 'No previous purchases found') {
        Alert.alert('Restore Failed', result.error || 'Unable to restore purchases');
      } else if (!result.success) {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to restore purchases');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgradeToAnnual = async () => {
    const confirmUpgrade = Platform.OS === 'web' 
      ? window.confirm('Upgrade to Annual Plan?\n\nYou\'ll save $72/year compared to monthly billing. Your new annual subscription will start immediately.')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Upgrade to Annual Plan?',
            'You\'ll save $72/year compared to monthly billing. Your new annual subscription will start immediately.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Upgrade Now', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmUpgrade) return;

    setProcessing(true);
    try {
      // Use real IAP on native platforms
      if (iapAvailable && Platform.OS !== 'web') {
        const productId = getProductIdForPlan('annual');
        if (productId) {
          const offerToken = Platform.OS === 'android' ? 'annual-offer' : undefined;
          const result = await purchase(productId, offerToken);
          if (!result.success && result.error) {
            throw new Error(result.error);
          }
          await fetchStatus();
          Alert.alert('Upgrade Successful!', 'You\'re now on the annual plan. Thank you!');
          return;
        }
      }
      
      // Fallback to mock activation for web/development
      await activateSubscription('annual');
      Alert.alert('Upgrade Successful!', 'You\'re now on the annual plan. Thank you!');
    } catch (error: any) {
      Alert.alert('Upgrade Failed', error.message || 'Failed to upgrade subscription');
    } finally {
      setProcessing(false);
    }
  };

  // Handle upgrading from trial to paid subscription
  const handleUpgradeFromTrial = async (planType: 'monthly' | 'annual') => {
    const planLabel = planType === 'monthly' ? 'Monthly ($29/mo)' : 'Annual ($276/yr - Save $72!)';
    const confirmUpgrade = Platform.OS === 'web' 
      ? window.confirm(`Upgrade to ${planLabel}?\n\nYour trial will end and your paid subscription will start immediately.`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            `Upgrade to ${planType === 'monthly' ? 'Monthly' : 'Annual'} Plan?`,
            `Your trial will end and your paid subscription will start immediately.${planType === 'annual' ? ' You\'ll save $72/year!' : ''}`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Upgrade Now', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmUpgrade) return;

    setProcessing(true);
    try {
      // Use real IAP on native platforms
      if (iapAvailable && Platform.OS !== 'web') {
        const productId = getProductIdForPlan(planType);
        if (productId) {
          const offerToken = Platform.OS === 'android' ? `${planType}-offer` : undefined;
          const result = await purchase(productId, offerToken);
          if (!result.success && result.error) {
            throw new Error(result.error);
          }
          await fetchStatus();
          Alert.alert('Subscription Active!', 'Thank you for subscribing! You now have full access.');
          return;
        }
      }
      
      // Fallback to mock activation for web/development
      await activateSubscription(planType);
      Alert.alert('Subscription Active!', 'Thank you for subscribing! You now have full access.');
    } catch (error: any) {
      Alert.alert('Upgrade Failed', error.message || 'Failed to activate subscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmCancel = Platform.OS === 'web'
      ? window.confirm('Cancel Subscription?\n\nYou will retain access until the end of your current billing period. Are you sure you want to cancel?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Cancel Subscription?',
            'You will retain access until the end of your current billing period. Are you sure you want to cancel?',
            [
              { text: 'Keep Subscription', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Yes, Cancel', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmCancel) return;

    setProcessing(true);
    try {
      await cancelSubscription();
      
      // For native apps, also direct users to the app store to manage
      const manageUrl = getSubscriptionManageUrl();
      if (manageUrl && Platform.OS !== 'web') {
        Alert.alert(
          'Subscription Cancelled',
          'Auto-renewal has been turned off. To fully manage your subscription, you may also need to cancel in your device settings.',
          [
            { text: 'OK' },
            { text: 'Open Settings', onPress: () => Linking.openURL(manageUrl) }
          ]
        );
      } else {
        Alert.alert('Subscription Cancelled', 'Auto-renewal has been turned off. You will retain access until the end of your current period.');
      }
      
      await fetchStatus();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleManageSubscription = () => {
    // Build options based on current subscription state
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = [
      { text: 'Close', style: 'cancel' }
    ];

    // Add upgrade option for monthly subscribers
    if (canUpgradeToAnnual) {
      options.push({
        text: 'Upgrade to Annual (Save $72/yr)',
        onPress: handleUpgradeToAnnual
      });
    }

    // Add contact support option
    options.push({
      text: 'Contact Support',
      onPress: () => Linking.openURL('https://truejoybirthing.com/contact/')
    });

    // Add cancel option for active subscribers (not trial)
    if (status?.subscription_status === 'active' && !status?.is_trial) {
      options.push({
        text: 'Cancel Subscription',
        style: 'destructive',
        onPress: handleCancelSubscription
      });
    }

    // For trial users, show different cancel option
    if (status?.is_trial) {
      options.push({
        text: 'End Trial Early',
        style: 'destructive',
        onPress: handleCancelSubscription
      });
    }

    if (Platform.OS === 'web') {
      // For web, show a more detailed management UI inline
      setShowCancelConfirm(true);
    } else {
      Alert.alert('Manage Subscription', 'What would you like to do?', options);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;
    
    const badges: Record<string, { color: string; bgColor: string; text: string }> = {
      active: { color: colors.success, bgColor: colors.success + '20', text: 'Active' },
      trial: { color: colors.warning, bgColor: colors.warning + '20', text: `Trial - ${status.days_remaining} days left` },
      expired: { color: colors.error, bgColor: colors.error + '20', text: 'Expired' },
      cancelled: { color: colors.textSecondary, bgColor: colors.border, text: 'Cancelled' },
      none: { color: colors.textSecondary, bgColor: colors.border, text: 'No Subscription' },
    };
    
    const badge = badges[status.subscription_status] || badges.none;
    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.bgColor }]}>
        <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  if (isLoading && !status) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Loading subscription info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Current Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Icon name="shield-checkmark" size={28} color={primaryColor} />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Your Plan</Text>
              {getStatusBadge()}
            </View>
          </View>

          {status?.has_pro_access ? (
            <View style={styles.statusDetails}>
              <View style={styles.statusRow}>
                <Icon name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.statusText}>Full access to all features</Text>
              </View>
              
              {/* Days Remaining Progress Bar */}
              {status.days_remaining !== null && status.days_remaining !== undefined && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>
                      {status.is_trial ? 'Trial Period' : 'Subscription Period'}
                    </Text>
                    <Text style={[styles.progressDays, { color: status.is_trial ? colors.warning : primaryColor }]}>
                      {status.days_remaining} days remaining
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          backgroundColor: status.is_trial ? colors.warning : primaryColor,
                          width: `${Math.min(100, Math.max(5, (status.days_remaining / (status.is_trial ? 14 : 365)) * 100))}%`
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressSubtext}>
                    {status.is_trial 
                      ? `${14 - status.days_remaining} of 14 days used`
                      : `${365 - status.days_remaining} of 365 days used`
                    }
                  </Text>
                </View>
              )}

              {status.subscription_end_date && (
                <View style={styles.statusRow}>
                  <Icon name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.statusText}>
                    {status.auto_renewing ? 'Renews' : 'Expires'}: {formatDate(status.subscription_end_date)}
                  </Text>
                </View>
              )}
              {status.is_trial && status.trial_end_date && (
                <View style={styles.statusRow}>
                  <Icon name="time-outline" size={18} color={colors.warning} />
                  <Text style={styles.statusText}>Trial ends: {formatDate(status.trial_end_date)}</Text>
                </View>
              )}
              {!status.is_trial && (
                <View style={styles.statusRow}>
                  <Icon name={status.auto_renewing ? 'refresh-outline' : 'time-outline'} size={18} color={colors.textSecondary} />
                  <Text style={styles.statusText}>
                    {status.auto_renewing ? 'Auto-renews annually' : 'No auto-renewal'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.statusDetails}>
              <View style={styles.statusRow}>
                <Icon name="alert-circle-outline" size={18} color={colors.warning} />
                <Text style={styles.statusText}>Subscribe to accept new clients</Text>
              </View>
              <View style={styles.statusRow}>
                <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.statusText}>Limited access to features</Text>
              </View>
            </View>
          )}

          {status?.has_pro_access && (
            <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
              <Text style={[styles.manageButtonText, { color: primaryColor }]}>Manage Subscription</Text>
              <Icon name="chevron-forward" size={18} color={primaryColor} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Web Management Panel - Shown when user clicks Manage Subscription on web */}
        {showCancelConfirm && Platform.OS === 'web' && (
          <Card style={styles.managementPanel}>
            <View style={styles.managementHeader}>
              <Icon name="settings-outline" size={24} color={primaryColor} />
              <Text style={styles.managementTitle}>Manage Your Subscription</Text>
              <TouchableOpacity onPress={() => setShowCancelConfirm(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Upgrade Option */}
            {canUpgradeToAnnual && (
              <TouchableOpacity 
                style={[styles.managementOption, { borderColor: colors.success }]}
                onPress={() => { setShowCancelConfirm(false); handleUpgradeToAnnual(); }}
                disabled={processing}
              >
                <View style={styles.managementOptionContent}>
                  <View style={[styles.managementOptionIcon, { backgroundColor: colors.success + '20' }]}>
                    <Icon name="trending-up" size={20} color={colors.success} />
                  </View>
                  <View style={styles.managementOptionText}>
                    <Text style={styles.managementOptionTitle}>Upgrade to Annual</Text>
                    <Text style={styles.managementOptionDesc}>Save $72/year - That's 2 months free!</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.success} />
              </TouchableOpacity>
            )}

            {/* Contact Support */}
            <TouchableOpacity 
              style={styles.managementOption}
              onPress={() => Linking.openURL('https://truejoybirthing.com/contact/')}
            >
              <View style={styles.managementOptionContent}>
                <View style={[styles.managementOptionIcon, { backgroundColor: primaryColor + '20' }]}>
                  <Icon name="mail-outline" size={20} color={primaryColor} />
                </View>
                <View style={styles.managementOptionText}>
                  <Text style={styles.managementOptionTitle}>Contact Support</Text>
                  <Text style={styles.managementOptionDesc}>Get help with billing or account issues</Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Cancel Subscription */}
            {(status?.subscription_status === 'active' || status?.is_trial) && (
              <TouchableOpacity 
                style={[styles.managementOption, { borderColor: colors.error + '50' }]}
                onPress={() => { setShowCancelConfirm(false); handleCancelSubscription(); }}
                disabled={processing}
              >
                <View style={styles.managementOptionContent}>
                  <View style={[styles.managementOptionIcon, { backgroundColor: colors.error + '20' }]}>
                    <Icon name="close-circle-outline" size={20} color={colors.error} />
                  </View>
                  <View style={styles.managementOptionText}>
                    <Text style={[styles.managementOptionTitle, { color: colors.error }]}>
                      {status?.is_trial ? 'End Trial Early' : 'Cancel Subscription'}
                    </Text>
                    <Text style={styles.managementOptionDesc}>
                      {status?.is_trial 
                        ? 'Your trial will end immediately'
                        : 'Access continues until end of billing period'
                      }
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Upgrade to Annual Card - For active monthly subscribers */}
        {canUpgradeToAnnual && !showCancelConfirm && (
          <Card style={[styles.upgradeCard, { borderColor: colors.success }]}>
            <View style={styles.upgradeHeader}>
              <View style={[styles.upgradeBadge, { backgroundColor: colors.success }]}>
                <Icon name="star" size={14} color={colors.white} />
                <Text style={styles.upgradeBadgeText}>SAVE $72/YEAR</Text>
              </View>
            </View>
            <Text style={styles.upgradeTitle}>Switch to Annual Billing</Text>
            <Text style={styles.upgradeDescription}>
              Get 2 months free when you upgrade to annual billing. Your new plan starts immediately.
            </Text>
            <View style={styles.upgradeComparison}>
              <View style={styles.upgradeComparisonItem}>
                <Text style={styles.upgradeComparisonLabel}>Monthly</Text>
                <Text style={styles.upgradeComparisonOld}>$348/yr</Text>
              </View>
              <Icon name="arrow-forward" size={20} color={colors.textSecondary} />
              <View style={styles.upgradeComparisonItem}>
                <Text style={styles.upgradeComparisonLabel}>Annual</Text>
                <Text style={[styles.upgradeComparisonNew, { color: colors.success }]}>$276/yr</Text>
              </View>
            </View>
            <Button
              title={processing ? 'Processing...' : 'Upgrade to Annual'}
              onPress={handleUpgradeToAnnual}
              loading={processing}
              fullWidth
              style={{ backgroundColor: colors.success }}
            />
          </Card>
        )}

        {/* Upgrade from Trial Card - For users on free trial */}
        {canUpgradeFromTrial && !showCancelConfirm && (
          <Card style={[styles.upgradeCard, { borderColor: primaryColor }]}>
            <View style={styles.upgradeHeader}>
              <View style={[styles.upgradeBadge, { backgroundColor: primaryColor }]}>
                <Icon name="rocket" size={14} color={colors.white} />
                <Text style={styles.upgradeBadgeText}>UPGRADE NOW</Text>
              </View>
            </View>
            <Text style={styles.upgradeTitle}>Ready to Subscribe?</Text>
            <Text style={styles.upgradeDescription}>
              Love True Joy Pro? Subscribe now to ensure uninterrupted access when your trial ends.
            </Text>
            
            {/* Plan Options */}
            <View style={styles.trialUpgradePlans}>
              <TouchableOpacity 
                style={[styles.trialUpgradePlan, { borderColor: colors.border }]}
                onPress={() => handleUpgradeFromTrial('monthly')}
                disabled={processing}
              >
                <View style={styles.trialUpgradePlanInfo}>
                  <Text style={styles.trialUpgradePlanName}>Monthly</Text>
                  <Text style={[styles.trialUpgradePlanPrice, { color: primaryColor }]}>$29/mo</Text>
                </View>
                <Icon name="chevron-forward" size={20} color={primaryColor} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.trialUpgradePlan, styles.trialUpgradePlanRecommended, { borderColor: colors.success }]}
                onPress={() => handleUpgradeFromTrial('annual')}
                disabled={processing}
              >
                <View style={[styles.recommendedBadge, { backgroundColor: colors.success }]}>
                  <Text style={styles.recommendedBadgeText}>BEST VALUE</Text>
                </View>
                <View style={styles.trialUpgradePlanInfo}>
                  <Text style={styles.trialUpgradePlanName}>Annual</Text>
                  <View style={styles.trialUpgradePriceRow}>
                    <Text style={[styles.trialUpgradePlanPrice, { color: colors.success }]}>$276/yr</Text>
                    <Text style={styles.trialUpgradeSavings}>Save $72!</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.success} />
              </TouchableOpacity>
            </View>
            
            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="small" color={primaryColor} />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            )}
          </Card>
        )}

        {/* Features List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pro Features</Text>
          <Card style={styles.featuresCard}>
            {[
              { icon: 'people', text: 'Unlimited client connections' },
              { icon: 'document-text', text: 'Contract & invoice management' },
              { icon: 'clipboard', text: 'Full birth plan access' },
              { icon: 'chatbubbles', text: 'Unlimited messaging' },
              { icon: 'calendar', text: 'Appointment scheduling' },
              { icon: 'analytics', text: 'Practice analytics & insights' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: primaryColor + '15' }]}>
                  <Icon name={feature.icon} size={18} color={primaryColor} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
                <Icon name="checkmark" size={18} color={colors.success} />
              </View>
            ))}
          </Card>
        </View>

        {/* Pricing Plans */}
        {!status?.has_pro_access && pricing?.plans && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            {pricing.plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
              >
                <Card 
                  style={[
                    styles.planCard,
                    selectedPlan === plan.id && { borderColor: primaryColor, borderWidth: 2 }
                  ]}
                >
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planPeriod}>{plan.period}</Text>
                    </View>
                    <View style={styles.planPriceContainer}>
                      <Text style={styles.planPrice}>${plan.price}</Text>
                      <Text style={styles.planPricePeriod}>/{plan.period === 'Monthly' ? 'mo' : 'yr'}</Text>
                    </View>
                  </View>
                  {plan.savings && (
                    <View style={[styles.savingsBadge, { backgroundColor: colors.success + '20' }]}>
                      <Text style={[styles.savingsText, { color: colors.success }]}>Save {plan.savings}%</Text>
                    </View>
                  )}
                  {plan.trial_days > 0 && (
                    <Text style={styles.trialText}>{plan.trial_days}-day free trial included</Text>
                  )}
                  {selectedPlan === plan.id && (
                    <View style={[styles.selectedIndicator, { backgroundColor: primaryColor }]}>
                      <Icon name="checkmark" size={16} color={colors.white} />
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            ))}

            <View style={styles.actionButtons}>
              {status?.subscription_status === 'none' ? (
                <Button
                  title={processing ? 'Starting Trial...' : 'Start Free Trial'}
                  onPress={handleStartTrial}
                  loading={processing}
                  fullWidth
                  disabled={!selectedPlan}
                />
              ) : (
                <Button
                  title={processing ? 'Processing...' : 'Subscribe Now'}
                  onPress={handleSubscribe}
                  loading={processing}
                  fullWidth
                  disabled={!selectedPlan}
                />
              )}
            </View>

            {/* Restore Purchases - iOS/Android only */}
            {Platform.OS !== 'web' && (
              <TouchableOpacity 
                style={styles.restoreButton} 
                onPress={handleRestorePurchases}
                disabled={processing}
              >
                <Text style={[styles.restoreButtonText, { color: primaryColor }]}>
                  Restore Previous Purchase
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.termsText}>
              By subscribing, you agree to our Terms of Service and Privacy Policy. 
              Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.
            </Text>
          </View>
        )}

        {/* Contact Support */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={() => Linking.openURL('https://truejoybirthing.com/contact/')}
          >
            <Icon name="mail-outline" size={20} color={primaryColor} />
            <Text style={[styles.supportButtonText, { color: primaryColor }]}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback Section - Only for paying subscribers */}
        {status?.has_pro_access && !status?.is_trial && (
          <Card style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <Icon name="chatbubble-ellipses-outline" size={24} color={primaryColor} />
              <Text style={styles.feedbackTitle}>Share Your Feedback</Text>
            </View>
            <Text style={styles.feedbackDescription}>
              As a Pro subscriber, your feedback helps us improve True Joy Birthing for all providers.
            </Text>
            <TouchableOpacity 
              style={[styles.feedbackButton, { backgroundColor: primaryColor }]}
              onPress={() => Linking.openURL('https://truejoybirthing.com/feedback/')}
            >
              <Icon name="star-outline" size={18} color={colors.white} />
              <Text style={styles.feedbackButtonText}>Leave Feedback</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.md,
  },
  loadingText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  statusCard: {
    marginBottom: SIZES.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  statusInfo: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  statusTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  statusBadgeText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  statusDetails: {
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: SIZES.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  statusText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manageButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    marginRight: SIZES.xs,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginBottom: SIZES.sm,
  },
  featuresCard: {
    gap: SIZES.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  featureText: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  planCard: {
    marginBottom: SIZES.sm,
    position: 'relative',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  planPeriod: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: SIZES.fontXxl || 28,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  planPricePeriod: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
    marginTop: SIZES.sm,
  },
  savingsText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
  },
  trialText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
  },
  selectedIndicator: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    marginTop: SIZES.md,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    marginTop: SIZES.sm,
  },
  restoreButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: SIZES.md,
    lineHeight: 18,
  },
  supportSection: {
    alignItems: 'center',
    paddingTop: SIZES.lg,
  },
  supportTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginBottom: SIZES.sm,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  supportButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
  },
  // Progress Bar styles
  progressSection: {
    backgroundColor: colors.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radiusSm,
    marginVertical: SIZES.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  progressLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  progressDays: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginTop: SIZES.xs,
    textAlign: 'right',
  },
  // Feedback section styles
  feedbackCard: {
    marginTop: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  feedbackTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  feedbackDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginBottom: SIZES.md,
    lineHeight: 20,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    gap: SIZES.xs,
  },
  feedbackButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.white,
  },
  // Management Panel styles
  managementPanel: {
    marginBottom: SIZES.md,
    backgroundColor: colors.surface,
  },
  managementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  managementTitle: {
    flex: 1,
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
    marginLeft: SIZES.sm,
  },
  managementOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    backgroundColor: colors.white,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  managementOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  managementOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  managementOptionText: {
    flex: 1,
  },
  managementOptionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.text,
    marginBottom: 2,
  },
  managementOptionDesc: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  // Upgrade Card styles
  upgradeCard: {
    marginBottom: SIZES.md,
    borderWidth: 2,
    backgroundColor: colors.success + '08',
  },
  upgradeHeader: {
    marginBottom: SIZES.sm,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    gap: 4,
  },
  upgradeBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: colors.white,
  },
  upgradeTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  upgradeDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginBottom: SIZES.md,
    lineHeight: 20,
  },
  upgradeComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: SIZES.md,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.md,
    gap: SIZES.md,
  },
  upgradeComparisonItem: {
    alignItems: 'center',
  },
  upgradeComparisonLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  upgradeComparisonOld: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
  upgradeComparisonNew: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
  },
  // Trial upgrade styles
  trialUpgradePlans: {
    gap: SIZES.sm,
  },
  trialUpgradePlan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    backgroundColor: colors.white,
  },
  trialUpgradePlanRecommended: {
    borderWidth: 2,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: SIZES.md,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  recommendedBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: colors.white,
  },
  trialUpgradePlanInfo: {
    flex: 1,
  },
  trialUpgradePlanName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.text,
    marginBottom: 2,
  },
  trialUpgradePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  trialUpgradePlanPrice: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
  },
  trialUpgradeSavings: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: colors.success,
    backgroundColor: colors.success + '20',
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSm,
  },
  processingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.md,
    gap: SIZES.sm,
  },
  processingText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
}));
