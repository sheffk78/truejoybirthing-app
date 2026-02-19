// Midwife Clients Screen - Thin wrapper using shared ProviderClients component
import React from 'react';
import { ProviderClients, MIDWIFE_CONFIG } from '../../src/components/provider';

export default function MidwifeClientsScreen() {
  return <ProviderClients config={MIDWIFE_CONFIG} />;
}
