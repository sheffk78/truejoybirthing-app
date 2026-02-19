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

export interface ClientDetailTab {
  key: string;
  label: string;
  icon: string;
}

export interface ProviderConfig {
  role: ProviderRole;
  roleLabel: string;
  roleLabelPlural: string;
  primaryColor: string;
  
  // Feature flags
  features: {
    showVisits: boolean;
    showClinicalData: boolean;
    showBirthSummaries: boolean;
  };
  
  // API Endpoints (unified + legacy)
  endpoints: {
    dashboard: string;
    profile: string;
    clients: string;
    invoices: string;
    contracts: string;
    notes: string;
    appointments: string;
    visits: string;
    // Unified endpoints
    unifiedClients: string;
    unifiedAppointments: string;
    unifiedNotes: string;
    unifiedVisits: string;
    unifiedDashboard: string;
  };
  
  // Navigation paths
  routes: {
    dashboard: string;
    profile: string;
    clients: string;
    clientDetail: string;
    invoices: string;
    contracts: string;
    messages: string;
    notes: string;
    appointments: string;
    visits: string;
  };
  
  // Dashboard config
  dashboard: {
    title: string;
    statsCards: StatCard[];
    quickActions: QuickAction[];
    tipTitle: string;
    tipText: string;
  };
  
  // Client Detail tabs
  clientDetailTabs: ClientDetailTab[];
  
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
  
  features: {
    showVisits: false,
    showClinicalData: false,
    showBirthSummaries: false,
  },
  
  endpoints: {
    dashboard: API_ENDPOINTS.DOULA_DASHBOARD,
    profile: API_ENDPOINTS.DOULA_PROFILE,
    clients: API_ENDPOINTS.DOULA_CLIENTS,
    invoices: API_ENDPOINTS.DOULA_INVOICES,
    contracts: API_ENDPOINTS.DOULA_CONTRACTS,
    notes: '/doula/notes',
    appointments: '/appointments',
    visits: '',
    // Unified endpoints
    unifiedClients: '/provider/clients',
    unifiedAppointments: '/provider/appointments',
    unifiedNotes: '/provider/notes',
    unifiedVisits: '',
    unifiedDashboard: '/provider/dashboard',
  },
  
  routes: {
    dashboard: '/(doula)/dashboard',
    profile: '/(doula)/profile',
    clients: '/(doula)/clients',
    clientDetail: '/(doula)/client-detail',
    invoices: '/(doula)/invoices',
    contracts: '/(doula)/contracts',
    messages: '/(doula)/messages',
    notes: '/(doula)/notes',
    appointments: '/(doula)/appointments',
    visits: '',
  },
  
  dashboard: {
    title: 'Doula Dashboard',
    statsCards: [
      { key: 'active_clients', label: 'Active Clients', colorKey: 'primary' },
      { key: 'upcoming_appointments', label: 'Upcoming Appts', colorKey: 'accent' },
      { key: 'contracts_pending_signature', label: 'Pending Contracts', colorKey: 'warning' },
      { key: 'pending_invoices', label: 'Pending Invoices', colorKey: 'success' },
    ],
    quickActions: [
      { label: 'See Clients', icon: 'people', route: '/(doula)/clients', colorKey: 'primary' },
      { label: 'Appointments', icon: 'calendar-outline', route: '/(doula)/appointments', colorKey: 'accent' },
    ],
    tipTitle: 'Doula Tip',
    tipText: 'Go to Clients to manage contracts, invoices, notes and appointments for each client. The client-first workflow keeps everything organized.',
  },
  
  clientDetailTabs: [
    { key: 'timeline', label: 'Timeline', icon: 'time' },
    { key: 'appointments', label: 'Appointments', icon: 'calendar' },
    { key: 'notes', label: 'Notes', icon: 'document-text' },
    { key: 'messages', label: 'Messages', icon: 'chatbubbles' },
    { key: 'contracts', label: 'Contracts', icon: 'document' },
    { key: 'invoices', label: 'Invoices', icon: 'cash' },
    { key: 'birth', label: 'Birth Info', icon: 'heart' },
  ],
  
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
  
  features: {
    showVisits: true,
    showClinicalData: true,
    showBirthSummaries: true,
  },
  
  endpoints: {
    dashboard: API_ENDPOINTS.MIDWIFE_DASHBOARD,
    profile: API_ENDPOINTS.MIDWIFE_PROFILE,
    clients: API_ENDPOINTS.MIDWIFE_CLIENTS,
    invoices: API_ENDPOINTS.MIDWIFE_INVOICES,
    contracts: API_ENDPOINTS.MIDWIFE_CONTRACTS,
    notes: '/midwife/notes',
    appointments: '/appointments',
    visits: '/midwife/visits',
    // Unified endpoints
    unifiedClients: '/provider/clients',
    unifiedAppointments: '/provider/appointments',
    unifiedNotes: '/provider/notes',
    unifiedVisits: '/provider/visits',
    unifiedDashboard: '/provider/dashboard',
  },
  
  routes: {
    dashboard: '/(midwife)/dashboard',
    profile: '/(midwife)/profile',
    clients: '/(midwife)/clients',
    clientDetail: '/(midwife)/client-detail',
    invoices: '/(midwife)/invoices',
    contracts: '/(midwife)/contracts',
    messages: '/(midwife)/messages',
    notes: '/(midwife)/notes',
    appointments: '/(midwife)/appointments',
    visits: '/(midwife)/visits',
  },
  
  dashboard: {
    title: 'Midwife Dashboard',
    statsCards: [
      { key: 'prenatal_clients', label: 'Prenatal Clients', colorKey: 'primary' },
      { key: 'upcoming_appointments', label: 'Upcoming Appts', colorKey: 'warning' },
      { key: 'visits_this_month', label: 'Visits This Month', colorKey: 'accent' },
      { key: 'births_this_month', label: 'Births This Month', colorKey: 'success' },
    ],
    quickActions: [
      { label: 'Add Client', icon: 'person-add', route: '/(midwife)/clients', colorKey: 'primary' },
      { label: 'Add Visit', icon: 'create', route: '/(midwife)/visits', colorKey: 'accent' },
      { label: 'Birth Summary', icon: 'document-text', route: '/(midwife)/birth-summaries', colorKey: 'success' },
      { label: 'Appointments', icon: 'calendar-number', route: '/(midwife)/appointments', colorKey: 'warning' },
    ],
    tipTitle: 'Midwifery Tools',
    tipText: 'This is a simplified client management system for home and birth center midwives. Track prenatal visits, birth summaries, and postpartum care.',
  },
  
  clientDetailTabs: [
    { key: 'timeline', label: 'Timeline', icon: 'time' },
    { key: 'appointments', label: 'Appointments', icon: 'calendar' },
    { key: 'visits', label: 'Visits', icon: 'fitness' },
    { key: 'notes', label: 'Notes', icon: 'document-text' },
    { key: 'messages', label: 'Messages', icon: 'chatbubbles' },
    { key: 'contracts', label: 'Contracts', icon: 'document' },
    { key: 'invoices', label: 'Invoices', icon: 'cash' },
    { key: 'birth', label: 'Birth Info', icon: 'heart' },
  ],
  
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
