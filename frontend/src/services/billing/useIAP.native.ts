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
    price: '29.00',
    localizedPrice: '$29.00',
    currency: 'USD',
    isMonthly: true,
    subscriptionPeriod: 'P1M',
  },
  {
    productId: SUBSCRIPTION_PRODUCTS.APPLE.PRO_ANNUAL,
    title: 'True Joy Pro – Annual',
    description: 'Full access to all Pro features. Save ~$85!',
    price: '276.00',
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
  
  const { fetchStatus, validateReceipt } = useSubscriptionStore();

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
        // Dynamically import iapService only on native
        const { iapService: service } = await import('./iapService');
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
  const handlePurchaseSuccess = useCallback(async (purchase: any, service: any) => {
    console.log('[useIAP] Purchase successful:', purchase.productId);
    
    if (purchase.transactionReceipt) {
      const validated = await validateReceipt(
        purchase.transactionReceipt,
        purchase.productId
      );
      
      if (validated) {
        await fetchStatus();
        
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Purchase Complete',
            'Thank you for subscribing to True Joy Pro!',
            [{ text: 'OK' }]
          );
        }
      } else {
        setError('Failed to validate purchase. Please contact support.');
      }
    }
  }, [validateReceipt, fetchStatus]);

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
      const result = await iapService.purchaseSubscription(productId, offerToken);
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
      const result = await iapService.restorePurchases();
      
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
      const storeProducts = await iapService.getProducts();
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
