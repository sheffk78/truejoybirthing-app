// API Configuration
// In web environment, use relative path since backend and frontend are on same domain
// The /api prefix is handled by the Kubernetes ingress
import { Platform } from 'react-native';

const getBackendUrl = () => {
  if (Platform.OS === 'web') {
    // On web, use relative path - the proxy will handle routing to backend
    return '';
  }
  // On native, use the environment variable
  return process.env.EXPO_PUBLIC_BACKEND_URL || '';
};

export const API_BASE = `${getBackendUrl()}/api`;

export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_GOOGLE_SESSION: '/auth/google-session',
  AUTH_ME: '/auth/me',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_SET_ROLE: '/auth/set-role',
  AUTH_UPDATE_PROFILE: '/auth/update-profile',
  
  // Mom
  MOM_ONBOARDING: '/mom/onboarding',
  MOM_PROFILE: '/mom/profile',
  MOM_TEAM: '/mom/team',
  
  // Birth Plan
  BIRTH_PLAN: '/birth-plan',
  BIRTH_PLAN_SECTION: '/birth-plan/section',
  BIRTH_PLAN_EXPORT: '/birth-plan/export',
  BIRTH_PLAN_SHARE: '/birth-plan/share',
  BIRTH_PLAN_SHARE_REQUESTS: '/birth-plan/share-requests',
  
  // Provider Search
  PROVIDERS_SEARCH: '/providers/search',
  
  // Provider Share Endpoints
  PROVIDER_SHARE_REQUESTS: '/provider/share-requests',
  PROVIDER_SHARED_BIRTH_PLANS: '/provider/shared-birth-plans',
  PROVIDER_BIRTH_PLAN_NOTES: '/provider/birth-plan',
  PROVIDER_NOTES: '/provider/notes',
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATIONS_READ_ALL: '/notifications/read-all',
  
  // Wellness (Enhanced)
  WELLNESS_CHECKIN: '/wellness/checkin',
  WELLNESS_CHECKINS: '/wellness/checkins',
  WELLNESS_ENTRY: '/wellness/entry',
  WELLNESS_ENTRIES: '/wellness/entries',
  WELLNESS_STATS: '/wellness/stats',
  
  // Timeline
  TIMELINE: '/timeline',
  TIMELINE_EVENTS: '/timeline/events',
  
  // Postpartum
  POSTPARTUM_PLAN: '/postpartum/plan',
  
  // Doula
  DOULA_ONBOARDING: '/doula/onboarding',
  DOULA_PROFILE: '/doula/profile',
  DOULA_DASHBOARD: '/doula/dashboard',
  DOULA_CLIENTS: '/doula/clients',
  DOULA_CONTRACTS: '/doula/contracts',
  DOULA_INVOICES: '/doula/invoices',
  DOULA_NOTES: '/doula/notes',
  
  // Midwife
  MIDWIFE_ONBOARDING: '/midwife/onboarding',
  MIDWIFE_PROFILE: '/midwife/profile',
  MIDWIFE_DASHBOARD: '/midwife/dashboard',
  MIDWIFE_CLIENTS: '/midwife/clients',
  MIDWIFE_CONTRACTS: '/midwife/contracts',
  MIDWIFE_INVOICES: '/midwife/invoices',
  MIDWIFE_VISITS: '/midwife/visits',
  MIDWIFE_BIRTH_SUMMARIES: '/midwife/birth-summaries',
  MIDWIFE_NOTES: '/midwife/notes',
  
  // Payment Instructions (shared by Doula & Midwife)
  PAYMENT_INSTRUCTIONS: '/payment-instructions',
  
  // Mom Invoices
  MOM_INVOICES: '/mom/invoices',
  
  // Admin
  ADMIN_USERS: '/admin/users',
  ADMIN_CONTENT: '/admin/content',
  
  // Marketplace
  MARKETPLACE_PROVIDERS: '/marketplace/providers',
  MARKETPLACE_PROVIDER: '/marketplace/provider',
  
  // Messages
  MESSAGES_CONVERSATIONS: '/messages/conversations',
  MESSAGES: '/messages',
  MESSAGES_UNREAD_COUNT: '/messages/unread/count',
  
  // Contracts (public)
  CONTRACT_BY_ID: '/contracts',
  MIDWIFE_CONTRACT_BY_ID: '/midwife-contracts',
  
  // Appointments
  APPOINTMENTS: '/appointments',
  
  // Mom - Midwife Visits
  MOM_MIDWIFE_VISITS: '/mom/midwife-visits',
  
  // Weekly Content (Tips & Affirmations)
  WEEKLY_CONTENT: '/weekly-content',
  WEEKLY_CONTENT_ALL: '/weekly-content/all',
  
  // Subscription
  SUBSCRIPTION_STATUS: '/subscription/status',
  SUBSCRIPTION_PRICING: '/subscription/pricing',
  SUBSCRIPTION_START_TRIAL: '/subscription/start-trial',
  SUBSCRIPTION_ACTIVATE: '/subscription/activate',
  SUBSCRIPTION_CANCEL: '/subscription/cancel',
  
  // Pro Feedback
  PRO_FEEDBACK: '/pro/feedback',
  
  // Contract Templates
  CONTRACT_TEMPLATES: '/contract-templates',
};

export default API_ENDPOINTS;
