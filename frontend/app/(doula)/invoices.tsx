// Doula Invoices Screen - Thin wrapper using shared ProviderInvoices component
import React from 'react';
import { ProviderInvoices, DOULA_CONFIG } from '../../src/components/provider';

export default function DoulaInvoicesScreen() {
  return <ProviderInvoices config={DOULA_CONFIG} />;
}
