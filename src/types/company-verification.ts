import type { ISODateTime, UUID } from "./domain";

export type CompanyVerificationStatus =
  | "email_confirmation_pending"
  | "pending_review"
  | "additional_information_required"
  | "verified"
  | "rejected"
  | "reverification_required";

export type CompanyAccessStatus = "provisional" | "active" | "restricted" | "blocked" | "suspended";

export type SubscriptionStatusNormalized =
  "trialing" | "payment_pending" | "active" | "past_due" | "canceled" | "expired";

export type CompanyRole =
  | "administrador_provisorio"
  | "administrador"
  | "responsavel_tecnico"
  | "colaborador"
  | "somente_leitura"
  | "master";

export type VerificationRiskLevel = "normal" | "atencao" | "alto" | "critico";

export interface CompanyUsageLimits {
  max_users: number | null;
  max_units: number | null;
  max_documents: number | null;
  max_equipment: number | null;
  max_pending_tasks: number | null;
  max_storage_mb: number | null;
  max_reports: number | null;
  allow_exports: boolean;
  allow_integrations: boolean;
  allow_bulk_import: boolean;
  usage: {
    users: number;
    units: number;
    documents: number;
    equipment: number;
    pending_tasks: number;
    storage_bytes: number;
  };
}

export interface EffectiveCompanyPermissions {
  empresa_id: UUID;
  verification_status: CompanyVerificationStatus;
  access_status: CompanyAccessStatus;
  subscription_status: SubscriptionStatusNormalized;
  role: CompanyRole;
  can_open_operational_modules: boolean;
  can_write: boolean;
  can_admin_company: boolean;
  reason_code:
    | "COMPANY_ACCESS_BLOCKED"
    | "COMPANY_ACCESS_SUSPENDED"
    | "COMPANY_ACCESS_RESTRICTED"
    | "EMAIL_CONFIRMATION_REQUIRED"
    | "SUBSCRIPTION_PAST_DUE"
    | "SUBSCRIPTION_REQUIRED"
    | null;
  limits: CompanyUsageLimits;
  features: Record<string, boolean>;
}

export interface CompanyVerificationRequest {
  id: UUID;
  empresa_id: UUID;
  solicitante_usuario_id: UUID;
  solicitante_nome: string;
  solicitante_cargo: string;
  solicitante_departamento?: string | null;
  solicitante_email: string;
  solicitante_telefone?: string | null;
  solicitante_relacao: string;
  declaracao_autorizacao_aceita: boolean;
  declaracao_autorizacao_aceita_at?: ISODateTime | null;
  status: CompanyVerificationStatus;
  nivel_risco: VerificationRiskLevel;
  analista_responsavel_id?: UUID | null;
  submitted_at?: ISODateTime | null;
  reviewed_at?: ISODateTime | null;
  reviewed_by?: UUID | null;
  review_notes?: string | null;
  rejection_reason?: string | null;
  rejection_category?: string | null;
  additional_information_message?: string | null;
  additional_information_items: unknown[];
  additional_information_due_at?: ISODateTime | null;
  resubmitted_at?: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CompanyVerificationEvent {
  id: UUID;
  empresa_id: UUID;
  solicitacao_verificacao_id?: UUID | null;
  event_type: string;
  previous_status?: string | null;
  new_status?: string | null;
  performed_by?: UUID | null;
  performed_by_type: "user" | "master" | "system" | "provider";
  message?: string | null;
  metadata_json: Record<string, unknown>;
  created_at: ISODateTime;
}

export interface CompanyVerificationEvidence {
  id: UUID;
  empresa_id: UUID;
  solicitacao_verificacao_id: UUID;
  evidence_type: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_by: UUID;
  uploaded_at: ISODateTime;
  review_status: "pending" | "accepted" | "rejected" | "replaced";
  reviewed_by?: UUID | null;
  reviewed_at?: ISODateTime | null;
  review_notes?: string | null;
}

export interface CompanyVerificationStatusView {
  empresa: {
    id: UUID;
    nome: string;
    cnpj_mascarado: string;
    situacao_cadastral?: string | null;
    verification_status: CompanyVerificationStatus;
    access_status: CompanyAccessStatus;
    subscription_status: SubscriptionStatusNormalized;
    provisional_started_at?: ISODateTime | null;
    provisional_expires_at?: ISODateTime | null;
  };
  solicitacao: CompanyVerificationRequest | null;
  evidencias: CompanyVerificationEvidence[];
  eventos: CompanyVerificationEvent[];
  acesso_efetivo: EffectiveCompanyPermissions;
}

export interface AdminVerificationQueueItem {
  id: UUID;
  empresa_id: UUID;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  segmento?: string | null;
  status_cadastral?: string | null;
  solicitante_nome: string;
  solicitante_email: string;
  solicitante_cargo: string;
  status: CompanyVerificationStatus;
  nivel_risco: VerificationRiskLevel;
  submitted_at?: ISODateTime | null;
  created_at: ISODateTime;
  analista_responsavel_id?: UUID | null;
  analista_nome?: string | null;
}

export interface AdminVerificationQueue {
  indicators: {
    pending_review: number;
    additional_information_required: number;
    verified: number;
    rejected: number;
    average_review_hours: number | null;
  };
  items: AdminVerificationQueueItem[];
  total: number;
  limit: number;
  offset: number;
}
