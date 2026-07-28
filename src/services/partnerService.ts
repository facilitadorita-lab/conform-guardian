import { requireSupabase } from "./_supabase";
import { invokeRpc } from "./service-utils";
import type {
  PartnerClient,
  PartnerClientPayload,
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
    return invokeRpc<{ cliente: PartnerClient; plano_servico: unknown }>(
      "api_partner_vincular_cliente",
      { p_payload: payload },
    );
  },

  async sincronizarCobranca(parceiroEmpresaId: string) {
    const { data, error } = await requireSupabase().functions.invoke("sync-partner-billing", {
      body: { parceiro_empresa_id: parceiroEmpresaId },
    });
    if (error) throw error;
    return data as {
      ok: boolean;
      clientes_ativos: number;
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
