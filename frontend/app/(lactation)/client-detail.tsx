// Lactation Client Detail - Uses shared ProviderClientDetail component
import React from 'react';
import ProviderClientDetail from '../../src/components/provider/ProviderClientDetail';
import { LACTATION_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function LactationClientDetailScreen() {
  return <ProviderClientDetail config={LACTATION_CONFIG} />;
}
