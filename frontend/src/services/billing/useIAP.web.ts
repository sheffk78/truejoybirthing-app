/**
 * useIAP Hook - Web Version
 * 
 * Web-safe version that returns mock data.
 * The native version is in useIAP.native.ts
 */

import { useState, useCallback } from 'react';
import { SUBSCRIPTION_PRODUCTS } from './subscriptionConfig';

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
    description: 'Full access to all Pro features. Save $84.89!',
    price: '274.99',
    localizedPrice: '$274.99',
    currency: 'USD',
    isMonthly: false,
    subscriptionPeriod: 'P1Y',
  },
];

export function useIAP(): UseIAPReturn {
  const [products] = useState<IAPProduct[]>(MOCK_PRODUCTS);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const purchase = useCallback(async (): Promise<PurchaseResult> => {
    return { success: false, error: 'IAP not available on web' };
  }, []);

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    return { success: false, error: 'Restore not available on web' };
  }, []);

  const refreshProducts = useCallback(async () => {
    // No-op on web
  }, []);

  return {
    products,
    isLoading,
    isAvailable: false,
    error,
    purchase,
    restore,
    refreshProducts,
  };
}

export default useIAP;
