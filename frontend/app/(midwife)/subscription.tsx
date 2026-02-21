// Midwife Subscription Page
import SubscriptionPage from '../../src/components/provider/SubscriptionPage';
import { COLORS } from '../../src/constants/theme';

export default function MidwifeSubscriptionScreen() {
  return <SubscriptionPage primaryColor={COLORS.roleMidwife} role="MIDWIFE" />;
}
