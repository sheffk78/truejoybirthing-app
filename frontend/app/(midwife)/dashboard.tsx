// Midwife Dashboard Screen - Thin wrapper using shared ProviderDashboard component
import React from 'react';
import { ProviderDashboard, MIDWIFE_CONFIG } from '../../src/components/provider';

export default function MidwifeDashboardScreen() {
  return <ProviderDashboard config={MIDWIFE_CONFIG} />;
}
