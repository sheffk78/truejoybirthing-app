// Midwife Client Detail - Uses shared ProviderClientDetail component
// Midwife version shows additional Prenatal Visits section
import React from 'react';
import ProviderClientDetail from '../../src/components/provider/ProviderClientDetail';
import { MIDWIFE_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function MidwifeClientDetailScreen() {
  return <ProviderClientDetail config={MIDWIFE_CONFIG} />;
}
