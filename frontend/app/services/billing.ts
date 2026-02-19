/**
 * Billing Service Module for True Joy Birthing
 * 
 * This module provides in-app purchase functionality using react-native-iap
 * for Apple StoreKit (iOS) and Google Play Billing (Android).
 * 
 * Product IDs:
 * - Apple: truejoy.pro.monthly, truejoy.pro.annual
 * - Google: truejoy_pro_monthly, truejoy_pro_annual
 */

import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
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
let purchaseUpdateSubscription: RNIap.PurchaseStateAndroid | null = null;
let purchaseErrorSubscription: RNIap.SubscriptionIOS | null = null;

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
 * This should be called when the app starts
 */
export async function initializeBilling(): Promise<boolean> {
  const platform = getCurrentPlatform();
  
  console.log(`[Billing] Initializing billing for platform: ${platform}`);
  
  if (platform === 'web') {
    console.log('[Billing] Web platform - billing disabled');
    return false;
  }
  
  if (isInitialized) {
    console.log('[Billing] Already initialized');
    return true;
  }
  
  try {
    // Initialize connection to the store
    const result = await RNIap.initConnection();
    console.log('[Billing] Connection initialized:', result);
    
    // Flush failed purchases (Android only - important for reliability)
    if (platform === 'android') {
      try {
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
        console.log('[Billing] Flushed failed Android purchases');
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
 * Set up purchase listeners for handling transactions
 * @param onPurchaseSuccess - Called when a purchase is successful
 * @param onPurchaseError - Called when a purchase fails
 */
export function setupPurchaseListeners(
  onPurchaseSuccess: (purchase: RNIap.Purchase) => void,
  onPurchaseError: (error: RNIap.PurchaseError) => void
): () => void {
  // Purchase update listener
  purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
    console.log('[Billing] Purchase updated:', purchase.productId);
    
    const receipt = purchase.transactionReceipt;
    if (receipt) {
      try {
        // Acknowledge the purchase (required for Google Play)
        if (Platform.OS === 'android' && !purchase.isAcknowledgedAndroid) {
          await RNIap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken! });
          console.log('[Billing] Purchase acknowledged on Android');
        }
        
        // For iOS, finish the transaction
        if (Platform.OS === 'ios') {
          await RNIap.finishTransaction({ purchase, isConsumable: false });
          console.log('[Billing] Transaction finished on iOS');
        }
        
        onPurchaseSuccess(purchase);
      } catch (e) {
        console.error('[Billing] Error processing purchase:', e);
      }
    }
  }) as any;
  
  // Purchase error listener
  purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
    console.error('[Billing] Purchase error:', error);
    onPurchaseError(error);
  }) as any;
  
  // Return cleanup function
  return () => {
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove?.();
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove?.();
    }
  };
}

/**
 * Fetch available subscription products from the store
 */
export async function fetchProducts(): Promise<Product[]> {
  const platform = getCurrentPlatform();
  
  if (platform === 'web') {
    console.log('[Billing] Web platform - returning mock products');
    return getMockProducts();
  }
  
  if (!isInitialized) {
    console.warn('[Billing] Not initialized, initializing now...');
    await initializeBilling();
  }
  
  const skus = getProductSkus();
  console.log(`[Billing] Fetching products for SKUs:`, skus);
  
  try {
    // Fetch subscriptions (not one-time products)
    const subscriptions = await RNIap.getSubscriptions({ skus });
    console.log('[Billing] Fetched subscriptions:', subscriptions.length);
    
    // Map to our Product interface
    const products: Product[] = subscriptions.map((sub) => ({
      productId: sub.productId,
      title: sub.title || sub.name || 'True Joy Pro',
      description: sub.description || '',
      price: sub.localizedPrice || `$${SUBSCRIPTION_CONFIG.plans.monthly.price}`,
      priceAmountMicros: parseInt(sub.price || '0') * 1000000,
      priceCurrencyCode: sub.currency || 'USD',
      localizedPrice: sub.localizedPrice,
      subscriptionPeriod: getSubscriptionPeriod(sub),
      freeTrialPeriod: getTrialPeriod(sub),
    }));
    
    return products;
  } catch (error) {
    console.error('[Billing] Error fetching products:', error);
    // Return mock products as fallback for development
    return getMockProducts();
  }
}

/**
 * Initiate a subscription purchase
 * @param productId - 'monthly' or 'annual'
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
  
  if (!isInitialized) {
    await initializeBilling();
  }
  
  try {
    // Request subscription purchase
    if (Platform.OS === 'ios') {
      await RNIap.requestSubscription({ sku: storeProductId });
    } else {
      // Android requires subscriptionOffers for v5+ billing
      const subscriptions = await RNIap.getSubscriptions({ skus: [storeProductId] });
      if (subscriptions.length > 0) {
        const subscription = subscriptions[0];
        const offerToken = (subscription as any).subscriptionOfferDetails?.[0]?.offerToken;
        
        await RNIap.requestSubscription({
          sku: storeProductId,
          ...(offerToken && { subscriptionOffers: [{ sku: storeProductId, offerToken }] }),
        });
      }
    }
    
    // The actual purchase result will come through the purchaseUpdatedListener
    // Return null here as the listener will handle the result
    console.log('[Billing] Purchase request sent, waiting for store response...');
    return null;
  } catch (error: any) {
    console.error('[Billing] Purchase error:', error);
    
    // Handle specific error codes
    if (error.code === 'E_USER_CANCELLED') {
      console.log('[Billing] User cancelled purchase');
    } else if (error.code === 'E_ITEM_UNAVAILABLE') {
      console.error('[Billing] Product not available');
    } else if (error.code === 'E_ALREADY_OWNED') {
      console.log('[Billing] User already owns this subscription');
    }
    
    throw error;
  }
}

/**
 * Restore previous purchases
 * Required for App Store / Play Store compliance
 */
export async function restorePurchases(): Promise<Purchase[]> {
  const platform = getCurrentPlatform();
  
  console.log(`[Billing] Restoring purchases for platform: ${platform}`);
  
  if (platform === 'web') {
    console.log('[Billing] Web platform - no purchases to restore');
    return [];
  }
  
  if (!isInitialized) {
    await initializeBilling();
  }
  
  try {
    const availablePurchases = await RNIap.getAvailablePurchases();
    console.log('[Billing] Available purchases:', availablePurchases.length);
    
    // Map to our Purchase interface
    const purchases: Purchase[] = availablePurchases.map((p) => ({
      productId: p.productId,
      transactionId: p.transactionId || '',
      transactionDate: p.transactionDate ? new Date(parseInt(p.transactionDate)).toISOString() : '',
      transactionReceipt: p.transactionReceipt || '',
      purchaseState: 'purchased',
      originalTransactionId: (p as any).originalTransactionIdentifierIOS || undefined,
    }));
    
    return purchases;
  } catch (error) {
    console.error('[Billing] Error restoring purchases:', error);
    return [];
  }
}

/**
 * Validate a receipt with the backend
 * This should be called after a successful purchase to update user subscription
 */
export async function validateReceipt(
  receipt: string,
  provider: 'APPLE' | 'GOOGLE',
  productId: string,
  sessionToken: string,
  apiBaseUrl: string
): Promise<boolean> {
  console.log(`[Billing] Validating receipt with backend`);
  console.log(`[Billing] Provider: ${provider}`);
  
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
      const error = await response.json();
      console.error('[Billing] Receipt validation failed:', error);
      return false;
    }
    
    const result = await response.json();
    console.log('[Billing] Receipt validated successfully:', result);
    return result.success === true;
  } catch (error) {
    console.error('[Billing] Receipt validation error:', error);
    return false;
  }
}

/**
 * Get current subscription status from available purchases
 */
export async function getSubscriptionStatus(): Promise<SubscriptionInfo> {
  const platform = getCurrentPlatform();
  const provider = getSubscriptionProvider();
  
  console.log(`[Billing] Getting subscription status for platform: ${platform}`);
  
  if (platform === 'web') {
    return {
      isActive: false,
      productId: null,
      expiryDate: null,
      provider: null,
      autoRenewing: false,
    };
  }
  
  try {
    const purchases = await restorePurchases();
    const validSkus = getProductSkus();
    
    // Find active subscription
    const activeSubscription = purchases.find(p => validSkus.includes(p.productId));
    
    if (activeSubscription) {
      return {
        isActive: true,
        productId: activeSubscription.productId,
        expiryDate: null, // Would need backend validation for actual expiry
        provider: provider as 'APPLE' | 'GOOGLE',
        autoRenewing: true, // Assume auto-renewing unless cancelled
      };
    }
    
    return {
      isActive: false,
      productId: null,
      expiryDate: null,
      provider: platform === 'web' ? null : (provider as 'APPLE' | 'GOOGLE'),
      autoRenewing: false,
    };
  } catch (error) {
    console.error('[Billing] Error getting subscription status:', error);
    return {
      isActive: false,
      productId: null,
      expiryDate: null,
      provider: null,
      autoRenewing: false,
    };
  }
}

/**
 * Open subscription management in the respective app store
 */
export async function openSubscriptionManagement(): Promise<void> {
  const platform = getCurrentPlatform();
  
  console.log(`[Billing] Opening subscription management for platform: ${platform}`);
  
  try {
    if (platform === 'ios') {
      // iOS: Deep link to App Store subscription settings
      await RNIap.deepLinkToSubscriptions();
      // Fallback: Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else if (platform === 'android') {
      // Android: Deep link to Play Store subscription settings
      await RNIap.deepLinkToSubscriptions();
      // Fallback: Linking.openURL('https://play.google.com/store/account/subscriptions');
    } else {
      console.log('[Billing] Web users must manage subscriptions via mobile app');
    }
  } catch (error) {
    console.error('[Billing] Error opening subscription management:', error);
  }
}

/**
 * Clean up billing resources
 * Should be called when the app is closing
 */
export async function cleanupBilling(): Promise<void> {
  console.log('[Billing] Cleaning up billing resources');
  
  try {
    // Remove listeners
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove?.();
      purchaseUpdateSubscription = null;
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove?.();
      purchaseErrorSubscription = null;
    }
    
    // End store connection
    await RNIap.endConnection();
    isInitialized = false;
    console.log('[Billing] Cleanup complete');
  } catch (error) {
    console.error('[Billing] Error during cleanup:', error);
  }
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

// Helper: Extract subscription period from product
function getSubscriptionPeriod(subscription: any): string {
  // iOS
  if (subscription.subscriptionPeriodNumberIOS && subscription.subscriptionPeriodUnitIOS) {
    const unit = subscription.subscriptionPeriodUnitIOS;
    const num = subscription.subscriptionPeriodNumberIOS;
    if (unit === 'MONTH') return `P${num}M`;
    if (unit === 'YEAR') return `P${num}Y`;
    if (unit === 'WEEK') return `P${num}W`;
    if (unit === 'DAY') return `P${num}D`;
  }
  // Android
  if (subscription.subscriptionOfferDetails) {
    const offer = subscription.subscriptionOfferDetails[0];
    if (offer?.pricingPhases?.pricingPhaseList?.[0]?.billingPeriod) {
      return offer.pricingPhases.pricingPhaseList[0].billingPeriod;
    }
  }
  return 'P1M'; // Default to monthly
}

// Helper: Extract trial period from product
function getTrialPeriod(subscription: any): string {
  // iOS
  if (subscription.introductoryPriceNumberOfPeriodsIOS) {
    const unit = subscription.introductoryPriceSubscriptionPeriodIOS;
    const num = subscription.introductoryPriceNumberOfPeriodsIOS;
    if (unit === 'DAY') return `P${num}D`;
    if (unit === 'WEEK') return `P${num * 7}D`;
    if (unit === 'MONTH') return `P${num * 30}D`;
  }
  // Android - check for free trial in pricing phases
  if (subscription.subscriptionOfferDetails) {
    const offer = subscription.subscriptionOfferDetails[0];
    const trialPhase = offer?.pricingPhases?.pricingPhaseList?.find(
      (p: any) => p.priceAmountMicros === '0' || p.priceAmountMicros === 0
    );
    if (trialPhase?.billingPeriod) {
      return trialPhase.billingPeriod;
    }
  }
  return `P${SUBSCRIPTION_CONFIG.trialDays}D`; // Default from config
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
  setupPurchaseListeners,
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
