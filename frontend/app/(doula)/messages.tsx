// Doula Messages Screen - Thin wrapper using shared ProviderMessages component
import React from 'react';
import { ProviderMessages, DOULA_CONFIG } from '../../src/components/provider';

export default function DoulaMessagesScreen() {
  return <ProviderMessages config={DOULA_CONFIG} />;
}
