/**
 * Billing Module Index
 * 
 * Exports all billing-related services and configurations
 * for Apple App Store and Google Play subscriptions.
 */

export * from './subscriptionConfig';
export * from './iapService';
export * from './useIAP';

// Re-export singletons and hooks for convenience
export { default as iapService } from './iapService';
export { default as useIAP } from './useIAP';
