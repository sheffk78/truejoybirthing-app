// Lactation Invoices Screen - Thin wrapper using shared ProviderInvoices component
import React from 'react';
import { ProviderInvoices, LACTATION_CONFIG } from '../../src/components/provider';

export default function LactationInvoicesScreen() {
  return <ProviderInvoices config={LACTATION_CONFIG} />;
}
