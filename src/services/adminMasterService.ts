import type {
  AssinaturaEmpresaResumo,
  FinanceiroResumoMaster,
  PlanoComercialResumo,
  MasterSystemHealth,
  CommercialHistoryEntry,
  CommercialAddOnsAdmin,
  MasterSandbox,
  MasterStripeHealth,
  MasterProductionReadiness,
} from "@/types";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { invokeRpc } from "./service-utils";

export interface CriarEmpresaPayload {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  tipo_estabelecimento?: string;
  segmento?: string;
  cidade?: string;
  estado?: string;
  email_principal?: string;
  responsavel_legal?: string;
  responsavel_tecnico?: string;
  plano_id?: string;
  observacoes?: string;
}

export interface CriarEmpresaResult {
  empresa: {
    id: string;
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    tipo_estabelecimento?: string | null;
    segmento?: string | null;
    status: string;
  };
  provisionamento_documentos: {
    empresa_id: string;
    tipo_estabelecimento?: string | null;
    segmento?: string | null;
    chaves: string[];
    documentos_criados: number;
    documentos_existentes: number;
  };
}

export const adminMasterService = {
  listarEnsaiosBackup() {
    return invokeRpc<
      Array<{
        id: string;
        ambiente: string;
        backup_reference: string;
        evidence_reference: string | null;
        status: string;
        notes: string | null;
        rpo_minutes: number | null;
        rto_minutes: number | null;
        completed_at: string | null;
        created_at: string;
      }>
    >("api_master_listar_ensaios_backup", { p_limite: 20 });
  },
  registrarEnsaioBackup(payload: Record<string, unknown>) {
    return invokeRpc("api_master_registrar_ensaio_backup", { p_payload: payload });
  },
  testarIsolamento(companyId?: string | null) {
    return invokeRpc<{
      id: string;
      status: "passed" | "failed" | "warning";
      total_checks: number;
      failed_checks: number;
      checks: Array<Record<string, unknown>>;
      executed_at: string;
    }>("api_master_testar_isolamento", { p_empresa_id: companyId ?? null });
  },
  apiSecuritySnapshot() {
    return invokeRpc<{
      rls_tables: number;
      security_definer_functions: number;
      public_execute_functions: number;
      generated_at: string;
    }>("api_master_api_security_snapshot");
  },
  filaCobranca() {
    return invokeRpc<
      Array<{
        id: string;
        empresa_id: string;
        nome_fantasia: string;
        email_principal: string | null;
        status: string;
        tentativa: number;
        valor_centavos: number | null;
        erro_codigo: string | null;
        proxima_tentativa_at: string | null;
        created_at: string;
      }>
    >("api_master_fila_cobranca", { p_limite: 50 });
  },
  enfileirarCobranca(tentativaId: string) {
    return invokeRpc("api_master_enfileirar_cobranca", { p_tentativa_id: tentativaId });
  },
  consumoEmpresas() {
    return invokeRpc<
      Array<{
        empresa_id: string;
        nome_fantasia: string | null;
        documentos: number | null;
        equipamentos: number | null;
        storage_bytes: number | null;
        limite_documentos: number | null;
        limite_equipamentos: number | null;
        limite_storage_mb: number | null;
        segmento: string | null;
        tipo_estabelecimento: string | null;
      }>
    >("api_master_consumo_empresas");
  },
  async financeiroResumo(): Promise<FinanceiroResumoMaster> {
    return invokeRpc<FinanceiroResumoMaster>("api_master_financeiro_resumo");
  },

  async listarAssinaturas(): Promise<AssinaturaEmpresaResumo[]> {
    return invokeRpc<AssinaturaEmpresaResumo[]>("api_master_listar_assinaturas");
  },

  async listarPlanos(): Promise<PlanoComercialResumo[]> {
    return invokeRpc<PlanoComercialResumo[]>("api_master_listar_planos");
  },

  saudeSistema(): Promise<MasterSystemHealth> {
    return invokeRpc<MasterSystemHealth>("api_master_saude_sistema");
  },

  stripeHealth(): Promise<MasterStripeHealth> {
    return invokeRpc<MasterStripeHealth>("api_master_stripe_health");
  },

  productionReadiness(): Promise<MasterProductionReadiness> {
    return invokeRpc<MasterProductionReadiness>("api_master_production_readiness");
  },

  listarConfiguracoesPlataforma(): Promise<
    Record<
      string,
      {
        valor: number;
        descricao: string;
        updated_at: string;
      }
    >
  > {
    return invokeRpc("api_master_listar_configuracoes_plataforma");
  },

  salvarConfiguracoesPlataforma(payload: Record<string, number>) {
    return invokeRpc("api_master_salvar_configuracoes_plataforma", { p_payload: payload });
  },

  listarSandbox(): Promise<MasterSandbox[]> {
    return invokeRpc<MasterSandbox[]>("api_master_listar_sandbox");
  },

  criarSandbox(nome: string): Promise<MasterSandbox> {
    return invokeRpc<MasterSandbox>("api_master_criar_sandbox", { p_nome: nome });
  },

  arquivarSandbox(id: string) {
    return invokeRpc<{ ok: boolean; id: string; status: "archived" }>(
      "api_master_arquivar_sandbox",
      { p_sandbox_id: id },
    );
  },

  async historicoComercial(): Promise<CommercialHistoryEntry[]> {
    const { data, error } = await getSupabaseClient()
      .from("historico_comercial_imutavel")
      .select(
        "id, empresa_id, entidade, entidade_id, evento, valor_anterior, valor_novo, origem, actor_user_id, actor_role, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data as CommercialHistoryEntry[];
  },

  async salvarPlano(planoId: string | null, payload: Partial<PlanoComercialResumo>) {
    return invokeRpc<PlanoComercialResumo>("api_master_salvar_plano", {
      p_plano_id: planoId,
      p_payload: payload,
    });
  },

  async salvarPlanoParceiro(planoId: string, payload: Partial<PlanoComercialResumo>) {
    return invokeRpc<PlanoComercialResumo>("api_master_salvar_partner_plan", {
      p_plano_id: planoId,
      p_payload: payload,
    });
  },

  listarAddons(): Promise<CommercialAddOnsAdmin> {
    return invokeRpc<CommercialAddOnsAdmin>("api_master_listar_addons");
  },

  salvarAddons(payload: Partial<CommercialAddOnsAdmin>) {
    return invokeRpc<CommercialAddOnsAdmin>("api_master_configurar_addons", {
      p_payload: payload,
    });
  },

  atualizarAssinatura(empresaId: string, payload: Record<string, unknown>) {
    return invokeRpc<AssinaturaEmpresaResumo>("api_master_atualizar_assinatura", {
      p_empresa_id: empresaId,
      p_payload: payload,
    });
  },

  criarEmpresa(payload: CriarEmpresaPayload) {
    return invokeRpc<CriarEmpresaResult>("api_master_criar_empresa", {
      p_payload: payload,
    });
  },

  criarParceiro(payload: {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    email_principal?: string;
    plano_codigo?: "parceiro_start" | "parceiro_pro" | "parceiro_enterprise" | null;
    modo_cobranca?: "plano_carteira" | "unitario";
  }) {
    return invokeRpc<{ empresa: Record<string, unknown>; plano: Record<string, unknown> }>(
      "api_master_criar_parceiro",
      { p_payload: payload },
    );
  },

  configurarGatewayParceiro(payload: {
    plano_id: string;
    stripe_product_id?: string | null;
    stripe_monthly_price_id?: string | null;
    stripe_yearly_price_id?: string | null;
    stripe_client_extra_monthly_price_id?: string | null;
    stripe_client_extra_yearly_price_id?: string | null;
  }) {
    return invokeRpc("api_master_configurar_partner_gateway", {
      p_plano_id: payload.plano_id,
      p_stripe_product_id: payload.stripe_product_id ?? null,
      p_stripe_monthly_price_id: payload.stripe_monthly_price_id ?? null,
      p_stripe_yearly_price_id: payload.stripe_yearly_price_id ?? null,
      p_stripe_client_extra_monthly_price_id: payload.stripe_client_extra_monthly_price_id ?? null,
      p_stripe_client_extra_yearly_price_id: payload.stripe_client_extra_yearly_price_id ?? null,
    });
  },
};
