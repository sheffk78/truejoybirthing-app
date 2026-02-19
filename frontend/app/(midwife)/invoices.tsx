// Midwife Invoices Screen - Thin wrapper using shared ProviderInvoices component
import React from 'react';
import { ProviderInvoices, MIDWIFE_CONFIG } from '../../src/components/provider';

export default function MidwifeInvoicesScreen() {
  return <ProviderInvoices config={MIDWIFE_CONFIG} />;
}
