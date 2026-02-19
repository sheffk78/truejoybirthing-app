// Role-specific configuration for Provider components
import { COLORS } from '../../../constants/theme';
import { API_ENDPOINTS } from '../../../constants/api';
import { ProviderRole } from '../types/provider';

export interface StatCard {
  key: string;
  label: string;
  colorKey?: 'primary' | 'accent' | 'warning' | 'success';
}

export interface QuickAction {
  label: string;
  icon: string;
  route: string;
  colorKey?: 'primary' | 'accent' | 'warning' | 'success';
}

export interface ProviderConfig {
  role: ProviderRole;
  roleLabel: string;
  roleLabelPlural: string;
  primaryColor: string;
  
  // API Endpoints
  endpoints: {
    dashboard: string;
    profile: string;
    clients: string;
    invoices: string;
    contracts: string;
    notes: string;
  };
  
  // Navigation paths
  routes: {
    dashboard: string;
    profile: string;
    clients: string;
    invoices: string;
    contracts: string;
    messages: string;
    notes: string;
  };
  
  // Dashboard config
  dashboard: {
    title: string;
    statsCards: StatCard[];
    quickActions: QuickAction[];
    tipTitle: string;
    tipText: string;
  };
  
  // Client statuses available for this role
  clientStatuses: string[];
  
  // Profile fields specific to this role
  profileFields: {
    specialtyField: string;
    specialtyLabel: string;
    specialtyOptions: string[];
  };
}

export const DOULA_CONFIG: ProviderConfig = {
  role: 'DOULA',
  roleLabel: 'Doula',
  roleLabelPlural: 'Doulas',
  primaryColor: COLORS.roleDoula,
  
  endpoints: {
    dashboard: API_ENDPOINTS.DOULA_DASHBOARD,
    profile: API_ENDPOINTS.DOULA_PROFILE,
    clients: API_ENDPOINTS.DOULA_CLIENTS,
    invoices: API_ENDPOINTS.DOULA_INVOICES,
    contracts: API_ENDPOINTS.DOULA_CONTRACTS,
    notes: '/api/doula/notes',
  },
  
  routes: {
    dashboard: '/(doula)/dashboard',
    profile: '/(doula)/profile',
    clients: '/(doula)/clients',
    invoices: '/(doula)/invoices',
    contracts: '/(doula)/contracts',
    messages: '/(doula)/messages',
    notes: '/(doula)/notes',
  },
  
  dashboard: {
    title: 'Doula Dashboard',
    statsCards: [
      { key: 'prenatal_clients', label: 'Prenatal Clients', icon: 'people-outline' },
      { key: 'upcoming_appointments', label: 'Upcoming Appts', icon: 'calendar-outline' },
    ],
    quickActions: [
      { label: 'See Clients', icon: 'people-outline', route: '/(doula)/clients' },
      { label: 'Contracts', icon: 'document-text-outline', route: '/(doula)/contracts' },
      { label: 'Invoices', icon: 'cash-outline', route: '/(doula)/invoices' },
      { label: 'Appointments', icon: 'calendar-outline', route: '/(doula)/appointments' },
    ],
  },
  
  clientStatuses: ['Active', 'Prenatal', 'Contract Sent', 'Contract Signed', 'In Labor', 'Postpartum', 'Completed'],
  
  profileFields: {
    specialtyField: 'specialties',
    specialtyLabel: 'Specialties',
    specialtyOptions: [
      'Birth Doula',
      'Postpartum Doula',
      'Antepartum Support',
      'Bereavement Support',
      'VBAC Support',
      'Teen Support',
      'LGBTQ+ Affirming',
      'High-Risk Pregnancy',
      'Multiples',
      'Cesarean Support',
    ],
  },
};

export const MIDWIFE_CONFIG: ProviderConfig = {
  role: 'MIDWIFE',
  roleLabel: 'Midwife',
  roleLabelPlural: 'Midwives',
  primaryColor: COLORS.roleMidwife,
  
  endpoints: {
    dashboard: API_ENDPOINTS.MIDWIFE_DASHBOARD,
    profile: API_ENDPOINTS.MIDWIFE_PROFILE,
    clients: API_ENDPOINTS.MIDWIFE_CLIENTS,
    invoices: API_ENDPOINTS.MIDWIFE_INVOICES,
    contracts: API_ENDPOINTS.MIDWIFE_CONTRACTS,
    notes: '/api/midwife/notes',
  },
  
  routes: {
    dashboard: '/(midwife)/dashboard',
    profile: '/(midwife)/profile',
    clients: '/(midwife)/clients',
    invoices: '/(midwife)/invoices',
    contracts: '/(midwife)/contracts',
    messages: '/(midwife)/messages',
    notes: '/(midwife)/notes',
  },
  
  dashboard: {
    title: 'Midwife Dashboard',
    statsCards: [
      { key: 'prenatal_clients', label: 'Prenatal Clients', icon: 'people-outline' },
      { key: 'upcoming_appointments', label: 'Upcoming Appts', icon: 'calendar-outline' },
      { key: 'visits_this_month', label: 'Visits This Month', icon: 'clipboard-outline' },
      { key: 'births_this_month', label: 'Births This Month', icon: 'heart-outline' },
    ],
    quickActions: [
      { label: 'Add Client', icon: 'person-add-outline', route: '/(midwife)/clients' },
      { label: 'Add Visit', icon: 'create-outline', route: '/(midwife)/visits' },
      { label: 'Birth Summary', icon: 'document-text-outline', route: '/(midwife)/birth-summaries' },
      { label: 'Appointments', icon: 'calendar-outline', route: '/(midwife)/appointments' },
    ],
  },
  
  clientStatuses: ['Prenatal', 'Contract Sent', 'Contract Signed', 'In Labor', 'Postpartum', 'Completed'],
  
  profileFields: {
    specialtyField: 'birth_settings_served',
    specialtyLabel: 'Birth Settings Served',
    specialtyOptions: [
      'Home Birth',
      'Birth Center',
      'Hospital',
      'Water Birth',
    ],
  },
};

// Helper to get config by role
export const getProviderConfig = (role: ProviderRole | string): ProviderConfig => {
  const normalizedRole = role.toUpperCase();
  if (normalizedRole === 'MIDWIFE') return MIDWIFE_CONFIG;
  return DOULA_CONFIG;
};
