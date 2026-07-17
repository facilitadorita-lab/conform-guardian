import type { UUID } from "./domain";

export type BillingInterval = "monthly" | "yearly";

export interface PublicPlanCatalogItem {
  id: UUID;
  codigo: string;
  nome: string;
  descricao: string | null;
  publico_recomendado: string | null;
  valor_mensal_centavos: number;
  valor_anual_centavos: number | null;
  moeda: string;
  limites: {
    usuarios: number | null;
    unidades: number | null;
    documentos: number | null;
    equipamentos: number | null;
    storage_mb: number | null;
  };
  recursos: Record<string, boolean>;
  nivel_suporte: "padrao" | "prioritario" | "dedicado";
  mais_escolhido: boolean;
}

export interface PublicCommercialCatalog {
  plans: PublicPlanCatalogItem[];
  add_ons: {
    usuario_extra_centavos: number | null;
    unidade_extra_centavos: number | null;
    moeda: string;
  };
  legal: {
    terms_version: string | null;
    privacy_version: string | null;
  };
}

export interface PrepareSignupInput {
  planCode: string;
  billingInterval: BillingInterval;
  responsible: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    department?: string;
    relationship:
      | "socio"
      | "administrador"
      | "responsavel_tecnico"
      | "diretor"
      | "gerente"
      | "colaborador_autorizado"
      | "consultor"
      | "outro";
  };
  company: {
    cnpj: string;
    tradeName?: string;
    establishmentType?: string;
    segment?: string;
  };
  terms: {
    accepted: true;
    termsVersion: string;
    privacyVersion: string;
  };
  turnstileToken?: string;
}

export interface PreparedSignup {
  session_id: string;
  session_token: string;
  expires_at: string;
  status: "pre_analisada";
  pre_analysis: {
    approved: boolean;
    risk_level: string;
    reasons: string[];
    provider: string;
    cache_hit: boolean;
    checked_at: string;
    company_exists: boolean;
    registration_active: boolean;
  };
  plan: {
    code: string;
    name: string;
    billing_interval: BillingInterval;
    price_cents: number;
    currency: string;
    limits: PublicPlanCatalogItem["limites"];
    features: Record<string, boolean>;
  };
  company: {
    cnpj: string;
    legal_name: string;
    trade_name: string | null;
    registration_status: string | null;
  };
}

export interface CheckoutStatus {
  status:
    | "pre_analisada"
    | "checkout_pendente"
    | "pagamento_confirmado"
    | "email_pendente"
    | "provisionada"
    | "expirada"
    | "cancelada"
    | "recusada";
  email_masked: string;
  payment_confirmed: boolean;
  email_verified: boolean;
  can_send_otp: boolean;
  ready: boolean;
  expires_at: string;
}

export interface MasterSystemHealth {
  components: Array<{
    componente: string;
    status: "healthy" | "degraded" | "down" | "unknown";
    latencia_ms: number | null;
    detalhes_json: Record<string, unknown>;
    checked_at: string;
  }>;
  open_alerts: Array<{
    id: string;
    severidade: "info" | "warning" | "critical";
    componente: string;
    titulo: string;
    mensagem: string;
    ultima_ocorrencia_at: string;
  }>;
  webhook_failures_24h: number;
  client_errors_24h: number;
  notification_failures_24h: number;
  scheduled_report_failures_24h: number;
  data_quality_critical: number;
  pending_dunning: number;
  last_restore_test: {
    status: string;
    completed_at: string | null;
    rpo_minutes: number | null;
    rto_minutes: number | null;
  } | null;
  last_deployment: {
    ambiente: string;
    versao: string;
    commit_sha?: string | null;
    status: string;
    iniciado_at: string;
    concluido_at?: string | null;
  } | null;
}
