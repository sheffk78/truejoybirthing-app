// Midwife Subscription Page
import SubscriptionPage from '../../src/components/provider/SubscriptionPage';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

export default function MidwifeSubscriptionScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  return <SubscriptionPage primaryColor={colors.roleMidwife} role="MIDWIFE" />;
}
