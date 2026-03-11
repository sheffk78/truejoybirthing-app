// Doula Subscription Page
import SubscriptionPage from '../../src/components/provider/SubscriptionPage';
import { useColors } from '../../src/hooks/useThemedStyles';

export default function DoulaSubscriptionScreen() {
  const colors = useColors();
  return <SubscriptionPage primaryColor={colors.roleDoula} role="DOULA" />;
}
