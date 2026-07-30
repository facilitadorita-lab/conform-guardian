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

export interface CommercialAddOnsAdmin {
  preco_usuario_extra_centavos: number;
  preco_unidade_extra_centavos: number;
  stripe_usuario_extra_monthly_price_id?: string | null;
  stripe_usuario_extra_yearly_price_id?: string | null;
  stripe_unidade_extra_monthly_price_id?: string | null;
  stripe_unidade_extra_yearly_price_id?: string | null;
}

export interface PublicPartnerCatalogItem {
  id: UUID;
  codigo: PartnerPlanCode | string;
  nome: string;
  descricao: string | null;
  valor_mensal_centavos: number;
  valor_anual_centavos: number | null;
  moeda: string;
  limite_clientes: number;
  preco_cliente_extra_centavos: number;
  recursos: Record<string, boolean>;
}

export type PartnerPlanCode = "parceiro_start" | "parceiro_pro" | "parceiro_enterprise";

export interface PartnerPlanCatalogItem {
  id: UUID;
  codigo: PartnerPlanCode | string;
  nome: string;
  descricao?: string | null;
  valor_mensal_centavos: number;
  valor_anual_centavos?: number | null;
  limite_clientes: number;
  preco_cliente_extra_centavos: number;
  limite_usuarios: number;
  limite_unidades?: number | null;
  recursos: Record<string, boolean>;
  stripe_product_id?: string | null;
  stripe_monthly_price_id?: string | null;
  stripe_yearly_price_id?: string | null;
  stripe_client_extra_monthly_price_id?: string | null;
  stripe_client_extra_yearly_price_id?: string | null;
}

export interface PartnerClient {
  id: UUID;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email_principal?: string | null;
  status: "ativa" | "bloqueada" | "cancelada";
  access_status?: string | null;
  segmento?: string | null;
  tipo_estabelecimento?: string | null;
  plano?: { id: UUID; nome: string; codigo: string } | null;
  unidades?: {
    utilizadas: number;
    ativas: number;
    arquivadas: number;
    limite: number;
    em_excesso: boolean;
  };
  relacionamento: {
    id: UUID;
    status: "ativo" | "suspenso" | "encerrado";
    inicio_em: string;
    encerrado_em?: string | null;
  };
  isencao?: PartnerGiftExemption | null;
}

export interface PartnerUnitPlanCatalogItem {
  id: UUID;
  codigo: string;
  nome: string;
  descricao?: string | null;
  valor_mensal_centavos: number;
  valor_anual_centavos?: number | null;
  moeda: string;
  stripe_monthly_price_id?: string | null;
  stripe_yearly_price_id?: string | null;
  recursos: Record<string, boolean>;
}

export interface PartnerGiftExemption {
  id: UUID;
  inicio_em: string;
  termina_em: string;
  meses: number;
  status: "ativa" | "expirada" | "revogada";
  motivo: string;
}

export interface PartnerGiftBenefit {
  id: UUID;
  quantidade_total: number;
  quantidade_utilizada: number;
  quantidade_disponivel: number;
  meses_por_bonus: number;
  validade_ate?: string | null;
  status: "ativo" | "encerrado" | "revogado";
  motivo: string;
  observacoes?: string | null;
  created_at?: string;
}

export interface PartnerSummary {
  parceiro_empresa_id: UUID;
  modo_cobranca?: "plano_carteira" | "unitario";
  plano: PartnerPlanCatalogItem | null;
  assinatura: Record<string, unknown> | null;
  clientes_ativos: number;
  clientes_faturaveis?: number;
  clientes_isentos?: number;
  clientes_incluidos: number;
  clientes_extras: number;
}

export interface PartnerClientPayload {
  parceiro_empresa_id: UUID;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  tipo_estabelecimento?: string;
  segmento?: string;
  email_principal?: string;
  plano_servico_codigo: "essencial" | "profissional" | "rede";
  usar_bonus_isencao?: boolean;
}

export interface PrepareSignupInput {
  planCode: string;
  billingInterval: BillingInterval;
  addOns?: {
    users: number;
    units: number;
  };
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
    add_ons?: {
      users: number;
      units: number;
      value_cents: number;
    };
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

export interface MasterStripeHealth {
  status: "healthy" | "degraded" | "critical" | "unknown";
  total_24h: number;
  failed_24h: number;
  pending_total: number;
  success_rate_24h: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  checked_at: string;
}

export interface ProductionReadinessCheck {
  codigo: string;
  titulo: string;
  status: "passed" | "attention" | "blocked";
  resumo: string;
  failed_checks?: number;
  threshold?: number;
  max_age_days?: number;
}

export interface MasterProductionReadiness {
  status: "ready" | "attention" | "blocked";
  blocked_count: number;
  attention_count: number;
  checks: ProductionReadinessCheck[];
  checked_at: string;
  configuration: {
    monthly_cost_alert_cents: number;
    backup_max_age_days: number;
    webhook_failure_threshold_24h: number;
    client_error_threshold_24h: number;
    attachment_pending_max_hours: number;
  };
}

export interface MfaPolicyStatus {
  required: boolean;
  current_level: "aal1" | "aal2";
  satisfied: boolean;
  needs_enrollment: boolean;
}

export interface MasterSandbox {
  id: UUID;
  empresa_id: UUID;
  nome: string;
  status: "active" | "archived";
  created_at: string;
  archived_at?: string | null;
  empresa?: {
    nome_fantasia: string;
    cnpj: string;
  };
}
