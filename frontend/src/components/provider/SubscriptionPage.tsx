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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { COLORS, SIZES, FONTS } from '../../constants/theme';

interface SubscriptionPageProps {
  primaryColor: string;
  role: 'MIDWIFE' | 'DOULA';
}

export default function SubscriptionPage({ primaryColor, role }: SubscriptionPageProps) {
  const router = useRouter();
  const { status, pricing, isLoading, fetchStatus, fetchPricing, startTrial, activateSubscription, getSubscriptionManageUrl } = useSubscriptionStore();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchPricing();
  }, []);

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

  const handleManageSubscription = () => {
    // Navigate to subscription management or show options
    Alert.alert(
      'Manage Subscription',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Contact Support', 
          onPress: () => Linking.openURL('https://truejoybirthing.com/contact/')
        },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Cancel Subscription',
              'To cancel your subscription, please contact our support team. We\'re here to help!',
              [
                { text: 'OK' },
                { text: 'Contact Support', onPress: () => Linking.openURL('https://truejoybirthing.com/contact/') }
              ]
            );
          }
        }
      ]
    );
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
      active: { color: COLORS.success, bgColor: COLORS.success + '20', text: 'Active' },
      trial: { color: COLORS.warning, bgColor: COLORS.warning + '20', text: `Trial - ${status.days_remaining} days left` },
      expired: { color: COLORS.error, bgColor: COLORS.error + '20', text: 'Expired' },
      cancelled: { color: COLORS.textSecondary, bgColor: COLORS.border, text: 'Cancelled' },
      none: { color: COLORS.textSecondary, bgColor: COLORS.border, text: 'No Subscription' },
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
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
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
                <Icon name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.statusText}>Full access to all features</Text>
              </View>
              {status.subscription_end_date && (
                <View style={styles.statusRow}>
                  <Icon name="calendar-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.statusText}>
                    {status.auto_renewing ? 'Renews' : 'Expires'}: {formatDate(status.subscription_end_date)}
                  </Text>
                </View>
              )}
              {status.is_trial && status.trial_end_date && (
                <View style={styles.statusRow}>
                  <Icon name="time-outline" size={18} color={COLORS.warning} />
                  <Text style={styles.statusText}>Trial ends: {formatDate(status.trial_end_date)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.statusDetails}>
              <View style={styles.statusRow}>
                <Icon name="alert-circle-outline" size={18} color={COLORS.warning} />
                <Text style={styles.statusText}>Subscribe to accept new clients</Text>
              </View>
              <View style={styles.statusRow}>
                <Icon name="lock-closed-outline" size={18} color={COLORS.textSecondary} />
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
                <Icon name="checkmark" size={18} color={COLORS.success} />
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
                    <View style={[styles.savingsBadge, { backgroundColor: COLORS.success + '20' }]}>
                      <Text style={[styles.savingsText, { color: COLORS.success }]}>Save {plan.savings}%</Text>
                    </View>
                  )}
                  {plan.trial_days > 0 && (
                    <Text style={styles.trialText}>{plan.trial_days}-day free trial included</Text>
                  )}
                  {selectedPlan === plan.id && (
                    <View style={[styles.selectedIndicator, { backgroundColor: primaryColor }]}>
                      <Icon name="checkmark" size={16} color={COLORS.white} />
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
            onPress={() => Linking.openURL('mailto:support@truejoybirthing.com')}
          >
            <Icon name="mail-outline" size={20} color={primaryColor} />
            <Text style={[styles.supportButtonText, { color: primaryColor }]}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
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
    borderTopColor: COLORS.border,
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
    color: COLORS.textPrimary,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
  },
  planPeriod: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: SIZES.fontXxl || 28,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  planPricePeriod: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
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
    color: COLORS.textSecondary,
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
  termsText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
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
    color: COLORS.textSecondary,
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
});
