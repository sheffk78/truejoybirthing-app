// Doula Leads Screen - Thin wrapper using shared ProviderLeads component
import { ProviderLeads, DOULA_CONFIG } from '../../src/components/provider';

export default function DoulaLeadsScreen() {
  return <ProviderLeads config={DOULA_CONFIG} />;
}
