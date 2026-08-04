// Lactation Notes Screen - Thin wrapper using shared ProviderNotes component
import React from 'react';
import ProviderNotes from '../../src/components/provider/ProviderNotes';
import { LACTATION_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function LactationNotesScreen() {
  return <ProviderNotes config={LACTATION_CONFIG} />;
}
