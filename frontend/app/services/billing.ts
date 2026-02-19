/**
 * Billing Service Module for True Joy Birthing
 * 
 * This module provides in-app purchase functionality placeholders.
 * For web, it provides mock implementations.
 * For native (iOS/Android), use the native-specific billing module.
 * 
 * Product IDs:
 * - Apple: truejoy.pro.monthly, truejoy.pro.annual
 * - Google: truejoy_pro_monthly, truejoy_pro_annual
 */

import { Platform } from 'react-native';
import { SUBSCRIPTION_CONFIG, ProductId, PlatformProducts } from '../config/subscriptionConfig';

// Types for billing
export interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  subscriptionPeriod?: string;
  freeTrialPeriod?: string;
  localizedPrice?: string;
}

export interface Purchase {
  productId: string;
  transactionId: string;
  transactionDate: string;
  transactionReceipt: string;
  purchaseState: 'purchased' | 'pending' | 'refunded';
  originalTransactionId?: string;
}

export interface SubscriptionInfo {
  isActive: boolean;
  productId: string | null;
  expiryDate: string | null;
  provider: 'APPLE' | 'GOOGLE' | 'MOCK' | null;
  autoRenewing: boolean;
}

export type BillingPlatform = 'ios' | 'android' | 'web';

// Get current platform
export function getCurrentPlatform(): BillingPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

// Get subscription provider based on platform
export function getSubscriptionProvider(): 'APPLE' | 'GOOGLE' | 'WEB' {
  const platform = getCurrentPlatform();
  if (platform === 'ios') return 'APPLE';
  if (platform === 'android') return 'GOOGLE';
  return 'WEB';
}

// Get product IDs for current platform
export function getPlatformProductIds(): PlatformProducts {
  const platform = getCurrentPlatform();
  return SUBSCRIPTION_CONFIG.productIds[platform];
}

// Get all product SKUs as array
export function getProductSkus(): string[] {
  const productIds = getPlatformProductIds();
  return [productIds.monthly, productIds.annual];
}

/**
 * Initialize the billing client
 */
export async function initializeBilling(): Promise<boolean> {
  const platform = getCurrentPlatform();
  console.log(`[Billing] Initializing billing for platform: ${platform}`);
  
  // On web, always return true (mock mode)
  // Native implementations should use platform-specific modules
  return true;
}

/**
 * Fetch available subscription products
 */
export async function fetchProducts(): Promise<Product[]> {
  // Return mock products (native apps should use platform-specific modules)
  return getMockProducts();
}

/**
 * Initiate a subscription purchase
 */
export async function purchaseProduct(productId: ProductId): Promise<Purchase | null> {
  console.log(`[Billing] Purchase requested for: ${productId}`);
  console.log('[Billing] Web platform - use mock trial or native app for real IAP');
  return null;
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<Purchase[]> {
  console.log('[Billing] Restore purchases - not available on web');
  return [];
}

/**
 * Validate receipt with backend
 */
export async function validateReceipt(
  receipt: string,
  provider: 'APPLE' | 'GOOGLE',
  productId: string,
  sessionToken: string,
  apiBaseUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/subscription/validate-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        receipt,
        subscription_provider: provider,
        product_id: productId,
      }),
    });
    
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[Billing] Receipt validation error:', error);
    return false;
  }
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionInfo> {
  return {
    isActive: false,
    productId: null,
    expiryDate: null,
    provider: null,
    autoRenewing: false,
  };
}

/**
 * Open subscription management
 */
export async function openSubscriptionManagement(): Promise<void> {
  console.log('[Billing] Subscription management - redirect to app store on native');
}

/**
 * Cleanup billing resources
 */
export async function cleanupBilling(): Promise<void> {
  console.log('[Billing] Cleanup complete');
}

/**
 * Check if IAP is available
 */
export function isIAPAvailable(): boolean {
  // Only available on native platforms
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Get subscription management instructions
 */
export function getSubscriptionManagementInstructions(provider: 'APPLE' | 'GOOGLE' | 'WEB' | null): string {
  switch (provider) {
    case 'APPLE':
      return 'To manage your subscription, go to Settings > [Your Name] > Subscriptions on your iPhone.';
    case 'GOOGLE':
      return 'To manage your subscription, open the Google Play Store app, tap Menu > Subscriptions.';
    default:
      return 'Please manage your subscription through the app on your iOS or Android device.';
  }
}

// Helper: Get mock products for web/testing
function getMockProducts(): Product[] {
  return [
    {
      productId: SUBSCRIPTION_CONFIG.productIds.ios.monthly,
      title: SUBSCRIPTION_CONFIG.plans.monthly.name,
      description: 'Monthly access to True Joy Pro features',
      price: `$${SUBSCRIPTION_CONFIG.plans.monthly.price}`,
      priceAmountMicros: SUBSCRIPTION_CONFIG.plans.monthly.price * 1000000,
      priceCurrencyCode: 'USD',
      localizedPrice: `$${SUBSCRIPTION_CONFIG.plans.monthly.price}/month`,
      subscriptionPeriod: 'P1M',
      freeTrialPeriod: `P${SUBSCRIPTION_CONFIG.trialDays}D`,
    },
    {
      productId: SUBSCRIPTION_CONFIG.productIds.ios.annual,
      title: SUBSCRIPTION_CONFIG.plans.annual.name,
      description: 'Annual access to True Joy Pro features - Save $72!',
      price: `$${SUBSCRIPTION_CONFIG.plans.annual.price}`,
      priceAmountMicros: SUBSCRIPTION_CONFIG.plans.annual.price * 1000000,
      priceCurrencyCode: 'USD',
      localizedPrice: `$${SUBSCRIPTION_CONFIG.plans.annual.price}/year`,
      subscriptionPeriod: 'P1Y',
      freeTrialPeriod: `P${SUBSCRIPTION_CONFIG.trialDays}D`,
    },
  ];
}

export default {
  initializeBilling,
  fetchProducts,
  purchaseProduct,
  restorePurchases,
  validateReceipt,
  getSubscriptionStatus,
  openSubscriptionManagement,
  cleanupBilling,
  isIAPAvailable,
  getCurrentPlatform,
  getSubscriptionProvider,
  getPlatformProductIds,
  getProductSkus,
  getSubscriptionManagementInstructions,
};
