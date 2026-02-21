/**
 * useIAP Hook
 * 
 * React hook for handling In-App Purchases with Apple/Google stores.
 * Integrates iapService with the subscription store for seamless purchase flow.
 * 
 * Usage:
 * const { products, purchase, restore, isLoading, error } = useIAP();
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { iapService, IAPProduct, PurchaseResult } from './iapService';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import type { SubscriptionPurchase, PurchaseError } from 'react-native-iap';

export interface UseIAPReturn {
  /** Available products from the store */
  products: IAPProduct[];
  /** Whether IAP is currently loading/processing */
  isLoading: boolean;
  /** Whether IAP is available on this platform */
  isAvailable: boolean;
  /** Error message if any */
  error: string | null;
  /** Purchase a subscription by product ID */
  purchase: (productId: string, offerToken?: string) => Promise<PurchaseResult>;
  /** Restore previous purchases */
  restore: () => Promise<PurchaseResult>;
  /** Refresh products from store */
  refreshProducts: () => Promise<void>;
}

export function useIAP(): UseIAPReturn {
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  
  const { fetchStatus, validateReceipt } = useSubscriptionStore();

  // Initialize IAP on mount
  useEffect(() => {
    let mounted = true;

    const initIAP = async () => {
      // IAP not available on web
      if (Platform.OS === 'web') {
        setIsAvailable(false);
        return;
      }

      setIsLoading(true);
      try {
        const initialized = await iapService.initialize();
        if (!mounted) return;
        
        setIsAvailable(initialized);
        
        if (initialized) {
          // Set up purchase callbacks
          iapService.setCallbacks(
            handlePurchaseSuccess,
            handlePurchaseError
          );
          
          // Load products
          const storeProducts = await iapService.getProducts();
          if (mounted) {
            setProducts(storeProducts);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to initialize IAP');
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
      iapService.cleanup();
    };
  }, []);

  // Handle successful purchase
  const handlePurchaseSuccess = useCallback(async (purchase: SubscriptionPurchase) => {
    console.log('[useIAP] Purchase successful:', purchase.productId);
    
    // Validate with backend
    if (purchase.transactionReceipt) {
      const validated = await validateReceipt(
        purchase.transactionReceipt,
        purchase.productId
      );
      
      if (validated) {
        // Refresh subscription status
        await fetchStatus();
        
        // Show success message
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Purchase Complete',
            'Thank you for subscribing to True Joy Pro! Your subscription is now active.',
            [{ text: 'OK' }]
          );
        }
      } else {
        setError('Failed to validate purchase. Please contact support.');
      }
    }
  }, [validateReceipt, fetchStatus]);

  // Handle purchase error
  const handlePurchaseError = useCallback((purchaseError: PurchaseError) => {
    console.warn('[useIAP] Purchase error:', purchaseError);
    
    // User cancelled is not really an error
    if (purchaseError.code === 'E_USER_CANCELLED') {
      return;
    }
    
    setError(purchaseError.message || 'Purchase failed');
    
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Purchase Failed',
        purchaseError.message || 'Unable to complete purchase. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Purchase a subscription
  const purchase = useCallback(async (
    productId: string,
    offerToken?: string
  ): Promise<PurchaseResult> => {
    if (Platform.OS === 'web') {
      return { success: false, error: 'IAP not available on web' };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await iapService.purchaseSubscription(productId, offerToken);
      // Note: Actual success/failure will come through callbacks
      return result;
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore purchases
  const restore = useCallback(async (): Promise<PurchaseResult> => {
    if (Platform.OS === 'web') {
      return { success: false, error: 'Restore not available on web' };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await iapService.restorePurchases();
      
      if (result.success) {
        await fetchStatus();
        
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Restore Complete',
            'Your subscription has been restored successfully.',
            [{ text: 'OK' }]
          );
        }
      } else if (result.error !== 'No previous purchases found') {
        setError(result.error || 'Restore failed');
      }
      
      return result;
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  // Refresh products
  const refreshProducts = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    setIsLoading(true);
    try {
      const storeProducts = await iapService.getProducts();
      setProducts(storeProducts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
