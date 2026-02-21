/**
 * IAP Service - Web Stub
 * 
 * This is a web-safe stub that provides mock implementations
 * for the IAP service. Real IAP functionality is in iapService.native.ts
 */

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
    description: 'Full access to all Pro features. Save $72!',
    price: '276.00',
    localizedPrice: '$276.00',
    currency: 'USD',
    isMonthly: false,
    subscriptionPeriod: 'P1Y',
  },
];

class IAPServiceWeb {
  async initialize(): Promise<boolean> {
    console.log('[IAP] Web platform - IAP not available');
    return false;
  }

  async getProducts(): Promise<IAPProduct[]> {
    return MOCK_PRODUCTS;
  }

  async purchaseSubscription(): Promise<PurchaseResult> {
    return { success: false, error: 'IAP not available on web' };
  }

  async restorePurchases(): Promise<PurchaseResult> {
    return { success: false, error: 'Restore not available on web' };
  }

  setCallbacks() {}

  async cleanup() {}
}

export const iapService = new IAPServiceWeb();
export default iapService;
