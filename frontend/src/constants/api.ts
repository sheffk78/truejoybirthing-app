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
  
  // Mom
  MOM_ONBOARDING: '/mom/onboarding',
  MOM_PROFILE: '/mom/profile',
  MOM_TEAM: '/mom/team',
  
  // Birth Plan
  BIRTH_PLAN: '/birth-plan',
  BIRTH_PLAN_SECTION: '/birth-plan/section',
  BIRTH_PLAN_EXPORT: '/birth-plan/export',
  
  // Wellness
  WELLNESS_CHECKIN: '/wellness/checkin',
  WELLNESS_CHECKINS: '/wellness/checkins',
  
  // Postpartum
  POSTPARTUM_PLAN: '/postpartum/plan',
  
  // Timeline
  TIMELINE: '/timeline',
  
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
  MIDWIFE_VISITS: '/midwife/visits',
  MIDWIFE_BIRTH_SUMMARIES: '/midwife/birth-summaries',
  MIDWIFE_NOTES: '/midwife/notes',
  
  // Admin
  ADMIN_USERS: '/admin/users',
  ADMIN_CONTENT: '/admin/content',
  
  // Marketplace
  MARKETPLACE_PROVIDERS: '/marketplace/providers',
  MARKETPLACE_PROVIDER: '/marketplace/provider',
};

export default API_ENDPOINTS;
