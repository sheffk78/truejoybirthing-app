// Export all shared provider components
export { default as ProviderDashboard } from './ProviderDashboard';
export { default as ProviderMessages } from './ProviderMessages';
export { default as ProviderInvoices } from './ProviderInvoices';
export { default as ProviderClients } from './ProviderClients';
export { default as ProviderProfile } from './ProviderProfile';
export { default as ProviderNotes } from './ProviderNotes';
export { default as ProviderAppointments } from './ProviderAppointments';
export { default as ProviderClientDetail } from './ProviderClientDetail';
export { default as ProviderContracts } from './ProviderContracts';
export { default as ProviderContractTemplates } from './ProviderContractTemplates';
export { default as ProviderLeads } from './ProviderLeads';

// Export config
export { DOULA_CONFIG, MIDWIFE_CONFIG, getProviderConfig } from './config/providerConfig';
export type { ProviderConfig } from './config/providerConfig';

// Export types
export * from './types/provider';
