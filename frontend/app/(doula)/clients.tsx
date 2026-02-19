// Doula Clients Screen - Thin wrapper using shared ProviderClients component
import React from 'react';
import { ProviderClients, DOULA_CONFIG } from '../../src/components/provider';

export default function DoulaClientsScreen() {
  return <ProviderClients config={DOULA_CONFIG} />;
}
