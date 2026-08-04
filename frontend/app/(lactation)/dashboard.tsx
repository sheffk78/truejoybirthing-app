// Lactation Dashboard Screen - Thin wrapper using shared ProviderDashboard component
import React from 'react';
import { ProviderDashboard, LACTATION_CONFIG } from '../../src/components/provider';

export default function LactationDashboardScreen() {
  return <ProviderDashboard config={LACTATION_CONFIG} />;
}
