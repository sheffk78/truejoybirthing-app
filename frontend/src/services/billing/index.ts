/**
 * Billing Module Index
 * 
 * Exports all billing-related services and configurations
 * for Apple App Store and Google Play subscriptions.
 */

export * from './subscriptionConfig';
export * from './iapService';

// Re-export the singleton for convenience
export { default as iapService } from './iapService';
