// Doula Appointments Screen - Thin wrapper using shared ProviderAppointments component
import React from 'react';
import ProviderAppointments from '../../src/components/provider/ProviderAppointments';
import { DOULA_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function DoulaAppointmentsScreen() {
  return <ProviderAppointments config={DOULA_CONFIG} />;
}
