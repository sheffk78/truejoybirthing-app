// Lactation Leads Screen - Thin wrapper using shared ProviderLeads component
import { ProviderLeads, LACTATION_CONFIG } from '../../src/components/provider';

export default function LactationLeadsScreen() {
  return <ProviderLeads config={LACTATION_CONFIG} />;
}
