// Midwife Notes Screen - Thin wrapper using shared ProviderNotes component
import React from 'react';
import ProviderNotes from '../../src/components/provider/ProviderNotes';
import { MIDWIFE_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function MidwifeNotesScreen() {
  return <ProviderNotes config={MIDWIFE_CONFIG} />;
}
