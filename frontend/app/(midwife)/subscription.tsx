// Midwife Subscription Page
import SubscriptionPage from '../../src/components/provider/SubscriptionPage';
import { useColors } from '../../src/hooks/useThemedStyles';

export default function MidwifeSubscriptionScreen() {
  const colors = useColors();
  return <SubscriptionPage primaryColor={colors.roleMidwife} role="MIDWIFE" />;
}
