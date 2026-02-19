/**
 * useIAPSubscription Hook
 * 
 * A React hook that provides in-app purchase functionality for True Joy Birthing.
 * On web, this returns mock/disabled functionality since IAP is native-only.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  initializeBilling,
  fetchProducts,
  purchaseProduct,
  restorePurchases,
  validateReceipt,
  cleanupBilling,
  isIAPAvailable,
  getCurrentPlatform,
  getSubscriptionProvider,
  Product,
  ProductId,
} from '../services/billing';
import { API_BASE } from '../../src/constants/api';

interface UseIAPSubscriptionReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  isPurchasing: boolean;
  isRestoring: boolean;
  purchase: (productId: ProductId) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
  isAvailable: boolean;
  platform: string;
  provider: string;
}

export function useIAPSubscription(): UseIAPSubscriptionReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const pendingPurchaseResolve = useRef<((success: boolean) => void) | null>(null);

  // Initialize billing on mount
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const initialized = await initializeBilling();
        
        if (!initialized && isIAPAvailable()) {
          if (isMounted) {
            setError('Failed to initialize billing');
            setIsLoading(false);
          }
          return;
        }
        
        // Fetch available products
        const availableProducts = await fetchProducts();
        
        if (isMounted) {
          setProducts(availableProducts);
          setIsLoading(false);
        }
      } catch (e: any) {
        console.error('[useIAPSubscription] Init error:', e);
        if (isMounted) {
          setError(e.message || 'Failed to initialize');
          setIsLoading(false);
        }
      }
    };
    
    init();
    
    return () => {
      isMounted = false;
      cleanupBilling();
    };
  }, []);

  // Purchase a subscription
  const purchase = useCallback(async (productId: ProductId): Promise<boolean> => {
    if (!isIAPAvailable()) {
      Alert.alert('Not Available', 'In-app purchases are only available on iOS and Android.');
      return false;
    }
    
    if (isPurchasing) {
      return false;
    }
    
    setIsPurchasing(true);
    setError(null);
    
    try {
      await purchaseProduct(productId);
      
      // For native platforms, the result would come through listeners
      // For now, just return after the call
      setIsPurchasing(false);
      return true;
    } catch (e: any) {
      console.error('[useIAPSubscription] Purchase error:', e);
      setError(e.message);
      setIsPurchasing(false);
      
      if (e.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Failed', e.message || 'Something went wrong. Please try again.');
      }
      
      return false;
    }
  }, [isPurchasing]);

  // Restore purchases
  const restore = useCallback(async (): Promise<boolean> => {
    if (!isIAPAvailable()) {
      Alert.alert('Not Available', 'Restore purchases is only available on iOS and Android.');
      return false;
    }
    
    setIsRestoring(true);
    setError(null);
    
    try {
      const purchases = await restorePurchases();
      
      if (purchases.length === 0) {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
        setIsRestoring(false);
        return false;
      }
      
      // Validate the most recent purchase with backend
      const token = await AsyncStorage.getItem('session_token');
      if (token && purchases.length > 0) {
        const provider = getSubscriptionProvider();
        if (provider !== 'WEB') {
          const p = purchases[0];
          await validateReceipt(
            p.transactionReceipt,
            provider as 'APPLE' | 'GOOGLE',
            p.productId,
            token,
            API_BASE
          );
        }
      }
      
      Alert.alert('Restore Successful', 'Your subscription has been restored.');
      setIsRestoring(false);
      return true;
    } catch (e: any) {
      console.error('[useIAPSubscription] Restore error:', e);
      setError(e.message);
      setIsRestoring(false);
      Alert.alert('Restore Failed', e.message || 'Failed to restore purchases.');
      return false;
    }
  }, []);

  // Refresh products
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const availableProducts = await fetchProducts();
      setProducts(availableProducts);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    products,
    isLoading,
    error,
    isPurchasing,
    isRestoring,
    purchase,
    restore,
    refresh,
    isAvailable: isIAPAvailable(),
    platform: getCurrentPlatform(),
    provider: getSubscriptionProvider(),
  };
}

export default useIAPSubscription;
