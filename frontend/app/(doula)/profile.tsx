// Doula Profile Screen - Thin wrapper using shared ProviderProfile component
import React from 'react';
import { ProviderProfile, DOULA_CONFIG } from '../../src/components/provider';

export default function DoulaProfileScreen() {
  return <ProviderProfile config={DOULA_CONFIG} />;
}
