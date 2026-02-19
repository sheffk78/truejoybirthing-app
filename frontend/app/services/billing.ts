/**
 * Billing Service Module for True Joy Birthing
 * 
 * This module provides placeholder functions for handling in-app purchases
 * through Apple StoreKit and Google Play Billing. It's designed to be
 * swapped out with actual IAP implementations when ready for production.
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
}

export interface Purchase {
  productId: string;
  transactionId: string;
  transactionDate: string;
  transactionReceipt: string;
  purchaseState: 'purchased' | 'pending' | 'refunded';
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

/**
 * Initialize the billing client
 * This should be called when the app starts
 * 
 * @placeholder - Will integrate with react-native-iap or expo-in-app-purchases
 */
export async function initializeBilling(): Promise<boolean> {
  const platform = getCurrentPlatform();
  
  console.log(`[Billing] Initializing billing for platform: ${platform}`);
  
  if (platform === 'web') {
    console.log('[Billing] Web platform - billing disabled');
    return false;
  }
  
  // TODO: Implement actual initialization
  // iOS: import { initConnection } from 'react-native-iap';
  // Android: Similar initialization
  
  console.log('[Billing] MOCK: Billing initialized successfully');
  return true;
}

/**
 * Fetch available products from the store
 * 
 * @placeholder - Will fetch actual products from App Store / Play Store
 */
export async function fetchProducts(): Promise<Product[]> {
  const platform = getCurrentPlatform();
  const productIds = getPlatformProductIds();
  
  console.log(`[Billing] Fetching products for platform: ${platform}`);
  console.log(`[Billing] Product IDs:`, productIds);
  
  if (platform === 'web') {
    // Return mock products for web testing
    return getMockProducts();
  }
  
  // TODO: Implement actual product fetching
  // iOS: import { getProducts } from 'react-native-iap';
  // await getProducts({ skus: [productIds.monthly, productIds.annual] });
  
  console.log('[Billing] MOCK: Returning mock products');
  return getMockProducts();
}

/**
 * Initiate a purchase for a specific product
 * 
 * @param productId - The product ID to purchase (monthly or annual)
 * @placeholder - Will trigger actual IAP purchase flow
 */
export async function purchaseProduct(productId: ProductId): Promise<Purchase | null> {
  const platform = getCurrentPlatform();
  const productIds = getPlatformProductIds();
  
  // Get the actual store product ID
  const storeProductId = productId === 'monthly' ? productIds.monthly : productIds.annual;
  
  console.log(`[Billing] Initiating purchase for: ${storeProductId}`);
  console.log(`[Billing] Platform: ${platform}`);
  
  if (platform === 'web') {
    console.log('[Billing] Web platform - cannot process IAP');
    return null;
  }
  
  // TODO: Implement actual purchase flow
  // iOS: import { requestPurchase } from 'react-native-iap';
  // const purchase = await requestPurchase({ sku: storeProductId });
  
  // Return mock purchase for testing
  console.log('[Billing] MOCK: Returning mock purchase');
  return {
    productId: storeProductId,
    transactionId: `mock_txn_${Date.now()}`,
    transactionDate: new Date().toISOString(),
    transactionReceipt: `mock_receipt_${Date.now()}`,
    purchaseState: 'purchased',
  };
}

/**
 * Restore previous purchases
 * Required for App Store / Play Store compliance
 * 
 * @placeholder - Will restore actual purchases from stores
 */
export async function restorePurchases(): Promise<Purchase[]> {
  const platform = getCurrentPlatform();
  
  console.log(`[Billing] Restoring purchases for platform: ${platform}`);
  
  if (platform === 'web') {
    console.log('[Billing] Web platform - no purchases to restore');
    return [];
  }
  
  // TODO: Implement actual restore
  // iOS: import { getAvailablePurchases } from 'react-native-iap';
  // const purchases = await getAvailablePurchases();
  
  console.log('[Billing] MOCK: No purchases to restore');
  return [];
}

/**
 * Validate a receipt with the backend
 * This should be called after a successful purchase to update user subscription
 * 
 * @param receipt - The purchase receipt from the store
 * @param provider - The subscription provider (APPLE or GOOGLE)
 */
export async function validateReceipt(
  receipt: string,
  provider: 'APPLE' | 'GOOGLE',
  sessionToken: string
): Promise<boolean> {
  console.log(`[Billing] Validating receipt with backend`);
  console.log(`[Billing] Provider: ${provider}`);
  
  try {
    // TODO: Implement actual backend validation
    // The backend should:
    // 1. Verify the receipt with Apple/Google servers
    // 2. Update the user's subscription status in the database
    // 3. Return success/failure
    
    // For now, this is a placeholder that would call:
    // POST /api/subscription/validate-receipt
    // { receipt, provider }
    
    console.log('[Billing] MOCK: Receipt validated successfully');
    return true;
  } catch (error) {
    console.error('[Billing] Receipt validation failed:', error);
    return false;
  }
}

/**
 * Get current subscription status from the store
 * 
 * @placeholder - Will check actual subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionInfo> {
  const platform = getCurrentPlatform();
  const provider = getSubscriptionProvider();
  
  console.log(`[Billing] Getting subscription status for platform: ${platform}`);
  
  // TODO: Implement actual status check
  // This would involve checking with the respective store
  
  console.log('[Billing] MOCK: Returning inactive subscription');
  return {
    isActive: false,
    productId: null,
    expiryDate: null,
    provider: platform === 'web' ? null : (provider as 'APPLE' | 'GOOGLE'),
    autoRenewing: false,
  };
}

/**
 * Open subscription management
 * Directs users to App Store / Play Store to manage their subscription
 */
export async function openSubscriptionManagement(): Promise<void> {
  const platform = getCurrentPlatform();
  
  console.log(`[Billing] Opening subscription management for platform: ${platform}`);
  
  // TODO: Implement platform-specific subscription management
  // iOS: Opens App Store subscription settings
  // Android: Opens Play Store subscription settings
  // Web: Show message to manage via mobile app
  
  if (platform === 'ios') {
    // Linking.openURL('https://apps.apple.com/account/subscriptions');
    console.log('[Billing] Would open App Store subscriptions');
  } else if (platform === 'android') {
    // Linking.openURL('https://play.google.com/store/account/subscriptions');
    console.log('[Billing] Would open Play Store subscriptions');
  } else {
    console.log('[Billing] Web users must manage subscriptions via mobile app');
  }
}

/**
 * Clean up billing resources
 * Should be called when the app is closing
 */
export async function cleanupBilling(): Promise<void> {
  console.log('[Billing] Cleaning up billing resources');
  
  // TODO: Implement cleanup
  // iOS/Android: endConnection() from react-native-iap
}

/**
 * Check if IAP is available on this platform
 */
export function isIAPAvailable(): boolean {
  const platform = getCurrentPlatform();
  // IAP is only available on iOS and Android
  return platform === 'ios' || platform === 'android';
}

/**
 * Get the appropriate subscription management instructions based on provider
 */
export function getSubscriptionManagementInstructions(provider: 'APPLE' | 'GOOGLE' | 'WEB' | null): string {
  switch (provider) {
    case 'APPLE':
      return 'To manage your subscription, go to Settings > [Your Name] > Subscriptions on your iPhone, or visit the App Store.';
    case 'GOOGLE':
      return 'To manage your subscription, open the Google Play Store app, tap Menu > Subscriptions.';
    case 'WEB':
    default:
      return 'Please manage your subscription through the app on your iOS or Android device.';
  }
}

// Helper: Get mock products for testing
function getMockProducts(): Product[] {
  return [
    {
      productId: SUBSCRIPTION_CONFIG.productIds.ios.monthly,
      title: SUBSCRIPTION_CONFIG.plans.monthly.name,
      description: 'Monthly access to True Joy Pro features',
      price: `$${SUBSCRIPTION_CONFIG.plans.monthly.price}`,
      priceAmountMicros: SUBSCRIPTION_CONFIG.plans.monthly.price * 1000000,
      priceCurrencyCode: 'USD',
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
  getSubscriptionManagementInstructions,
};
