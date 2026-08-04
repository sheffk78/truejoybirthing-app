// Lactation Contracts Screen - Thin wrapper using shared ProviderContracts component
import React from 'react';
import ProviderContracts from '../../src/components/provider/ProviderContracts';
import { LACTATION_CONTRACTS_CONFIG } from '../../src/components/provider/config/contractsConfig';

export default function LactationContractsScreen() {
  return <ProviderContracts config={LACTATION_CONTRACTS_CONFIG} />;
}
