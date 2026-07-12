import { runtimeConfig } from "@/lib/runtime-config";
import {
  assinaturasEmpresasMock,
  financeiroResumoMasterMock,
  planosComerciaisMock,
} from "@/mocks";
import type {
  AssinaturaEmpresaResumo,
  FinanceiroResumoMaster,
  PlanoComercialResumo,
} from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export const adminMasterService = {
  async financeiroResumo(): Promise<FinanceiroResumoMaster> {
    if (runtimeConfig.useMocks) return cloneMock(financeiroResumoMasterMock);
    return invokeRpc<FinanceiroResumoMaster>("api_master_financeiro_resumo");
  },

  async listarAssinaturas(): Promise<AssinaturaEmpresaResumo[]> {
    if (runtimeConfig.useMocks) return cloneMock(assinaturasEmpresasMock);
    return invokeRpc<AssinaturaEmpresaResumo[]>("api_master_listar_assinaturas");
  },

  async listarPlanos(): Promise<PlanoComercialResumo[]> {
    if (runtimeConfig.useMocks) return cloneMock(planosComerciaisMock);
    return invokeRpc<PlanoComercialResumo[]>("api_master_listar_planos");
  },

  salvarPlano(planoId: string | null, payload: Partial<PlanoComercialResumo>) {
    return invokeRpc<PlanoComercialResumo>("api_master_salvar_plano", {
      p_plano_id: planoId,
      p_payload: payload,
    });
  },

  atualizarAssinatura(empresaId: string, payload: Record<string, unknown>) {
    return invokeRpc<AssinaturaEmpresaResumo>("api_master_atualizar_assinatura", {
      p_empresa_id: empresaId,
      p_payload: payload,
    });
  },
};
