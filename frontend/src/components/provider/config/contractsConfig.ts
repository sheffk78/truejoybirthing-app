// Contract configuration for Doula and Midwife roles
// Contains form sections, default values, and role-specific fields

import { COLORS } from '../../../constants/theme';

export interface ContractField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date';
  required?: boolean;
  placeholder?: string;
}

export interface ContractSection {
  id: string;
  title: string;
  icon: string;
  fields: ContractField[];
}

export interface ContractsConfig {
  role: 'DOULA' | 'MIDWIFE';
  roleLabel: string;
  primaryColor: string;
  sections: ContractSection[];
  defaultValues: Record<string, any>;
  endpoints: {
    list: string;
    create: string;
    update: (id: string) => string;
    delete: (id: string) => string;
    send: (id: string) => string;
    duplicate: (id: string) => string;
    pdf: (id: string, backendUrl: string) => string;
    defaults: string;
  };
  clientsEndpoint: string;
}

// ============ DOULA CONTRACT CONFIG ============
export const DOULA_CONTRACT_SECTIONS: ContractSection[] = [
  {
    id: 'parties_basics',
    title: 'Parties & Basic Details',
    icon: 'person-outline',
    fields: [
      { id: 'client_name', label: 'Client Name(s)', type: 'text', required: true, placeholder: 'Full name(s) of the birthing parent and partner' },
      { id: 'estimated_due_date', label: 'Estimated Due Date', type: 'date', required: true },
      { id: 'total_fee', label: 'Total Fee ($)', type: 'number', required: true, placeholder: '0.00' },
      { id: 'retainer_amount', label: 'Retainer Amount ($)', type: 'number', required: true, placeholder: '0.00' },
    ]
  },
  {
    id: 'services_scope',
    title: 'Services & Scope',
    icon: 'clipboard-outline',
    fields: [
      { id: 'prenatal_visit_description', label: 'Prenatal Visits', type: 'textarea', placeholder: 'e.g., Three prenatal visits of 60-90 minutes each to discuss preferences, birth plan, and support' },
      { id: 'on_call_window_description', label: 'On-Call Window', type: 'text', placeholder: 'e.g., 38 to 42 weeks' },
      { id: 'on_call_response_description', label: 'Response Expectations', type: 'textarea', placeholder: 'e.g., Respond to non-urgent messages within 24 hours...' },
      { id: 'backup_doula_preferences', label: 'Backup Doula Preferences', type: 'textarea', placeholder: 'Any preferences or limits on backup doula use' },
      { id: 'postpartum_visit_description', label: 'Postpartum Support', type: 'textarea', placeholder: 'e.g., Two in-home visits within the first two weeks after birth' },
    ]
  },
  {
    id: 'boundaries_communication',
    title: 'Boundaries & Communication',
    icon: 'chatbubble-outline',
    fields: [
      { id: 'speak_for_client_exception', label: "Exception for Speaking on Client's Behalf", type: 'textarea', placeholder: 'Leave blank for standard language ("None"), or specify any agreed exceptions' },
    ]
  },
  {
    id: 'payment_refunds',
    title: 'Payment & Refunds',
    icon: 'card-outline',
    fields: [
      { id: 'retainer_non_refundable_after_weeks', label: 'Retainer Non-Refundable After (weeks)', type: 'number', placeholder: '37' },
      { id: 'cancellation_weeks_threshold', label: 'Cancellation Threshold (weeks)', type: 'number', placeholder: '37' },
      { id: 'final_payment_due_detail', label: 'Final Payment Due Detail', type: 'text', placeholder: 'e.g., Day after birth' },
      { id: 'cesarean_alternative_support_description', label: 'Cesarean Alternative Support', type: 'textarea', placeholder: 'e.g., Two postpartum sessions if Doula does not attend cesarean birth' },
    ]
  },
  {
    id: 'unavailability_circumstances',
    title: 'Unavailability & Special Circumstances',
    icon: 'alert-circle-outline',
    fields: [
      { id: 'unreachable_timeframe_description', label: 'Unreachable Timeframe', type: 'text', placeholder: 'e.g., Within two hours after notification at onset of labor' },
      { id: 'unreachable_remedy_description', label: 'Remedy if Unreachable', type: 'textarea', placeholder: 'e.g., Contract may be void and payments refunded' },
      { id: 'precipitous_labor_definition', label: 'Precipitous Labor Definition', type: 'text', placeholder: 'e.g., Less than two hours from first call' },
      { id: 'precipitous_labor_compensation_description', label: 'Rapid Birth Compensation', type: 'textarea', placeholder: 'e.g., Four extra postpartum hours at no cost' },
      { id: 'other_absence_policy', label: 'Other Absence Policy', type: 'textarea', placeholder: 'How other absences are handled' },
    ]
  },
  {
    id: 'addendum',
    title: 'Addendum / Special Arrangements',
    icon: 'document-text-outline',
    fields: [
      { id: 'special_arrangements', label: 'Special Arrangements', type: 'textarea', placeholder: 'Any additional boundaries, services, or exceptions specific to this agreement' },
    ]
  },
];

export const DOULA_CONTRACT_DEFAULTS: Record<string, any> = {
  prenatal_visit_description: 'Three prenatal visits to discuss preferences, birth plan, and support roles',
  on_call_window_description: '38 to 42 weeks',
  on_call_response_description: 'Respond to non-urgent messages within 24 hours and as promptly as possible while on call',
  backup_doula_preferences: 'A backup doula may be introduced prior to labor in case coverage is needed',
  postpartum_visit_description: 'One or two in-home visits within the first two weeks after birth',
  speak_for_client_exception: "None - the Doula will not speak on the Client's behalf to staff",
  retainer_non_refundable_after_weeks: 37,
  cancellation_weeks_threshold: 37,
  final_payment_due_detail: 'Day after birth',
  cesarean_alternative_support_description: 'Two postpartum sessions even if Doula does not attend the birth',
  unreachable_timeframe_description: 'Within two hours after notification at onset of labor',
  unreachable_remedy_description: 'The contract may be considered void and payments may be refunded',
  precipitous_labor_definition: 'Less than two hours from first call',
  precipitous_labor_compensation_description: 'Four extra postpartum hours at no cost as a gesture of goodwill',
  other_absence_policy: "Reviewed case-by-case, any refund or waiver at the Doula's discretion",
  special_arrangements: 'None at this time',
  final_payment_due_description: 'Day after birth',
};

export const DOULA_CONTRACTS_CONFIG: ContractsConfig = {
  role: 'DOULA',
  roleLabel: 'Doula',
  primaryColor: COLORS.roleDoula,
  sections: DOULA_CONTRACT_SECTIONS,
  defaultValues: DOULA_CONTRACT_DEFAULTS,
  endpoints: {
    list: '/doula-contracts',
    create: '/doula-contracts',
    update: (id) => `/doula-contracts/${id}`,
    delete: (id) => `/doula-contracts/${id}`,
    send: (id) => `/doula-contracts/${id}/send`,
    duplicate: (id) => `/doula-contracts/${id}/duplicate`,
    pdf: (id, backendUrl) => `${backendUrl}/api/doula-contracts/${id}/pdf`,
    defaults: '/doula/contract-defaults',
  },
  clientsEndpoint: '/doula-clients',
};

// ============ MIDWIFE CONTRACT CONFIG ============
export const MIDWIFE_CONTRACT_SECTIONS: ContractSection[] = [
  {
    id: 'parties_basics',
    title: 'Parties & Basic Details',
    icon: 'person-outline',
    fields: [
      { id: 'client_name', label: 'Client Name(s)', type: 'text', required: true, placeholder: 'Full name(s) of the client' },
      { id: 'partner_name', label: 'Partner/Support Person (optional)', type: 'text', placeholder: 'Name of partner or support person' },
      { id: 'estimated_due_date', label: 'Estimated Due Date', type: 'date', required: true },
    ]
  },
  {
    id: 'birth_scope',
    title: 'Place of Birth & Scope',
    icon: 'home-outline',
    fields: [
      { id: 'planned_birth_location', label: 'Planned Place of Birth', type: 'text', required: true, placeholder: 'e.g., home at [address], ABC Birth Center, XYZ Hospital' },
      { id: 'scope_description', label: 'Included Services Description', type: 'textarea', placeholder: 'Description of midwifery services included' },
    ]
  },
  {
    id: 'fees_payment',
    title: 'Fees & Payment',
    icon: 'cash-outline',
    fields: [
      { id: 'total_fee', label: 'Total Fee ($)', type: 'number', required: true, placeholder: '0.00' },
      { id: 'retainer_amount', label: 'Retainer Amount ($)', type: 'number', required: true, placeholder: '0.00' },
      { id: 'remaining_balance_due_description', label: 'Remaining Balance Due By', type: 'text', placeholder: "e.g., 36 weeks' gestation" },
      { id: 'fee_coverage_description', label: 'Fee Coverage Description', type: 'textarea', placeholder: 'What the fee includes' },
      { id: 'refund_policy_description', label: 'Refund Policy', type: 'textarea', placeholder: 'Terms for refunds if care ends early' },
    ]
  },
  {
    id: 'transfer_withdrawal',
    title: 'Transfer & Withdrawal',
    icon: 'swap-horizontal-outline',
    fields: [
      { id: 'transfer_indications_description', label: 'Transfer Indications', type: 'textarea', placeholder: 'When transfer to hospital/physician is recommended' },
      { id: 'client_refusal_of_transfer_note', label: 'Client Refusal of Transfer Note (optional)', type: 'textarea', placeholder: 'Additional language regarding client refusal of transfer' },
      { id: 'midwife_withdrawal_reasons', label: 'Midwife Withdrawal Reasons', type: 'textarea', placeholder: 'Reasons midwife may discontinue care' },
      { id: 'no_refund_scenarios_description', label: 'No-Refund Scenarios', type: 'textarea', placeholder: 'Situations where no refund is applicable' },
    ]
  },
  {
    id: 'oncall_backup',
    title: 'On-Call & Backup',
    icon: 'call-outline',
    fields: [
      { id: 'on_call_window_description', label: 'On-Call Window', type: 'text', placeholder: 'e.g., 37 to 42 weeks of pregnancy' },
      { id: 'backup_midwife_policy', label: 'Backup Midwife Policy', type: 'textarea', placeholder: 'Details on backup coverage and student involvement' },
    ]
  },
  {
    id: 'communication_emergencies',
    title: 'Communication & Emergencies',
    icon: 'alert-circle-outline',
    fields: [
      { id: 'contact_instructions_routine', label: 'Routine Contact Instructions', type: 'textarea', placeholder: 'How to reach midwife for routine questions' },
      { id: 'contact_instructions_urgent', label: 'Urgent Contact Instructions', type: 'textarea', placeholder: 'How to contact for concerning symptoms' },
      { id: 'emergency_instructions', label: 'Emergency Instructions', type: 'textarea', placeholder: 'When to call 911 or go directly to hospital' },
    ]
  },
  {
    id: 'special_arrangements',
    title: 'Special Arrangements',
    icon: 'document-text-outline',
    fields: [
      { id: 'special_arrangements', label: 'Special Arrangements / Addendum', type: 'textarea', placeholder: 'Any additional services, travel radius, student involvement, etc.' },
    ]
  },
];

export const MIDWIFE_CONTRACT_DEFAULTS: Record<string, any> = {
  partner_name: '',
  scope_description: "Care generally includes routine prenatal visits at intervals recommended by the Midwife, availability for consultation by phone or secure message for non-emergent concerns, on-call availability around the estimated time of birth, attendance at labor and birth in the planned setting when appropriate, and postpartum follow-up visits for both the Client and baby for approximately six to eight weeks after birth.",
  remaining_balance_due_description: "36 weeks' gestation",
  fee_coverage_description: 'This fee typically covers prenatal care within the practice, attendance at labor and birth in the planned setting, and routine postpartum and newborn care through about six to eight weeks postpartum, but does not include charges from hospitals, laboratories, imaging centers, pharmacies, or other specialists.',
  refund_policy_description: "When care ends before the birth, the Midwife may, at their discretion, provide a partial refund after subtracting the value of services already rendered and any non-refundable retainer.",
  transfer_indications_description: "The Midwife will recommend transfer if, in the Midwife's clinical judgment, complications develop that cannot be safely managed in the planned setting, such as non-reassuring fetal status, concerning bleeding, signs of infection, or certain blood pressure or labor patterns.",
  client_refusal_of_transfer_note: '',
  midwife_withdrawal_reasons: '',
  no_refund_scenarios_description: 'No refund is due when the Client refuses recommended transfer and the Midwife must withdraw, or when the Client chooses to give birth in another setting for personal reasons after the Midwife has provided extensive prenatal care.',
  on_call_window_description: '37 to 42 weeks of pregnancy',
  backup_midwife_policy: 'The Midwife will make reasonable efforts to introduce any regular back-up midwives or students in advance when possible.',
  contact_instructions_routine: 'The Midwife will provide clear instructions regarding how to reach the Midwife for routine questions.',
  contact_instructions_urgent: 'The Midwife will provide instructions on how to contact the Midwife urgently for concerning symptoms.',
  emergency_instructions: 'The Client understands when to bypass the Midwife and call emergency services or go directly to the hospital.',
  special_arrangements: 'None at this time',
};

export const MIDWIFE_CONTRACTS_CONFIG: ContractsConfig = {
  role: 'MIDWIFE',
  roleLabel: 'Midwife',
  primaryColor: COLORS.roleMidwife,
  sections: MIDWIFE_CONTRACT_SECTIONS,
  defaultValues: MIDWIFE_CONTRACT_DEFAULTS,
  endpoints: {
    list: '/midwife-contracts',
    create: '/midwife-contracts',
    update: (id) => `/midwife-contracts/${id}`,
    delete: (id) => `/midwife-contracts/${id}`,
    send: (id) => `/midwife-contracts/${id}/send`,
    duplicate: (id) => `/midwife-contracts/${id}/duplicate`,
    pdf: (id, backendUrl) => `${backendUrl}/api/midwife-contracts/${id}/pdf`,
    defaults: '/midwife/contract-defaults',
  },
  clientsEndpoint: '/midwife-clients',
};

// Helper to get config by role
export function getContractsConfig(role: 'DOULA' | 'MIDWIFE'): ContractsConfig {
  return role === 'DOULA' ? DOULA_CONTRACTS_CONFIG : MIDWIFE_CONTRACTS_CONFIG;
}
