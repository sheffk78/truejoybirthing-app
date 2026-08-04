// Lactation Clients Screen - Thin wrapper using shared ProviderClients component
import React from 'react';
import { ProviderClients, LACTATION_CONFIG } from '../../src/components/provider';

export default function LactationClientsScreen() {
  return <ProviderClients config={LACTATION_CONFIG} />;
}
