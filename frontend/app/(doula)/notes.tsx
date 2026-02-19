// Doula Notes Screen - Thin wrapper using shared ProviderNotes component
import React from 'react';
import ProviderNotes from '../../src/components/provider/ProviderNotes';
import { DOULA_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function DoulaNotesScreen() {
  return <ProviderNotes config={DOULA_CONFIG} />;
}
