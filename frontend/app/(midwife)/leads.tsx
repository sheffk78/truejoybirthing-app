// Midwife Leads Screen - Thin wrapper using shared ProviderLeads component
import { ProviderLeads, MIDWIFE_CONFIG } from '../../src/components/provider';

export default function MidwifeLeadsScreen() {
  return <ProviderLeads config={MIDWIFE_CONFIG} />;
}
