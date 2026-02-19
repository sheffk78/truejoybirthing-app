/**
 * useIAPSubscription Hook
 * 
 * A React hook that provides in-app purchase functionality for True Joy Birthing.
 * This hook manages the billing connection lifecycle and provides methods for
 * purchasing subscriptions and restoring purchases.
 * 
 * Note: On web, this hook returns mock/disabled functionality since IAP is native-only.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only import react-native-iap on native platforms
const RNIap = Platform.OS !== 'web' ? require('react-native-iap') : null;

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
  getProductSkus,
  Product,
  ProductId,
} from '../services/billing';
import { API_BASE } from '../../src/constants/api';

interface UseIAPSubscriptionReturn {
  // State
  products: Product[];
  isLoading: boolean;
  error: string | null;
  isPurchasing: boolean;
  isRestoring: boolean;
  
  // Actions
  purchase: (productId: ProductId) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
  
  // Helpers
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
  
  const purchaseListenerCleanup = useRef<(() => void) | null>(null);
  const pendingPurchaseResolve = useRef<((success: boolean) => void) | null>(null);

  // Initialize billing on mount
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      if (!isIAPAvailable()) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Initialize the billing connection
        const initialized = await initializeBilling();
        
        if (!initialized) {
          if (isMounted) {
            setError('Failed to initialize billing');
            setIsLoading(false);
          }
          return;
        }
        
        // Set up purchase listeners
        purchaseListenerCleanup.current = setupPurchaseListeners();
        
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
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (purchaseListenerCleanup.current) {
        purchaseListenerCleanup.current();
      }
      cleanupBilling();
    };
  }, []);

  // Set up purchase listeners
  const setupPurchaseListeners = useCallback(() => {
    // Purchase success handler
    const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
      console.log('[useIAPSubscription] Purchase updated:', purchase.productId);
      
      const receipt = purchase.transactionReceipt;
      if (receipt) {
        try {
          // Acknowledge the purchase (Android)
          if (Platform.OS === 'android' && !purchase.isAcknowledgedAndroid) {
            await RNIap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken! });
          }
          
          // Finish the transaction (iOS)
          if (Platform.OS === 'ios') {
            await RNIap.finishTransaction({ purchase, isConsumable: false });
          }
          
          // Validate receipt with backend
          const token = await AsyncStorage.getItem('session_token');
          if (token) {
            const provider = getSubscriptionProvider();
            if (provider !== 'WEB') {
              await validateReceipt(
                receipt,
                provider as 'APPLE' | 'GOOGLE',
                purchase.productId,
                token,
                API_BASE
              );
            }
          }
          
          // Resolve pending purchase promise
          if (pendingPurchaseResolve.current) {
            pendingPurchaseResolve.current(true);
            pendingPurchaseResolve.current = null;
          }
          
          setIsPurchasing(false);
          
          Alert.alert(
            'Purchase Successful!',
            'Thank you for subscribing to True Joy Pro. Your subscription is now active.',
            [{ text: 'OK' }]
          );
        } catch (e: any) {
          console.error('[useIAPSubscription] Error processing purchase:', e);
          setError(e.message);
          setIsPurchasing(false);
          
          if (pendingPurchaseResolve.current) {
            pendingPurchaseResolve.current(false);
            pendingPurchaseResolve.current = null;
          }
        }
      }
    });
    
    // Purchase error handler
    const purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
      console.error('[useIAPSubscription] Purchase error:', error);
      
      setIsPurchasing(false);
      
      if (error.code !== 'E_USER_CANCELLED') {
        setError(error.message || 'Purchase failed');
        Alert.alert('Purchase Failed', error.message || 'Something went wrong. Please try again.');
      }
      
      if (pendingPurchaseResolve.current) {
        pendingPurchaseResolve.current(false);
        pendingPurchaseResolve.current = null;
      }
    });
    
    // Return cleanup function
    return () => {
      purchaseUpdateSubscription.remove?.();
      purchaseErrorSubscription.remove?.();
    };
  }, []);

  // Purchase a subscription
  const purchase = useCallback(async (productId: ProductId): Promise<boolean> => {
    if (!isIAPAvailable()) {
      Alert.alert('Not Available', 'In-app purchases are not available on this platform.');
      return false;
    }
    
    if (isPurchasing) {
      return false;
    }
    
    setIsPurchasing(true);
    setError(null);
    
    try {
      // Create a promise that will be resolved by the purchase listener
      const purchasePromise = new Promise<boolean>((resolve) => {
        pendingPurchaseResolve.current = resolve;
        
        // Set a timeout for the purchase
        setTimeout(() => {
          if (pendingPurchaseResolve.current === resolve) {
            pendingPurchaseResolve.current = null;
            resolve(false);
            setIsPurchasing(false);
          }
        }, 120000); // 2 minute timeout
      });
      
      // Initiate the purchase
      await purchaseProduct(productId);
      
      // Wait for the purchase to complete
      return await purchasePromise;
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
      Alert.alert('Not Available', 'In-app purchases are not available on this platform.');
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
          const purchase = purchases[0];
          await validateReceipt(
            purchase.transactionReceipt,
            provider as 'APPLE' | 'GOOGLE',
            purchase.productId,
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
    if (!isIAPAvailable()) {
      return;
    }
    
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
