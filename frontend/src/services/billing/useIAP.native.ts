/**
 * useIAP Hook
 * 
 * React hook for handling In-App Purchases with Apple/Google stores.
 * Web-safe: Returns mock data on web platforms.
 * Expo Go safe: Returns mock data when native modules aren't available.
 * 
 * Usage:
 * const { products, purchase, restore, isLoading, error } = useIAP();
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert, LogBox } from 'react-native';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { SUBSCRIPTION_PRODUCTS } from './subscriptionConfig';

// Resolve the iapService singleton via require() so we can defensively unwrap
// Metro/Hermes ESM->CJS module namespace wrapping. Some build configs surface
// the module as { iapService: <instance>, default: <instance>, __esModule: true }
// rather than passing through the named export, which causes
// `iapService.purchaseSubscription is not a function (it is Object)` at call time.
let __resolvedIapService: any = null;
function resolveIapService(): any {
  if (__resolvedIapService) return __resolvedIapService;
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: any = require('./iapService');
    // Try, in order: default export, named iapService, the module itself.
    const candidates = [mod?.default, mod?.iapService, mod];
    for (const c of candidates) {
      if (c && typeof c.initialize === 'function' && typeof c.purchaseSubscription === 'function') {
        __resolvedIapService = c;
        return c;
      }
    }
    console.error('[useIAP] Failed to resolve iapService singleton from module:',
      mod ? Object.keys(mod) : 'null', 'mod typeof =', typeof mod);
    return null;
  } catch (e: any) {
    console.warn('[useIAP] require(./iapService) threw:', e?.message);
    return null;
  }
}

// Ignore IAP-related warnings in Expo Go
LogBox.ignoreLogs([
  '[IAP] Failed to initialize',
  'NitroModules are not supported in Expo Go',
  'Cannot read property \'initConnection\'',
]);

// Types
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

export interface UseIAPReturn {
  products: IAPProduct[];
  isLoading: boolean;
  isAvailable: boolean;
  error: string | null;
  purchase: (productId: string, offerToken?: string) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  refreshProducts: () => Promise<void>;
}

// Mock products for web
const MOCK_PRODUCTS: IAPProduct[] = [
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

// Web-safe hook - returns mock data on web
export function useIAP(): UseIAPReturn {
  const [products, setProducts] = useState<IAPProduct[]>(MOCK_PRODUCTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [iapService, setIapService] = useState<any>(null);
  
  // We intentionally do NOT use validateReceipt from the store here. The
  // iapService listener (setupListeners() in iapService.native.ts) is the
  // single source of truth for receipt validation — it POSTs to
  // /api/subscription/validate-receipt and calls finishTransaction. Calling
  // validateReceipt() here as well caused a duplicate request to a wrong URL
  // (build 122) and surfaced "Failed to validate purchase" to App Review.
  const { fetchStatus } = useSubscriptionStore();

  // Initialize IAP on mount - only on native
  useEffect(() => {
    let mounted = true;

    const initIAP = async () => {
      // IAP not available on web
      if (Platform.OS === 'web') {
        setIsAvailable(false);
        setProducts(MOCK_PRODUCTS);
        return;
      }

      setIsLoading(true);
      try {
        // Resolve the singleton with defensive unwrapping for Metro/Hermes
        // module-namespace edge cases.
        const service = resolveIapService();
        if (!service) {
          throw new Error('iapService singleton could not be resolved on this platform');
        }
        if (!mounted) return;
        
        setIapService(service);
        
        const initialized = await service.initialize();
        if (!mounted) return;
        
        setIsAvailable(initialized);
        
        if (initialized) {
          // Set up purchase callbacks
          service.setCallbacks(
            (purchase: any) => handlePurchaseSuccess(purchase, service),
            handlePurchaseError
          );
          
          // Load products
          const storeProducts = await service.getProducts();
          if (mounted) {
            setProducts(storeProducts);
          }
        }
      } catch (err: any) {
        console.warn('[useIAP] IAP not available:', err.message);
        if (mounted) {
          setIsAvailable(false);
          setProducts(MOCK_PRODUCTS);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initIAP();

    return () => {
      mounted = false;
      if (iapService) {
        iapService.cleanup();
      }
    };
  }, []);

  // Handle successful purchase
  //
  // The iapService listener has already POSTed the receipt to the backend and
  // called finishTransaction by the time this callback fires (see
  // setupListeners() in iapService.native.ts). Our job here is only to refresh
  // the local subscription status and confirm to the user.
  const handlePurchaseSuccess = useCallback(async (purchase: any, _service: any) => {
    const productId = purchase.productId || purchase.id;
    console.log('[useIAP] Purchase successful:', productId);

    try {
      await fetchStatus();
    } catch (err: any) {
      console.warn('[useIAP] fetchStatus after purchase failed:', err?.message);
    }

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Purchase Complete',
        'Thank you for subscribing to True Joy Pro!',
        [{ text: 'OK' }]
      );
    }
  }, [fetchStatus]);

  // Handle purchase error
  const handlePurchaseError = useCallback((purchaseError: any) => {
    console.warn('[useIAP] Purchase error:', purchaseError);
    
    if (purchaseError.code === 'E_USER_CANCELLED') {
      return;
    }
    
    setError(purchaseError.message || 'Purchase failed');
  }, []);

  // Purchase a subscription
  const purchase = useCallback(async (
    productId: string,
    offerToken?: string
  ): Promise<PurchaseResult> => {
    if (Platform.OS === 'web' || !iapService) {
      return { success: false, error: 'IAP not available on web' };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Belt-and-suspenders: if the state-stored reference somehow lost its
      // methods (Metro/Hermes namespace wrapping observed in build 119),
      // fall back to a freshly resolved singleton.
      const svc: any =
        iapService && typeof (iapService as any).purchaseSubscription === 'function'
          ? iapService
          : resolveIapService();
      if (!svc || typeof svc.purchaseSubscription !== 'function') {
        const keys = svc ? Object.keys(svc).join(',') : 'null';
        throw new Error(`Purchase service unavailable (resolved keys: ${keys})`);
      }
      const result = await svc.purchaseSubscription(productId, offerToken);
      return result;
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [iapService]);

  // Restore purchases
  const restore = useCallback(async (): Promise<PurchaseResult> => {
    if (Platform.OS === 'web' || !iapService) {
      return { success: false, error: 'Restore not available on web' };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const svc: any =
        iapService && typeof (iapService as any).restorePurchases === 'function'
          ? iapService
          : resolveIapService();
      if (!svc || typeof svc.restorePurchases !== 'function') {
        throw new Error('Restore service unavailable');
      }
      const result = await svc.restorePurchases();
      
      if (result.success) {
        await fetchStatus();
        Alert.alert('Restore Complete', 'Your subscription has been restored.');
      }
      
      return result;
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [iapService, fetchStatus]);

  // Refresh products
  const refreshProducts = useCallback(async () => {
    if (Platform.OS === 'web' || !iapService) {
      setProducts(MOCK_PRODUCTS);
      return;
    }
    
    setIsLoading(true);
    try {
      const svc: any =
        iapService && typeof (iapService as any).getProducts === 'function'
          ? iapService
          : resolveIapService();
      if (!svc || typeof svc.getProducts !== 'function') {
        setProducts(MOCK_PRODUCTS);
        return;
      }
      const storeProducts = await svc.getProducts();
      setProducts(storeProducts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [iapService]);

  return {
    products,
    isLoading,
    isAvailable,
    error,
    purchase,
    restore,
    refreshProducts,
  };
}

export default useIAP;
