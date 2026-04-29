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
 * Result returned by getProductsDetailed(). Distinguishes "we got real
 * products from Apple" from "we are showing mock/fallback values".
 *
 * On a real native build, only `source === 'store'` should let the user
 * actually tap the Start Free Trial button — calling requestPurchase against
 * a SKU that StoreKit didn’t return is what produces the "SKU not found"
 * error App Review hit on iPad in build 122.
 */
export interface ProductsResult {
  products: IAPProduct[];
  /**
   * 'store'   = fetchProducts returned real products from Apple/Google.
   * 'mock'    = web / Expo Go / SDK unavailable — mock prices for development.
   * 'empty'   = real native build, IAP available, but Apple returned no
   *             products. Most often this means the products are not yet
   *             approved & served by Sandbox to this device. The UI should
   *             show a retry state and disable purchase, NOT show mock
   *             prices and let the user attempt a doomed purchase.
   */
  source: 'store' | 'mock' | 'empty';
  /** Last error message from the underlying fetchProducts call, if any. */
  fetchError?: string;
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
  // NOTE: must NOT be named `purchaseSubscription` — that collides with the
  // public method of the same name and shadows it on the instance, causing
  // `iapService.purchaseSubscription is not a function (it is Object)` once
  // the listener has been registered. Naming history left a landmine here.
  private purchaseUpdateListener: any = null;
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
      // Dynamically require expo-iap only on native builds.
      // Use interop-safe unwrap so Metro/Hermes ESM→CJS interop can't leave us
      // with a module namespace object whose methods look like getters instead
      // of callable functions. This is the fix for the "Object is not a
      // function" error we hit in build 118 when the reviewer tapped
      // Start Free Trial.
      const mod = require('expo-iap');
      this.ExpoIap = (mod && mod.default && typeof mod.default === 'object') ? mod.default : mod;

      // Check if the module is properly linked and has v3 API surface.
      // Log the shape so TestFlight/App Review crashes are easier to debug.
      const requiredFns = ['initConnection', 'fetchProducts', 'requestPurchase', 'purchaseUpdatedListener', 'finishTransaction'];
      const missing = requiredFns.filter((fn) => typeof this.ExpoIap?.[fn] !== 'function');
      if (missing.length > 0) {
        console.log('[IAP] expo-iap missing expected functions:', missing.join(', '));
        console.log('[IAP] expo-iap module keys:', Object.keys(this.ExpoIap || {}).slice(0, 40).join(', '));
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
    this.purchaseUpdateListener = this.ExpoIap.purchaseUpdatedListener(async (purchase: any) => {
      console.log('[IAP] Purchase update:', purchase);

      // expo-iap uses 'transactionReceipt' for iOS and 'purchaseToken' for Android
      const receipt = purchase.transactionReceipt || purchase.purchaseToken;

      if (!receipt) {
        console.warn('[IAP] Purchase event missing receipt/purchaseToken');
        if (this.onPurchaseError) {
          this.onPurchaseError({
            code: 'E_NO_RECEIPT',
            message: 'Purchase completed but no receipt was returned. Please contact support.',
          });
        }
        return;
      }

      // Validate with backend. We deliberately validate BEFORE calling
      // finishTransaction so that if the server rejects the receipt the
      // transaction stays in the queue and StoreKit can retry / surface a
      // proper error rather than silently consuming a bad purchase.
      const validated = await this.validatePurchase(purchase);

      if (!validated) {
        if (this.onPurchaseError) {
          this.onPurchaseError({
            code: 'E_VALIDATION_FAILED',
            message: 'We could not verify your purchase with our servers. Please try again or contact support.',
          });
        }
        // Still finish the transaction so the user is not stuck on a pending
        // "You're all set" forever; backend logs will capture the failure.
        try {
          await this.ExpoIap.finishTransaction({ purchase, isConsumable: false });
        } catch (finishError) {
          console.warn('[IAP] Failed to finish transaction after failed validation:', finishError);
        }
        return;
      }

      // Acknowledge the purchase - expo-iap uses finishTransaction
      try {
        await this.ExpoIap.finishTransaction({
          purchase,
          isConsumable: false,
        });
      } catch (finishError) {
        console.warn('[IAP] Failed to finish transaction:', finishError);
      }

      // Notify callback
      if (this.onPurchaseUpdate) {
        this.onPurchaseUpdate(purchase);
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
   * Get available subscription products from store.
   *
   * Backwards-compatible wrapper that flattens to just the products array.
   * New code should prefer getProductsDetailed() so the UI can distinguish
   * “real Apple products” from “mock fallback” and avoid attempting a
   * doomed requestPurchase against a SKU StoreKit doesn’t know about.
   */
  async getProducts(): Promise<IAPProduct[]> {
    const result = await this.getProductsDetailed();
    return result.products;
  }

  /**
   * Get available subscription products with provenance.
   *
   * Returns one of three states:
   *   - source: 'store' — real products from Apple/Google. Safe to purchase.
   *   - source: 'mock'  — web / Expo Go / SDK absent. Dev-only.
   *   - source: 'empty' — real native build, IAP available, Apple returned
   *                       no products. Caller MUST NOT call requestPurchase.
   *                       Show a retry / unavailable state instead.
   */
  async getProductsDetailed(): Promise<ProductsResult> {
    // Web has no real store; return mock products for layout/dev only.
    if (Platform.OS === 'web' || !this.ExpoIap) {
      return { products: getMockProducts(), source: 'mock' };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    // initialize() is allowed to fail and leave us un-initialized (e.g. in
    // Expo Go). In that case fall back to mock so the screen still renders
    // for development — but mark it as mock.
    if (!this.isInitialized || !this.ExpoIap) {
      return { products: getMockProducts(), source: 'mock' };
    }

    if (!PRODUCT_SKUS || PRODUCT_SKUS.length === 0) {
      return { products: getMockProducts(), source: 'mock' };
    }

    try {
      console.log('[IAP] fetchProducts requesting SKUs:', PRODUCT_SKUS.join(', '));
      // expo-iap v3 uses fetchProducts with type: 'subs' for subscriptions
      const subscriptions = await this.ExpoIap.fetchProducts({
        skus: PRODUCT_SKUS,
        type: 'subs',
      });
      console.log(
        '[IAP] fetchProducts returned',
        Array.isArray(subscriptions) ? subscriptions.length : 'non-array',
        subscriptions ? `(keys=${Object.keys(subscriptions).slice(0, 5).join(',')})` : '',
      );
      if (!subscriptions || subscriptions.length === 0) {
        // CRITICAL: Do NOT fall back to mock products here on a real native
        // build. Showing $29.99/$274.99 mock cards and letting the user tap
        // Start Free Trial dispatches requestPurchase against a SKU Apple
        // hasn’t actually served, producing "SKU not found" — this is what
        // App Review reported in build 122 on iPad.
        console.warn(
          '[IAP] fetchProducts returned 0 products on a native build. ' +
            'Most likely the IAP products are not yet served by Sandbox to this device. ' +
            'Falling through to empty state — paywall will show retry UI.'
        );
        return {
          products: [],
          source: 'empty',
          fetchError: 'No subscription products are currently available from the App Store.',
        };
      }
      const mapped = subscriptions.map((sub: any) => this.mapSubscriptionToProduct(sub));
      console.log('[IAP] mapped product IDs:', mapped.map((p) => p.productId).join(', '));
      return { products: mapped, source: 'store' };
    } catch (error: any) {
      console.error('[IAP] Failed to get products:', error?.message || error, error?.code);
      // Surface the failure to the UI rather than masking with mocks.
      return {
        products: [],
        source: 'empty',
        fetchError: error?.message || 'Could not load subscription products from the App Store.',
      };
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

    // Defensive guard: if requestPurchase isn't a function, fail early with a
    // clear message instead of the opaque "Object is not a function" we hit
    // in build 118. This should never fire after a successful initialize(),
    // but acts as a safety net if the module shape changes under us.
    if (typeof this.ExpoIap.requestPurchase !== 'function') {
      const keys = Object.keys(this.ExpoIap || {}).slice(0, 40).join(', ');
      console.error('[IAP] requestPurchase is not a function. Module keys:', keys);
      return { success: false, error: 'Purchase system not available. Please update the app and try again.' };
    }

    try {
      // expo-iap v3: unified requestPurchase with platform-specific request
      // objects. Prefer the new `apple`/`google` field names (v3.4+) with the
      // legacy `ios`/`android` names kept as a fallback. expo-iap accepts
      // either, but the documented preferred shape is apple/google.
      console.log('[IAP] Starting purchase flow for', productId, 'on', Platform.OS);
      if (Platform.OS === 'android') {
        await this.ExpoIap.requestPurchase({
          request: {
            google: {
              skus: [productId],
              subscriptionOffers: offerToken
                ? [{ sku: productId, offerToken }]
                : [],
            },
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
            apple: {
              sku: productId,
              andDangerouslyFinishTransactionAutomatically: false,
            },
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
      // Log the full error shape so App Review / TestFlight crashes are
      // debuggable from Xcode console or sentry-equivalent.
      console.error('[IAP] Purchase failed:', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack,
      });
      return {
        success: false,
        error: error?.message || 'Purchase failed',
      };
    }
  }

  /**
   * Validate purchase receipt with backend
   *
   * IMPORTANT: API_BASE already includes the `/api` prefix
   * (see src/constants/api.ts). API_ENDPOINTS.SUBSCRIPTION_VALIDATE is
   * `/subscription/validate-receipt`, so the final URL is
   * `${BACKEND}/api/subscription/validate-receipt`.
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
      const productId = purchase.productId || purchase.id;
      const url = `${API_BASE}${API_ENDPOINTS.SUBSCRIPTION_VALIDATE}`;
      console.log('[IAP] Validating receipt with backend at', url, 'product=', productId);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          receipt: receipt,
          subscription_provider: Platform.OS === 'ios' ? 'APPLE' : 'GOOGLE',
          product_id: productId,
          transaction_id: purchase.transactionId || purchase.orderId,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('[IAP] Validation failed:', response.status, body);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('[IAP] Validation error:', error?.message || error);
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
    if (this.purchaseUpdateListener) {
      this.purchaseUpdateListener.remove();
      this.purchaseUpdateListener = null;
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
