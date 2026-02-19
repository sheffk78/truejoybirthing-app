// Midwife Appointments Screen - Thin wrapper using shared ProviderAppointments component
import React from 'react';
import ProviderAppointments from '../../src/components/provider/ProviderAppointments';
import { MIDWIFE_CONFIG } from '../../src/components/provider/config/providerConfig';

export default function MidwifeAppointmentsScreen() {
  return <ProviderAppointments config={MIDWIFE_CONFIG} />;
}
