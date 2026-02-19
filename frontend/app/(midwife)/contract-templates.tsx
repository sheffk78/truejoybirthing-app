// Midwife Contract Templates Screen - Thin wrapper using shared ProviderContractTemplates component
import React from 'react';
import ProviderContractTemplates from '../../src/components/provider/ProviderContractTemplates';
import { MIDWIFE_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function MidwifeContractTemplatesScreen() {
  return <ProviderContractTemplates config={MIDWIFE_CONFIG} />;
}
