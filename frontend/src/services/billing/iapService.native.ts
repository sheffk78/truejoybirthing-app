/**
 * In-App Purchase Service
 * Handles Apple App Store and Google Play subscriptions using expo-iap
 * 
 * NOTE: This module is web-safe and Expo Go-safe. 
 * expo-iap is only loaded on native builds (not Expo Go).
 * On web/Expo Go, all methods return appropriate fallback values.
 * 
 * Product IDs:
 * - Apple: truejoy.pro.monthly ($29.99/month), truejoy.pro.annual ($274.99/year)
 * - Google: truejoy_pro with base plans 'monthly' and 'annual'
 */

import { Platform } from 'react-native';
import { SUBSCRIPTION_PRODUCTS } from './subscriptionConfig';
import { API_BASE, API_ENDPOINTS } from '../../constants/api';
import Constants from 'expo-constants';

// Check if running in Expo Go at module level
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Product SKUs - defined here to avoid importing from IAP
const PRODUCT_SKUS = Platform.select({
  ios: [
    SUBSCRIPTION_PRODUCTS.APPLE.PRO_MONTHLY,
    SUBSCRIPTION_PRODUCTS.APPLE.PRO_ANNUAL,
  ],
  android: [SUBSCRIPTION_PRODUCTS.GOOGLE.SUBSCRIPTION_ID],
  default: [],
});

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
  isMonthly: boolean;
  subscriptionPeriod: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  error?: string;
}

/**
 * Get mock products for web/development
 */
function getMockProducts(): IAPProduct[] {
  return [
    {
      productId: SUBSCRIPTION_PRODUCTS.APPLE.PRO_MONTHLY,
      title: 'True Joy Pro – Monthly',
      description: 'Full access to all Pro features',
      price: '29.99',
      localizedPrice: '$29.99',
      currency: 'USD',
      isMonthly: true,
      subscriptionPeriod: 'P1M',
    },
    {
      productId: SUBSCRIPTION_PRODUCTS.APPLE.PRO_ANNUAL,
      title: 'True Joy Pro – Annual',
      description: 'Full access to all Pro features. Save ~$85!',
      price: '274.99',
      localizedPrice: '$274.99',
      currency: 'USD',
      isMonthly: false,
      subscriptionPeriod: 'P1Y',
    },
  ];
}

class IAPService {
  private isInitialized = false;
  private ExpoIap: any = null;
  private purchaseSubscription: any = null;
  private onPurchaseUpdate: ((purchase: any) => void) | null = null;
  private onPurchaseError: ((error: any) => void) | null = null;

  /**
   * Initialize the IAP connection
   * Call this when the app starts or user enters subscription flow
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    // Skip IAP on web
    if (Platform.OS === 'web') {
      console.log('[IAP] Web platform - using backend subscription management');
      return false;
    }

    // Skip IAP in Expo Go (native modules not available)
    if (IS_EXPO_GO) {
      console.log('[IAP] Running in Expo Go - IAP not available. Use a development build for IAP testing.');
      return false;
    }

    try {
      // Dynamically require expo-iap only on native builds
      this.ExpoIap = require('expo-iap');
      
      // Check if the module is properly linked and has v3 API surface
      const requiredFns = ['initConnection', 'fetchProducts', 'requestPurchase', 'purchaseUpdatedListener', 'finishTransaction'];
      const missing = requiredFns.filter((fn) => typeof this.ExpoIap?.[fn] !== 'function');
      if (missing.length > 0) {
        console.log('[IAP] expo-iap missing expected functions:', missing.join(', '));
        return false;
      }
      
      const result = await this.ExpoIap.initConnection();
      console.log('[IAP] Connection initialized:', result);
      this.isInitialized = true;
      this.setupListeners();
      return true;
    } catch (error: any) {
      // Handle the case where native module isn't available
      const errorMsg = error.message || '';
      if (errorMsg.includes('initConnection') || 
          errorMsg.includes('undefined') ||
          errorMsg.includes('not supported') ||
          errorMsg.includes('Native module')) {
        console.log('[IAP] Native IAP module not available - using backend subscription management');
      } else {
        console.error('[IAP] Failed to initialize:', error);
      }
      return false;
    }
  }

  /**
   * Set up purchase listeners using expo-iap event emitter
   */
  private setupListeners() {
    if (!this.ExpoIap) return;

    // expo-iap uses a different event system
    // Subscribe to purchase updates
    this.purchaseSubscription = this.ExpoIap.purchaseUpdatedListener(async (purchase: any) => {
      console.log('[IAP] Purchase update:', purchase);
      
      // expo-iap uses 'transactionReceipt' for iOS and 'purchaseToken' for Android
      const receipt = purchase.transactionReceipt || purchase.purchaseToken;
      
      if (receipt) {
        // Validate with backend
        await this.validatePurchase(purchase);
        
        // Acknowledge the purchase - expo-iap uses finishTransaction
        try {
          await this.ExpoIap.finishTransaction({ 
            purchase, 
            isConsumable: false 
          });
        } catch (finishError) {
          console.warn('[IAP] Failed to finish transaction:', finishError);
        }
        
        // Notify callback
        if (this.onPurchaseUpdate) {
          this.onPurchaseUpdate(purchase);
        }
      }
    });

    // Listen for purchase errors
    if (this.ExpoIap.purchaseErrorListener) {
      this.ExpoIap.purchaseErrorListener((error: any) => {
        console.warn('[IAP] Purchase error:', error);
        if (this.onPurchaseError) {
          this.onPurchaseError(error);
        }
      });
    }
  }

  /**
   * Get available subscription products from store
   */
  async getProducts(): Promise<IAPProduct[]> {
    // Return mock products on web
    if (Platform.OS === 'web' || !this.ExpoIap) {
      return getMockProducts();
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!PRODUCT_SKUS || PRODUCT_SKUS.length === 0) {
      return getMockProducts();
    }

    try {
      // expo-iap v3 uses fetchProducts with type: 'subs' for subscriptions
      const subscriptions = await this.ExpoIap.fetchProducts({
        skus: PRODUCT_SKUS,
        type: 'subs',
      });
      if (!subscriptions || subscriptions.length === 0) {
        console.warn('[IAP] fetchProducts returned empty — falling back to mock products');
        return getMockProducts();
      }
      return subscriptions.map((sub: any) => this.mapSubscriptionToProduct(sub));
    } catch (error) {
      console.error('[IAP] Failed to get products:', error);
      return getMockProducts();
    }
  }

  /**
   * Map store subscription to our product format.
   *
   * expo-iap v3 renamed several fields on the product object:
   *   productId       -> id
   *   localizedPrice  -> displayPrice
   *   subscriptionPeriodIOS -> subscriptionPeriodUnitIOS + subscriptionPeriodNumberIOS
   *
   * We read both the new and legacy names so older SDK builds still work.
   */
  private mapSubscriptionToProduct(sub: any): IAPProduct {
    const productId: string = sub.id || sub.productId || '';
    const iosPeriodUnit: string | undefined = sub.subscriptionPeriodUnitIOS;
    const legacyIosPeriod: string | undefined = sub.subscriptionPeriodIOS;
    const androidPeriod: string | undefined = sub.subscriptionPeriodAndroid;

    const isMonthly =
      productId.includes('monthly') ||
      androidPeriod?.includes('P1M') ||
      legacyIosPeriod?.includes('P1M') ||
      iosPeriodUnit?.toUpperCase() === 'MONTH';

    const displayPrice: string = sub.displayPrice || sub.localizedPrice ||
      (isMonthly ? '$29.99' : '$274.99');
    const rawPrice: string =
      (sub.price !== undefined && sub.price !== null && String(sub.price)) ||
      (isMonthly ? '29.99' : '274.99');

    return {
      productId,
      title: sub.title || sub.displayName || (isMonthly ? 'Pro Monthly' : 'Pro Annual'),
      description: sub.description || 'Full access to True Joy Pro features',
      price: rawPrice,
      localizedPrice: displayPrice,
      currency: sub.currency || sub.currencyCode || 'USD',
      isMonthly,
      subscriptionPeriod: isMonthly ? 'P1M' : 'P1Y',
    };
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(
    productId: string,
    offerToken?: string
  ): Promise<PurchaseResult> {
    if (Platform.OS === 'web') {
      return { success: false, error: 'Purchases are only available on iOS and Android.' };
    }

    if (!this.ExpoIap) {
      return { success: false, error: 'IAP not initialized' };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // expo-iap v3: unified requestPurchase with platform-specific request objects
      if (Platform.OS === 'android') {
        await this.ExpoIap.requestPurchase({
          request: {
            android: {
              skus: [productId],
              subscriptionOffers: offerToken
                ? [{ sku: productId, offerToken }]
                : [],
            },
          },
          type: 'subs',
        });
      } else {
        await this.ExpoIap.requestPurchase({
          request: {
            ios: {
              sku: productId,
              andDangerouslyFinishTransactionAutomatically: false,
            },
          },
          type: 'subs',
        });
      }

      // Purchase flow started - result will come through purchaseUpdatedListener
      return { success: true };
    } catch (error: any) {
      console.error('[IAP] Purchase failed:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  /**
   * Validate purchase receipt with backend
   */
  private async validatePurchase(purchase: any): Promise<boolean> {
    const sessionToken = await this.getSessionToken();
    if (!sessionToken) {
      console.error('[IAP] No session token for validation');
      return false;
    }

    try {
      // expo-iap uses transactionReceipt for iOS, purchaseToken for Android
      const receipt = purchase.transactionReceipt || purchase.purchaseToken;
      
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.SUBSCRIPTION_VALIDATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          receipt: receipt,
          subscription_provider: Platform.OS === 'ios' ? 'APPLE' : 'GOOGLE',
          product_id: purchase.productId,
          transaction_id: purchase.transactionId || purchase.orderId,
        }),
      });

      if (!response.ok) {
        console.error('[IAP] Validation failed:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('[IAP] Validation error:', error);
      return false;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<PurchaseResult> {
    if (Platform.OS === 'web') {
      return { success: false, error: 'Restore not available on web' };
    }

    if (!this.ExpoIap) {
      return { success: false, error: 'IAP not initialized' };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const purchases = await this.ExpoIap.getAvailablePurchases({
        onlyIncludeActiveItemsIOS: true,
      });

      if (!purchases || purchases.length === 0) {
        return { success: false, error: 'No previous purchases found' };
      }

      // Find most recent subscription
      const subscription = purchases.find((p: any) => 
        PRODUCT_SKUS?.includes(p.productId)
      );

      if (subscription) {
        // Validate with backend
        await this.validatePurchase(subscription);
        return { 
          success: true, 
          transactionId: subscription.transactionId || subscription.orderId,
          productId: subscription.productId,
        };
      }

      return { success: false, error: 'No valid subscription found' };
    } catch (error: any) {
      console.error('[IAP] Restore failed:', error);
      return { success: false, error: error.message || 'Restore failed' };
    }
  }

  /**
   * Set purchase callbacks
   */
  setCallbacks(
    onPurchaseUpdate: (purchase: any) => void,
    onPurchaseError: (error: any) => void
  ) {
    this.onPurchaseUpdate = onPurchaseUpdate;
    this.onPurchaseError = onPurchaseError;
  }

  /**
   * Get session token from AsyncStorage
   */
  private async getSessionToken(): Promise<string | null> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem('session_token');
    } catch {
      return null;
    }
  }

  /**
   * Clean up IAP connection
   * Call this when app is closing or user logs out
   */
  async cleanup() {
    if (this.purchaseSubscription) {
      this.purchaseSubscription.remove();
      this.purchaseSubscription = null;
    }
    
    if (this.isInitialized && this.ExpoIap && Platform.OS !== 'web') {
      try {
        await this.ExpoIap.endConnection();
      } catch (error) {
        console.warn('[IAP] Failed to end connection:', error);
      }
    }
    
    this.isInitialized = false;
    this.ExpoIap = null;
  }
}

// Export singleton instance
export const iapService = new IAPService();
export default iapService;
