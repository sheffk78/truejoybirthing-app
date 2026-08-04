// Lactation Subscription Page
import SubscriptionPage from '../../src/components/provider/SubscriptionPage';
import { useColors } from '../../src/hooks/useThemedStyles';

export default function LactationSubscriptionScreen() {
  const colors = useColors();
  return <SubscriptionPage primaryColor={colors.roleLactation} role="LACTATION" />;
}
