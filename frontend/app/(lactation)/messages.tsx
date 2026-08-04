// Lactation Messages Screen - Thin wrapper using shared ProviderMessages component
import React from 'react';
import { ProviderMessages, LACTATION_CONFIG } from '../../src/components/provider';

export default function LactationMessagesScreen() {
  return <ProviderMessages config={LACTATION_CONFIG} />;
}
