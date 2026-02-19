// Doula Contract Templates Screen - Thin wrapper using shared ProviderContractTemplates component
import React from 'react';
import ProviderContractTemplates from '../../src/components/provider/ProviderContractTemplates';
import { DOULA_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function DoulaContractTemplatesScreen() {
  return <ProviderContractTemplates config={DOULA_CONFIG} />;
}
