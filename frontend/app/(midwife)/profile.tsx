// Midwife Profile Screen - Thin wrapper using shared ProviderProfile component
import React from 'react';
import { ProviderProfile, MIDWIFE_CONFIG } from '../../src/components/provider';

export default function MidwifeProfileScreen() {
  return <ProviderProfile config={MIDWIFE_CONFIG} />;
}
