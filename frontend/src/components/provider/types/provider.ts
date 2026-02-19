// Shared types for Provider (Doula/Midwife) components

export type ProviderRole = 'DOULA' | 'MIDWIFE';

export interface ShareRequest {
  request_id: string;
  mom_user_id: string;
  mom_name: string;
  mom_email?: string;
  mom_picture?: string;
  due_date?: string;
  status: string;
  created_at: string;
}

export interface ConnectedClient {
  client_id: string;
  linked_mom_id: string | null;
  name: string;
  email?: string;
  picture?: string;
  edd?: string;
  status: string;
  planned_birth_setting?: string;
  created_at: string;
}

export interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_role: string;
  other_user_picture: string | null;
  last_message_content: string;
  last_message_time: string;
  unread_count: number;
  is_sender: boolean;
}

export interface Message {
  message_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Invoice {
  invoice_id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  description: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status: string;
  payment_instructions?: string;
  notes_for_client?: string;
  created_at: string;
}

export interface PaymentTemplate {
  template_id: string;
  label: string;
  instructions_text: string;
  is_default: boolean;
}

export interface DashboardStats {
  total_clients?: number;
  active_clients?: number;
  prenatal_clients?: number;
  upcoming_appointments?: number;
  visits_this_month?: number;
  births_this_month?: number;
}

export interface ProviderProfile {
  user_id: string;
  practice_name?: string;
  business_name?: string;
  credentials?: string;
  zip_code?: string;
  location_city?: string;
  location_state?: string;
  years_in_practice?: number;
  bio?: string;
  profile_photo_url?: string;
  video_intro_url?: string;
  more_about_me?: string;
  accepting_new_clients?: boolean;
  in_marketplace?: boolean;
  // Doula-specific
  specialties?: string[];
  services_offered?: string[];
  // Midwife-specific
  birth_settings_served?: string[];
}
