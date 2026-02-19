// Export all shared provider components
export { default as ProviderDashboard } from './ProviderDashboard';
export { default as ProviderMessages } from './ProviderMessages';
export { default as ProviderInvoices } from './ProviderInvoices';
export { default as ProviderClients } from './ProviderClients';

// Export config
export { DOULA_CONFIG, MIDWIFE_CONFIG, getProviderConfig } from './config/providerConfig';
export type { ProviderConfig } from './config/providerConfig';

// Export types
export * from './types/provider';
