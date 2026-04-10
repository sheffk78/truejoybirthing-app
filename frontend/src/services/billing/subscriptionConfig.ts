// Subscription and Billing Service Configuration
// This module prepares the app for Apple App Store and Google Play Billing integration

// ============== PRODUCT IDS ==============
// These IDs should match exactly what is configured in App Store Connect and Google Play Console

export const SUBSCRIPTION_PRODUCTS = {
  // Apple App Store Product IDs
  APPLE: {
    PRO_MONTHLY: 'truejoy.pro.monthly',
    PRO_ANNUAL: 'truejoy.pro.annual',
  },
  
  // Google Play Product IDs  
  // In Google Play, the subscription product ID is the same, with different base plans
  GOOGLE: {
    SUBSCRIPTION_ID: 'truejoy_pro',
    BASE_PLANS: {
      MONTHLY: 'monthly',
      ANNUAL: 'annual',
    },
  },
} as const;

// ============== PLAN CONFIGURATION ==============
export const SUBSCRIPTION_PLANS = {
  PRO_MONTHLY: {
    id: 'monthly',
    name: 'True Joy Pro',
    displayName: 'Pro Monthly',
    price: 29.99,
    currency: 'USD',
    period: 'month',
    periodLabel: '/month',
    trialDays: 14,
    appleProductId: SUBSCRIPTION_PRODUCTS.APPLE.PRO_MONTHLY,
    googleBasePlan: SUBSCRIPTION_PRODUCTS.GOOGLE.BASE_PLANS.MONTHLY,
  },
  PRO_ANNUAL: {
    id: 'annual',
    name: 'True Joy Pro',
    displayName: 'Pro Annual',
    price: 274.99,
    currency: 'USD',
    period: 'year',
    periodLabel: '/year',
    trialDays: 14,
    savings: 84.89, // $29.99 * 12 - $274.99
    appleProductId: SUBSCRIPTION_PRODUCTS.APPLE.PRO_ANNUAL,
    googleBasePlan: SUBSCRIPTION_PRODUCTS.GOOGLE.BASE_PLANS.ANNUAL,
  },
} as const;

// ============== SUBSCRIPTION STATUS ==============
export type SubscriptionStatus = 
  | 'none'        // Never subscribed
  | 'trial'       // In 14-day free trial
  | 'active'      // Paid subscription active
  | 'expired'     // Trial or subscription expired
  | 'cancelled'   // User cancelled (may still be active until period end)
  | 'grace'       // In grace period (payment failed, retrying)
  | 'paused';     // Subscription paused (Android only)

export type SubscriptionProvider = 
  | 'apple'       // App Store (iOS)
  | 'google'      // Google Play (Android)
  | 'mock'        // Development/testing
  | 'web';        // Web (development/testing only)

export type PlanType = 'monthly' | 'annual';

// ============== USER ROLE GATING ==============
export type UserRole = 'MOM' | 'DOULA' | 'MIDWIFE';

// Roles that require Pro subscription
export const PRO_REQUIRED_ROLES: UserRole[] = ['DOULA', 'MIDWIFE'];

// Check if a role requires Pro subscription
export const requiresProSubscription = (role: UserRole): boolean => {
  return PRO_REQUIRED_ROLES.includes(role);
};

// Moms are always free
export const isFreeRole = (role: UserRole): boolean => {
  return role === 'MOM';
};

// ============== PRO FEATURES ==============
// Features that require Pro subscription for Doulas/Midwives
export const PRO_FEATURES = [
  'client_management',      // Client list and client detail tools
  'contracts',              // Contracts/Service Agreements creation and management
  'invoices',               // Invoices creation and tracking
  'marketplace_listing',    // Marketplace listing visibility as a provider
  'professional_notes',     // Professional notes / visit notes / prenatal visits
  'birth_summaries',        // Birth summaries for midwives
  'appointments',           // Appointment scheduling
] as const;

export type ProFeature = typeof PRO_FEATURES[number];

// ============== MOM FREE FEATURES ==============
// Features always available to Moms (no subscription required)
export const MOM_FREE_FEATURES = [
  'birth_plan',             // Birth plan creation and editing
  'weekly_tips',            // Weekly tips and affirmations
  'timeline',               // Pregnancy timeline
  'wellness_checkin',       // Wellness check-ins
  'my_team',                // My Team - connect with providers
  'postpartum_content',     // Postpartum support content
  'marketplace_search',     // Search and view provider marketplace
  'messaging',              // Message with connected providers
] as const;

// ============== STORE MANAGEMENT URLS ==============
export const STORE_MANAGEMENT_URLS = {
  // iOS: Opens Settings > [User Name] > Subscriptions
  APPLE: 'https://apps.apple.com/account/subscriptions',
  
  // Android: Opens Google Play subscription management
  GOOGLE: 'https://play.google.com/store/account/subscriptions',
} as const;

// ============== TRIAL CONFIGURATION ==============
export const TRIAL_CONFIG = {
  durationDays: 14,
  requiresPaymentMethod: false, // iOS/Android handle this
  canRestartTrial: false, // One trial per account
} as const;

// ============== UI COPY ==============
export const SUBSCRIPTION_COPY = {
  // Plan names
  planName: 'True Joy Pro',
  
  // Trial messaging
  trialTitle: 'Start Your Free Trial',
  trialSubtitle: 'Get 14 days of full access to all Pro features',
  trialCta: 'Start 14-Day Free Trial',
  trialNoCard: 'No credit card required to start trial',
  
  // Subscription messaging
  subscribeTitle: 'Subscribe to Pro',
  subscribeCta: 'Subscribe Now',
  manageSubscription: 'Manage Subscription',
  
  // Billing disclaimer
  billingDisclaimer: 'Subscriptions are billed through your App Store or Google Play account. Cancel anytime from your device settings.',
  
  // Mom messaging
  momFreeTitle: 'Free for Moms',
  momFreeSubtitle: 'True Joy Birthing is completely free for birthing moms.',
  
  // Pro feature gating
  proFeatureLockedTitle: 'Pro Feature',
  proFeatureLockedMessage: (feature: string) => 
    `${feature} requires True Joy Pro. Start your free 14-day trial to unlock all professional tools.`,
  
  // Status messages
  trialActive: (daysRemaining: number) => 
    `Trial Active - ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`,
  trialExpired: 'Trial Expired - Subscribe to continue',
  subscriptionActive: (planType: PlanType) => 
    `Pro ${planType === 'annual' ? 'Annual' : 'Monthly'} - Active`,
  subscriptionExpiring: (date: string) => 
    `Subscription expires ${date}`,
} as const;

// ============== INTERFACES ==============
export interface SubscriptionState {
  status: SubscriptionStatus;
  planType: PlanType | null;
  provider: SubscriptionProvider | null;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
  daysRemaining: number | null;
  isTrialing: boolean;
  hasProAccess: boolean;
  
  // Store-specific data
  storeTransactionId: string | null;
  storeOriginalTransactionId: string | null; // For subscription restoration
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  status?: SubscriptionStatus;
}

// ============== HELPER FUNCTIONS ==============

/**
 * Check if user has Pro access based on role and subscription status
 */
export const hasProAccess = (
  userRole: UserRole,
  subscriptionStatus: SubscriptionStatus
): boolean => {
  // Moms never need Pro - they have full access to mom features
  if (isFreeRole(userRole)) {
    return false; // Not applicable - moms don't use Pro features
  }
  
  // For providers (Doula/Midwife), check subscription status
  return subscriptionStatus === 'trial' || subscriptionStatus === 'active';
};

/**
 * Get the appropriate store management URL based on platform
 */
export const getManageSubscriptionUrl = (provider: SubscriptionProvider): string | null => {
  switch (provider) {
    case 'apple':
      return STORE_MANAGEMENT_URLS.APPLE;
    case 'google':
      return STORE_MANAGEMENT_URLS.GOOGLE;
    default:
      return null;
  }
};

/**
 * Map store product ID to internal plan type
 */
export const mapProductIdToPlan = (
  productId: string,
  provider: SubscriptionProvider
): PlanType | null => {
  if (provider === 'apple') {
    if (productId === SUBSCRIPTION_PRODUCTS.APPLE.PRO_MONTHLY) return 'monthly';
    if (productId === SUBSCRIPTION_PRODUCTS.APPLE.PRO_ANNUAL) return 'annual';
  } else if (provider === 'google') {
    // Google uses base plans within a single subscription product
    if (productId.includes('monthly')) return 'monthly';
    if (productId.includes('annual')) return 'annual';
  }
  return null;
};

/**
 * Get product ID for a plan based on provider
 */
export const getProductIdForPlan = (
  planType: PlanType,
  provider: 'apple' | 'google'
): string => {
  if (provider === 'apple') {
    return planType === 'monthly' 
      ? SUBSCRIPTION_PRODUCTS.APPLE.PRO_MONTHLY 
      : SUBSCRIPTION_PRODUCTS.APPLE.PRO_ANNUAL;
  } else {
    // For Google, return subscription ID (base plan is specified separately)
    return SUBSCRIPTION_PRODUCTS.GOOGLE.SUBSCRIPTION_ID;
  }
};

export default {
  SUBSCRIPTION_PRODUCTS,
  SUBSCRIPTION_PLANS,
  PRO_FEATURES,
  MOM_FREE_FEATURES,
  STORE_MANAGEMENT_URLS,
  TRIAL_CONFIG,
  SUBSCRIPTION_COPY,
  hasProAccess,
  requiresProSubscription,
  isFreeRole,
  getManageSubscriptionUrl,
  mapProductIdToPlan,
  getProductIdForPlan,
};
