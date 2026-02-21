/**
 * In-App Purchase Service
 * Handles Apple App Store and Google Play subscriptions
 * 
 * NOTE: This module is web-safe. react-native-iap is only loaded on native platforms.
 * On web, all methods return appropriate fallback values.
 * 
 * Product IDs:
 * - Apple: truejoy.pro.monthly ($29/month), truejoy.pro.annual ($276/year)
 * - Google: truejoy_pro with base plans 'monthly' and 'annual'
 */

import { Platform } from 'react-native';
import { SUBSCRIPTION_PRODUCTS } from './subscriptionConfig';
import { API_BASE, API_ENDPOINTS } from '../../constants/api';

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
      price: '29.00',
      localizedPrice: '$29.00',
      currency: 'USD',
      isMonthly: true,
      subscriptionPeriod: 'P1M',
    },
    {
      productId: SUBSCRIPTION_PRODUCTS.APPLE.PRO_ANNUAL,
      title: 'True Joy Pro – Annual',
      description: 'Full access to all Pro features. Save $72!',
      price: '276.00',
      localizedPrice: '$276.00',
      currency: 'USD',
      isMonthly: false,
      subscriptionPeriod: 'P1Y',
    },
  ];
}

class IAPService {
  private isInitialized = false;
  private RNIap: any = null;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;
  private onPurchaseUpdate: ((purchase: any) => void) | null = null;
  private onPurchaseError: ((error: any) => void) | null = null;

  /**
   * Check if running in Expo Go (where native modules aren't available)
   */
  private isExpoGo(): boolean {
    try {
      // In Expo Go, Constants.appOwnership is 'expo'
      // In standalone/dev builds, it's 'standalone' or 'guest'
      const Constants = require('expo-constants').default;
      return Constants.appOwnership === 'expo';
    } catch {
      return false;
    }
  }

  /**
   * Check if NitroModules are supported (required by react-native-iap)
   */
  private hasNitroModulesSupport(): boolean {
    try {
      // Try to access NitroModules - if it throws, we're in Expo Go
      const NitroModules = require('react-native-nitro-modules');
      return !!NitroModules;
    } catch {
      return false;
    }
  }

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
    if (this.isExpoGo()) {
      console.log('[IAP] Running in Expo Go - IAP not available. Use a development build for IAP testing.');
      return false;
    }

    try {
      // Dynamically require react-native-iap only on native builds
      this.RNIap = require('react-native-iap');
      
      // Check if the module is properly linked
      if (!this.RNIap || !this.RNIap.initConnection) {
        console.log('[IAP] react-native-iap not properly linked');
        return false;
      }
      
      const result = await this.RNIap.initConnection();
      console.log('[IAP] Connection initialized:', result);
      this.isInitialized = true;
      this.setupListeners();
      return true;
    } catch (error: any) {
      // Handle the case where native module isn't available
      const errorMsg = error.message || '';
      if (errorMsg.includes('NitroModules') || 
          errorMsg.includes('initConnection') || 
          errorMsg.includes('undefined') ||
          errorMsg.includes('not supported')) {
        console.log('[IAP] Native IAP module not available - using backend subscription management');
      } else {
        console.error('[IAP] Failed to initialize:', error);
      }
      return false;
    }
  }

  /**
   * Set up purchase listeners
   */
  private setupListeners() {
    if (!this.RNIap) return;

    // Listen for successful purchases
    this.purchaseUpdateSubscription = this.RNIap.purchaseUpdatedListener(async (purchase: any) => {
      console.log('[IAP] Purchase update:', purchase);
      
      if (purchase.transactionReceipt) {
        // Validate with backend
        await this.validatePurchase(purchase);
        
        // Acknowledge the purchase
        await this.RNIap.finishTransaction({ purchase, isConsumable: false });
        
        // Notify callback
        if (this.onPurchaseUpdate) {
          this.onPurchaseUpdate(purchase);
        }
      }
    });

    // Listen for purchase errors
    this.purchaseErrorSubscription = this.RNIap.purchaseErrorListener((error: any) => {
      console.warn('[IAP] Purchase error:', error);
      if (this.onPurchaseError) {
        this.onPurchaseError(error);
      }
    });
  }

  /**
   * Get available subscription products from store
   */
  async getProducts(): Promise<IAPProduct[]> {
    // Return mock products on web
    if (Platform.OS === 'web' || !this.RNIap) {
      return getMockProducts();
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!PRODUCT_SKUS || PRODUCT_SKUS.length === 0) {
      return getMockProducts();
    }

    try {
      const subscriptions = await this.RNIap.getSubscriptions({ skus: PRODUCT_SKUS });
      return subscriptions.map((sub: any) => this.mapSubscriptionToProduct(sub));
    } catch (error) {
      console.error('[IAP] Failed to get products:', error);
      return getMockProducts();
    }
  }

  /**
   * Map store subscription to our product format
   */
  private mapSubscriptionToProduct(sub: any): IAPProduct {
    const isMonthly = sub.productId.includes('monthly') || 
                      sub.subscriptionPeriodAndroid?.includes('P1M') ||
                      sub.subscriptionPeriodIOS?.includes('P1M');
    
    return {
      productId: sub.productId,
      title: sub.title || (isMonthly ? 'Pro Monthly' : 'Pro Annual'),
      description: sub.description || 'Full access to True Joy Pro features',
      price: sub.price || (isMonthly ? '29.00' : '276.00'),
      localizedPrice: sub.localizedPrice || (isMonthly ? '$29.00' : '$276.00'),
      currency: sub.currency || 'USD',
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
      return { success: false, error: 'Web purchases not supported. Use Stripe.' };
    }

    if (!this.RNIap) {
      return { success: false, error: 'IAP not initialized' };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (Platform.OS === 'android') {
        // Android requires offer token for subscription purchases
        await this.RNIap.requestSubscription({
          sku: productId,
          subscriptionOffers: offerToken ? [{ sku: productId, offerToken }] : undefined,
        });
      } else {
        // iOS
        await this.RNIap.requestSubscription({ sku: productId });
      }
      
      // Purchase flow started - result will come through listener
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
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.SUBSCRIPTION_VALIDATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          receipt: purchase.transactionReceipt,
          subscription_provider: Platform.OS === 'ios' ? 'APPLE' : 'GOOGLE',
          product_id: purchase.productId,
          transaction_id: purchase.transactionId,
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

    if (!this.RNIap) {
      return { success: false, error: 'IAP not initialized' };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const purchases = await this.RNIap.getAvailablePurchases();
      
      if (purchases.length === 0) {
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
          transactionId: subscription.transactionId,
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
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    
    if (this.isInitialized && this.RNIap && Platform.OS !== 'web') {
      try {
        await this.RNIap.endConnection();
      } catch (error) {
        console.warn('[IAP] Failed to end connection:', error);
      }
    }
    
    this.isInitialized = false;
    this.RNIap = null;
  }
}

// Export singleton instance
export const iapService = new IAPService();
export default iapService;
