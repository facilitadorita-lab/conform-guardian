import { requireSupabase } from "./_supabase";
import { invokeRpc } from "./service-utils";
import type {
  PartnerClient,
  PartnerClientPayload,
  PartnerGiftBenefit,
  PartnerPlanCatalogItem,
  PartnerSummary,
} from "@/types";

export const partnerService = {
  listarPlanos(): Promise<PartnerPlanCatalogItem[]> {
    return invokeRpc<PartnerPlanCatalogItem[]>("api_partner_listar_planos");
  },

  listarClientes(parceiroEmpresaId: string): Promise<PartnerClient[]> {
    return invokeRpc<PartnerClient[]>("api_partner_listar_clientes", {
      p_parceiro_empresa_id: parceiroEmpresaId,
    });
  },

  resumo(parceiroEmpresaId: string): Promise<PartnerSummary> {
    return invokeRpc<PartnerSummary>("api_partner_resumo", {
      p_parceiro_empresa_id: parceiroEmpresaId,
    });
  },

  vincularCliente(payload: PartnerClientPayload) {
    return invokeRpc<{
      cliente: PartnerClient;
      plano_servico: unknown;
      bonus_consumido?: boolean;
      isencao?: { id: string; inicio_em: string; termina_em: string; meses: number; status: string } | null;
    }>(
      "api_partner_vincular_cliente",
      { p_payload: payload },
    );
  },

  listarBeneficios(parceiroEmpresaId: string): Promise<PartnerGiftBenefit[]> {
    return invokeRpc<PartnerGiftBenefit[]>("api_partner_listar_beneficios", {
      p_parceiro_empresa_id: parceiroEmpresaId,
    });
  },

  concederIsencao(payload: {
    parceiro_empresa_id: string;
    cliente_empresa_id: string;
    meses: number;
    motivo?: string;
    observacoes?: string;
  }) {
    return invokeRpc<{
      id: string;
      parceiro_empresa_id: string;
      cliente_empresa_id: string;
      inicio_em: string;
      termina_em: string;
      meses: number;
      status: "ativa";
      motivo: string;
    }>("api_partner_conceder_isencao", { p_payload: payload });
  },

  concederBonus(payload: {
    parceiro_empresa_id: string;
    quantidade: number;
    meses_por_bonus: number;
    validade_ate?: string | null;
    motivo?: string;
    observacoes?: string;
  }) {
    return invokeRpc<PartnerGiftBenefit>("api_master_conceder_bonus_isencao", {
      p_payload: payload,
    });
  },

  revogarIsencao(isencaoId: string, motivo?: string) {
    return invokeRpc<{ id: string; status: "revogada" }>("api_partner_revogar_isencao", {
      p_isencao_id: isencaoId,
      p_motivo: motivo ?? null,
    });
  },

  async sincronizarCobranca(parceiroEmpresaId: string) {
    const { data, error } = await requireSupabase().functions.invoke("sync-partner-billing", {
      body: { parceiro_empresa_id: parceiroEmpresaId },
    });
    if (error) throw error;
    return data as {
      ok: boolean;
      clientes_ativos: number;
      clientes_faturaveis?: number;
      clientes_isentos?: number;
      clientes_incluidos: number;
      clientes_extras: number;
    };
  },

  async criarCheckout(
    parceiroEmpresaId: string,
    billingInterval: "monthly" | "yearly" = "monthly",
  ) {
    const { data, error } = await requireSupabase().functions.invoke("create-partner-checkout", {
      body: { parceiro_empresa_id: parceiroEmpresaId, billing_interval: billingInterval },
    });
    if (error) throw error;
    return data as { checkout_url: string; checkout_session_id: string; status: string };
  },
};
