// Midwife Messages Screen - Thin wrapper using shared ProviderMessages component
import React from 'react';
import { ProviderMessages, MIDWIFE_CONFIG } from '../../src/components/provider';

export default function MidwifeMessagesScreen() {
  return <ProviderMessages config={MIDWIFE_CONFIG} />;
}
