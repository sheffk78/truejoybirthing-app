// Lactation Appointments Screen - Thin wrapper using shared ProviderAppointments component
import React from 'react';
import ProviderAppointments from '../../src/components/provider/ProviderAppointments';
import { LACTATION_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function LactationAppointmentsScreen() {
  return <ProviderAppointments config={LACTATION_CONFIG} />;
}
