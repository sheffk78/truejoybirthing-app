/**
 * Billing Module Index
 * 
 * Exports subscription configuration.
 * 
 * NOTE: IAP service (iapService.native.ts and useIAP.ts) should NOT be imported
 * directly from this index on web platforms. They should be dynamically
 * required only on native platforms to avoid importing expo-iap.
 */

export * from './subscriptionConfig';

// Re-export config only - IAP must be dynamically imported on native
export { SUBSCRIPTION_PRODUCTS, SUBSCRIPTION_PLANS } from './subscriptionConfig';
