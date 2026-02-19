// Doula Dashboard Screen - Thin wrapper using shared ProviderDashboard component
import React from 'react';
import { ProviderDashboard, DOULA_CONFIG } from '../../src/components/provider';

export default function DoulaDashboardScreen() {
  return <ProviderDashboard config={DOULA_CONFIG} />;
}
