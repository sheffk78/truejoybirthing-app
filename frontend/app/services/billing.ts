/**
 * Billing Service Module for True Joy Birthing
 * 
 * This module provides in-app purchase functionality.
 * On native platforms (iOS/Android), it uses react-native-iap.
 * On web, it provides mock implementations for testing.
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

// Module state
let isInitialized = false;

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
 * On web, this is a no-op. On native, it will connect to the store.
 */
export async function initializeBilling(): Promise<boolean> {
  const platform = getCurrentPlatform();
  
  console.log(`[Billing] Initializing billing for platform: ${platform}`);
  
  if (platform === 'web') {
    console.log('[Billing] Web platform - using mock billing');
    isInitialized = true;
    return true;
  }
  
  // For native platforms, react-native-iap would be initialized here
  // This code path is only reached when running on iOS/Android
  try {
    // Dynamic import to avoid bundling issues on web
    const RNIap = require('react-native-iap');
    const result = await RNIap.initConnection();
    console.log('[Billing] Native connection initialized:', result);
    
    if (platform === 'android') {
      try {
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
      } catch (e) {
        console.warn('[Billing] Error flushing failed purchases:', e);
      }
    }
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('[Billing] Failed to initialize:', error);
    return false;
  }
}

/**
 * Fetch available subscription products
 */
export async function fetchProducts(): Promise<Product[]> {
  const platform = getCurrentPlatform();
  
  if (platform === 'web') {
    return getMockProducts();
  }
  
  if (!isInitialized) {
    await initializeBilling();
  }
  
  try {
    const RNIap = require('react-native-iap');
    const skus = getProductSkus();
    const subscriptions = await RNIap.getSubscriptions({ skus });
    
    return subscriptions.map((sub: any) => ({
      productId: sub.productId,
      title: sub.title || sub.name || 'True Joy Pro',
      description: sub.description || '',
      price: sub.localizedPrice || `$${SUBSCRIPTION_CONFIG.plans.monthly.price}`,
      priceAmountMicros: parseInt(sub.price || '0') * 1000000,
      priceCurrencyCode: sub.currency || 'USD',
      localizedPrice: sub.localizedPrice,
      subscriptionPeriod: 'P1M',
      freeTrialPeriod: `P${SUBSCRIPTION_CONFIG.trialDays}D`,
    }));
  } catch (error) {
    console.error('[Billing] Error fetching products:', error);
    return getMockProducts();
  }
}

/**
 * Initiate a subscription purchase
 */
export async function purchaseProduct(productId: ProductId): Promise<Purchase | null> {
  const platform = getCurrentPlatform();
  const productIds = getPlatformProductIds();
  const storeProductId = productId === 'monthly' ? productIds.monthly : productIds.annual;
  
  console.log(`[Billing] Initiating purchase for: ${storeProductId}`);
  
  if (platform === 'web') {
    console.log('[Billing] Web platform - cannot process real IAP');
    return null;
  }
  
  if (!isInitialized) {
    await initializeBilling();
  }
  
  try {
    const RNIap = require('react-native-iap');
    
    if (Platform.OS === 'ios') {
      await RNIap.requestSubscription({ sku: storeProductId });
    } else {
      const subscriptions = await RNIap.getSubscriptions({ skus: [storeProductId] });
      if (subscriptions.length > 0) {
        const offerToken = subscriptions[0]?.subscriptionOfferDetails?.[0]?.offerToken;
        await RNIap.requestSubscription({
          sku: storeProductId,
          ...(offerToken && { subscriptionOffers: [{ sku: storeProductId, offerToken }] }),
        });
      }
    }
    
    return null; // Purchase result comes through listener
  } catch (error: any) {
    console.error('[Billing] Purchase error:', error);
    throw error;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<Purchase[]> {
  const platform = getCurrentPlatform();
  
  if (platform === 'web') {
    return [];
  }
  
  if (!isInitialized) {
    await initializeBilling();
  }
  
  try {
    const RNIap = require('react-native-iap');
    const availablePurchases = await RNIap.getAvailablePurchases();
    
    return availablePurchases.map((p: any) => ({
      productId: p.productId,
      transactionId: p.transactionId || '',
      transactionDate: p.transactionDate ? new Date(parseInt(p.transactionDate)).toISOString() : '',
      transactionReceipt: p.transactionReceipt || '',
      purchaseState: 'purchased',
    }));
  } catch (error) {
    console.error('[Billing] Error restoring purchases:', error);
    return [];
  }
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
    
    if (!response.ok) {
      return false;
    }
    
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
  const platform = getCurrentPlatform();
  const provider = getSubscriptionProvider();
  
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
 */
export async function openSubscriptionManagement(): Promise<void> {
  const platform = getCurrentPlatform();
  
  if (platform === 'web') {
    console.log('[Billing] Web users must manage subscriptions via mobile app');
    return;
  }
  
  try {
    const RNIap = require('react-native-iap');
    await RNIap.deepLinkToSubscriptions();
  } catch (error) {
    console.error('[Billing] Error opening subscription management:', error);
  }
}

/**
 * Cleanup billing resources
 */
export async function cleanupBilling(): Promise<void> {
  if (getCurrentPlatform() === 'web') {
    isInitialized = false;
    return;
  }
  
  try {
    const RNIap = require('react-native-iap');
    await RNIap.endConnection();
    isInitialized = false;
  } catch (error) {
    console.error('[Billing] Error during cleanup:', error);
  }
}

/**
 * Check if IAP is available
 */
export function isIAPAvailable(): boolean {
  const platform = getCurrentPlatform();
  return platform === 'ios' || platform === 'android';
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
