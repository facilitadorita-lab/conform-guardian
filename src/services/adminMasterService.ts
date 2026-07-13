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

  criarEmpresa(payload: CriarEmpresaPayload) {
    return invokeRpc<CriarEmpresaResult>("api_master_criar_empresa", {
      p_payload: payload,
    });
  },
};
