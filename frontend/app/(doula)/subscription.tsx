// Doula Subscription Page
import SubscriptionPage from '../../src/components/provider/SubscriptionPage';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

export default function DoulaSubscriptionScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  return <SubscriptionPage primaryColor={colors.roleDoula} role="DOULA" />;
}
