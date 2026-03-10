export type UserRole = 'super_admin' | 'admin' | 'staff';

export type Niche =
  | 'automobile'
  | 'batiment'
  | 'beaute'
  | 'cbd'
  | 'restauration'
  | 'sante'
  | 'immobilier'
  | 'autre';

export type PipelineStatus =
  | 'scraped'
  | 'qualified'
  | 'contacted'
  | 'interested'
  | 'proposal'
  | 'signed'
  | 'lost';

export type TransactionType = 'recurring' | 'one-shot' | 'refund';

export type ProjectStatus = 'planned' | 'active' | 'paused' | 'done' | 'cancelled';

export type AcquisitionChannel = 'mail' | 'tel' | 'reel' | 'reseaux' | 'referral';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  mfa_enabled: boolean;
  last_login?: string;
  created_at: string;
}

export interface AuditResult {
  has_website: boolean;
  has_booking: boolean;
  has_quote_form: boolean;
  has_socials: boolean;
  has_chatbot: boolean;
  has_vocal_opportunity: boolean;
  has_pdf_flyer: boolean;
  has_google_rating: boolean;
  score: number;
  score_breakdown: {
    no_website: number;
    no_booking: number;
    no_quote: number;
    no_socials: number;
    no_chatbot: number;
    low_rating: number;
  };
  recommandation: string;
  services_to_pitch: string[];
  detected_gaps: string[];
}

export interface Lead {
  id: string;
  company_name: string;
  contact_name?: string;
  contact_first_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  niche: Niche;
  website_url?: string;
  social_links?: Record<string, string>;
  audit_score: number;
  audit_report?: AuditResult;
  pipeline_status: PipelineStatus;
  acquisition_channel?: AcquisitionChannel;
  attack_angle?: string;
  assigned_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Finance {
  id: string;
  amount_brut: number;
  amount_net: number;
  transaction_date: string;
  type: TransactionType;
  category?: string;
  description?: string;
  project_id?: string;
  created_at: string;
}

export interface AgencyTool {
  id: string;
  name: string;
  monthly_cost: number;
  category?: string;
  is_active: boolean;
  renewal_date?: string;
}

export interface Project {
  id: string;
  client_id: string;
  service_id: string;
  start_date: string;
  end_date_est?: string;
  status: ProjectStatus;
  notes?: string;
  total_value?: number;
}

export interface KpiData {
  totalBrut: number;
  totalNet: number;
  leadsScraped: number;
  leadsInSignature: number;
  toolsCost: number;
  chargesAmount: number;
}

