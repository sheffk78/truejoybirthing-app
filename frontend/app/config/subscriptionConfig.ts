/**
 * Subscription Configuration for True Joy Birthing
 * 
 * This file contains all subscription-related constants and configuration
 * for both Apple App Store and Google Play Store integrations.
 * 
 * IMPORTANT: These product IDs must match exactly what is configured in:
 * - Apple App Store Connect
 * - Google Play Console
 */

// Product ID types
export type ProductId = 'monthly' | 'annual';
export type SubscriptionProvider = 'APPLE' | 'GOOGLE' | 'MOCK' | 'WEB';
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired' | 'cancelled' | 'free';

// Platform-specific product IDs
export interface PlatformProducts {
  monthly: string;
  annual: string;
}

// Plan details
export interface PlanDetails {
  id: ProductId;
  name: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
}

// Full subscription configuration
export interface SubscriptionConfiguration {
  // Trial configuration
  trialDays: number;
  
  // Product IDs by platform
  productIds: {
    ios: PlatformProducts;
    android: PlatformProducts;
    web: PlatformProducts; // Used for mock/testing
  };
  
  // Plan details
  plans: {
    monthly: PlanDetails;
    annual: PlanDetails;
  };
  
  // Features included in Pro subscription
  proFeatures: string[];
  
  // Features free for Moms
  momFeatures: string[];
}

/**
 * Main subscription configuration
 * 
 * NOTE: Product IDs follow platform conventions:
 * - Apple: Reverse domain notation with dots (com.example.product)
 * - Google: Snake case with underscores (com_example_product)
 */
export const SUBSCRIPTION_CONFIG: SubscriptionConfiguration = {
  // 30-day free trial for all Pro users
  trialDays: 30,
  
  // Product IDs for each platform
  // These MUST match App Store Connect / Play Console configuration
  productIds: {
    ios: {
      monthly: 'truejoy.pro.monthly',
      annual: 'truejoy.pro.annual',
    },
    android: {
      monthly: 'truejoy_pro_monthly',
      annual: 'truejoy_pro_annual',
    },
    // Web/mock IDs for testing
    web: {
      monthly: 'web_truejoy_pro_monthly',
      annual: 'web_truejoy_pro_annual',
    },
  },
  
  // Plan pricing and details
  plans: {
    monthly: {
      id: 'monthly',
      name: 'True Joy Pro – Monthly',
      price: 29.99,
      period: 'month',
      features: [
        'Client management and history',
        'Digital contracts and e-signatures',
        'Invoices and payments',
        'Notes and visit summaries',
        'Marketplace profile and visibility',
      ],
    },
    annual: {
      id: 'annual',
      name: 'True Joy Pro – Annual',
      price: 274.99, // ~$22.92/month billed annually (save ~$85)
      period: 'year',
      features: [
        'Client management and history',
        'Digital contracts and e-signatures',
        'Invoices and payments',
        'Notes and visit summaries',
        'Marketplace profile and visibility',
        'Save ~$85 vs monthly',
      ],
    },
  },
  
  // All Pro features (for marketing/display)
  proFeatures: [
    'Unlimited client management',
    'Digital contracts with e-signatures',
    'Professional invoicing system',
    'Detailed client notes and history',
    'Visit tracking and summaries',
    'Marketplace profile visibility',
    'Priority support',
  ],
  
  // Mom features (always free)
  momFeatures: [
    'Weekly tips and affirmations',
    'Joyful Birth Plan builder',
    'Pregnancy timeline tracking',
    'Postpartum support tools',
    'Connect with your care team',
    'Message your providers',
  ],
};

/**
 * Helper functions
 */

// Calculate annual savings
export function getAnnualSavings(): number {
  const monthlyCost = SUBSCRIPTION_CONFIG.plans.monthly.price * 12;
  const annualCost = SUBSCRIPTION_CONFIG.plans.annual.price;
  return monthlyCost - annualCost;
}

// Get monthly equivalent for annual plan
export function getAnnualMonthlyEquivalent(): number {
  return Math.round(SUBSCRIPTION_CONFIG.plans.annual.price / 12);
}

// Check if user role requires subscription
export function requiresSubscription(role: string): boolean {
  return role === 'DOULA' || role === 'MIDWIFE';
}

// Get human-readable trial period
export function getTrialPeriodText(): string {
  return `${SUBSCRIPTION_CONFIG.trialDays}-day free trial`;
}

// Get subscription provider display name
export function getProviderDisplayName(provider: SubscriptionProvider): string {
  switch (provider) {
    case 'APPLE':
      return 'App Store';
    case 'GOOGLE':
      return 'Google Play';
    case 'MOCK':
      return 'Test Mode';
    case 'WEB':
      return 'Web';
    default:
      return 'Unknown';
  }
}

// Get subscription status display text
export function getStatusDisplayText(status: SubscriptionStatus, daysRemaining?: number | null): string {
  switch (status) {
    case 'none':
      return 'No subscription';
    case 'trial':
      if (daysRemaining !== undefined && daysRemaining !== null) {
        return `Trial - ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
      }
      return 'Trial active';
    case 'active':
      return 'Pro subscription active';
    case 'expired':
      return 'Subscription expired';
    case 'cancelled':
      return 'Subscription cancelled';
    case 'free':
      return 'Free access';
    default:
      return 'Unknown status';
  }
}

// Feature gating helper
export function isProFeature(featureName: string): boolean {
  const proOnlyFeatures = [
    'clients',
    'contracts',
    'invoices',
    'notes',
    'visits',
    'marketplace_visibility',
  ];
  return proOnlyFeatures.includes(featureName.toLowerCase());
}

export default SUBSCRIPTION_CONFIG;
