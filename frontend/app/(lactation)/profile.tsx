// Lactation Profile Screen - Thin wrapper using shared ProviderProfile component
import React from 'react';
import { ProviderProfile, LACTATION_CONFIG } from '../../src/components/provider';

export default function LactationProfileScreen() {
  return <ProviderProfile config={LACTATION_CONFIG} />;
}
