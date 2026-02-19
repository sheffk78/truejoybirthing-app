// Midwife Contracts Screen - Thin wrapper using shared ProviderContracts component
import React from 'react';
import ProviderContracts from '../../src/components/provider/ProviderContracts';
import { MIDWIFE_CONTRACTS_CONFIG } from '../../src/components/provider/config/contractsConfig';

export default function MidwifeContractsScreen() {
  return <ProviderContracts config={MIDWIFE_CONTRACTS_CONFIG} />;
}
