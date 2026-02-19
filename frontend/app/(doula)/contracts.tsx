// Doula Contracts Screen - Thin wrapper using shared ProviderContracts component
import React from 'react';
import ProviderContracts from '../../src/components/provider/ProviderContracts';
import { DOULA_CONTRACTS_CONFIG } from '../../src/components/provider/config/contractsConfig';

export default function DoulaContractsScreen() {
  return <ProviderContracts config={DOULA_CONTRACTS_CONFIG} />;
}
