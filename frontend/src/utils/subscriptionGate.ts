/**
 * Subscription Gate Utility
 * Provides soft gatekeeping for provider features that require an active subscription
 */

import { useSubscriptionStore } from '../store/subscriptionStore';
import { Alert, Linking, Platform } from 'react-native';

export type GatedAction = 
  | 'accept_client'
  | 'add_client'
  | 'approve_lead'
  | 'send_contract'
  | 'create_invoice';

const ACTION_MESSAGES: Record<GatedAction, string> = {
  accept_client: 'Accept new clients',
  add_client: 'Add new clients',
  approve_lead: 'Convert leads to clients',
  send_contract: 'Send contracts to clients',
  create_invoice: 'Create invoices',
};

/**
 * Check if the user has an active subscription
 */
export const hasActiveSubscription = (): boolean => {
  const status = useSubscriptionStore.getState().status;
  if (!status) return false;
  return status.has_pro_access === true;
};

/**
 * Get the current subscription status
 */
export const getSubscriptionStatus = () => {
  return useSubscriptionStore.getState().status;
};

/**
 * Check if user can perform a gated action
 * Returns true if allowed, false if blocked
 */
export const canPerformAction = (action: GatedAction): boolean => {
  return hasActiveSubscription();
};

/**
 * Show subscription required alert
 * @param action - The action that requires subscription
 * @param onNavigate - Callback to navigate to subscription page
 */
export const showSubscriptionAlert = (
  action: GatedAction,
  onNavigate?: () => void
): void => {
  const actionName = ACTION_MESSAGES[action] || action;
  
  Alert.alert(
    'Subscription Required',
    `You need an active subscription to ${actionName.toLowerCase()}.\n\nUpgrade now to unlock all features and grow your practice.`,
    [
      {
        text: 'Maybe Later',
        style: 'cancel',
      },
      {
        text: 'View Plans',
        onPress: () => {
          if (onNavigate) {
            onNavigate();
          }
        },
      },
    ]
  );
};

/**
 * Gate a function - only execute if subscription is active
 * @param action - The action being gated
 * @param fn - The function to execute if allowed
 * @param onNavigate - Callback to navigate to subscription page
 */
export const gateAction = async <T>(
  action: GatedAction,
  fn: () => T | Promise<T>,
  onNavigate?: () => void
): Promise<T | null> => {
  if (canPerformAction(action)) {
    return await fn();
  } else {
    showSubscriptionAlert(action, onNavigate);
    return null;
  }
};

/**
 * Hook-friendly version - returns gate check result and alert function
 */
export const useSubscriptionGate = () => {
  const { status, fetchStatus } = useSubscriptionStore();
  
  const isSubscribed = status?.has_pro_access === true;
  const subscriptionStatus = status?.subscription_status || 'none';
  const daysRemaining = status?.days_remaining || 0;
  const isTrialActive = status?.is_trial && daysRemaining > 0;
  
  const checkAndAlert = (action: GatedAction, onNavigate?: () => void): boolean => {
    if (isSubscribed) {
      return true;
    }
    showSubscriptionAlert(action, onNavigate);
    return false;
  };
  
  return {
    isSubscribed,
    subscriptionStatus,
    daysRemaining,
    isTrialActive,
    checkAndAlert,
    canPerform: canPerformAction,
    refreshStatus: fetchStatus,
  };
};

export default {
  hasActiveSubscription,
  canPerformAction,
  showSubscriptionAlert,
  gateAction,
  useSubscriptionGate,
};
