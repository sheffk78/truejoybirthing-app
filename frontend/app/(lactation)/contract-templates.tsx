// Lactation Contract Templates Screen - Thin wrapper using shared ProviderContractTemplates component
import React from 'react';
import ProviderContractTemplates from '../../src/components/provider/ProviderContractTemplates';
import { LACTATION_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function LactationContractTemplatesScreen() {
  return <ProviderContractTemplates config={LACTATION_CONFIG} />;
}
