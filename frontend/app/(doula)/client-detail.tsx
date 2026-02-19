// Doula Client Detail - Uses shared ProviderClientDetail component
import React from 'react';
import ProviderClientDetail from '../../src/components/provider/ProviderClientDetail';
import { DOULA_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function DoulaClientDetailScreen() {
  return <ProviderClientDetail config={DOULA_CONFIG} />;
}
