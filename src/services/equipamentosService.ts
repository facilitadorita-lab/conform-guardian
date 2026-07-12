import { runtimeConfig } from "@/lib/runtime-config";
import { equipamentosMock } from "@/mocks";
import type { Equipamento, EquipamentoResumo, StatusConformidade } from "@/types";
import { cloneMock, extractRpcItems, invokeRpc, type PaginatedRpcResponse } from "./service-utils";

export interface ListarEquipamentosParams {
  busca?: string;
  status?: string;
  limite?: number;
  offset?: number;
}

export const equipamentosService = {
  async listar(
    empresaId: string,
    params: ListarEquipamentosParams = {},
  ): Promise<EquipamentoResumo[]> {
    if (runtimeConfig.useMocks) {
      const busca = params.busca?.trim().toLocaleLowerCase("pt-BR");

      return cloneMock(
        equipamentosMock.filter((equipamento) => {
          const correspondeBusca =
            !busca ||
            [equipamento.nome, equipamento.codigo, equipamento.fabricante, equipamento.modelo]
              .join(" ")
              .toLocaleLowerCase("pt-BR")
              .includes(busca);

          return correspondeBusca && (!params.status || equipamento.status === params.status);
        }),
      );
    }

    const data = await invokeRpc<PaginatedRpcResponse<ApiEquipamento> | ApiEquipamento[]>(
      "api_listar_equipamentos",
      {
        p_empresa_id: empresaId,
        p_busca: params.busca || null,
        p_status: params.status || null,
        p_limite: params.limite ?? 25,
        p_offset: params.offset ?? 0,
      },
    );

    return extractRpcItems(data).map(normalizeEquipamento);
  },

  async obterDetalhe(empresaId: string, equipamentoId: string): Promise<EquipamentoResumo | null> {
    if (runtimeConfig.useMocks) {
      return cloneMock(
        equipamentosMock.find((equipamento) => equipamento.id === equipamentoId) ?? null,
      );
    }

    const data = await invokeRpc<ApiEquipamento>("api_equipamento_detalhe", {
      p_empresa_id: empresaId,
      p_equipamento_id: equipamentoId,
    });

    return data ? normalizeEquipamento(data) : null;
  },

  criar(empresaId: string, payload: Partial<Equipamento>) {
    return invokeRpc<Equipamento>("api_criar_equipamento", {
      p_empresa_id: empresaId,
      p_payload: payload,
    });
  },

  atualizar(empresaId: string, id: string, payload: Partial<Equipamento>) {
    return invokeRpc<Equipamento>("api_atualizar_equipamento", {
      p_empresa_id: empresaId,
      p_id: id,
      p_payload: payload,
    });
  },
};

type ApiEquipamento = Partial<EquipamentoResumo> & {
  codigo_interno?: string | null;
  tipo_nome?: string | null;
  tipo_equipamento_nome?: string | null;
  status_consolidado?: string | null;
  proximo_vencimento?: string | null;
  proxima_calibracao?: string | null;
  proxima_qualificacao?: string | null;
  proxima_manutencao?: string | null;
};

function normalizeEquipamento(equipamento: ApiEquipamento): EquipamentoResumo {
  return {
    id: equipamento.id ?? crypto.randomUUID(),
    nome: equipamento.nome ?? "Equipamento sem nome",
    codigo: equipamento.codigo ?? equipamento.codigo_interno ?? "-",
    tipo:
      equipamento.tipo ??
      equipamento.tipo_nome ??
      equipamento.tipo_equipamento_nome ??
      "Equipamento",
    fabricante: equipamento.fabricante ?? "-",
    modelo: equipamento.modelo ?? "-",
    setor: equipamento.setor ?? "-",
    criticidade: normalizeCriticidade(equipamento.criticidade),
    status: normalizeStatus(equipamento.status ?? equipamento.status_consolidado),
    proximoVenc:
      equipamento.proximoVenc ??
      equipamento.proximo_vencimento ??
      equipamento.proxima_calibracao ??
      equipamento.proxima_qualificacao ??
      equipamento.proxima_manutencao ??
      "-",
  };
}

function normalizeCriticidade(criticidade: unknown): EquipamentoResumo["criticidade"] {
  const value = String(criticidade ?? "").toLowerCase();

  if (value === "critica" || value === "crítica") return "Critica";
  if (value === "alta") return "Alta";
  if (value === "media" || value === "média") return "Media";
  return "Baixa";
}

function normalizeStatus(status: unknown): StatusConformidade {
  const value = String(status ?? "").toLowerCase();

  if (value === "ok" || value === "em_dia" || value === "ativo") return "ok";
  if (value === "atencao" || value === "a_vencer" || value === "pendente_evidencia")
    return "atencao";
  if (value === "critico" || value === "vence_hoje" || value === "reprovado") return "critico";
  if (value === "vencido") return "vencido";
  if (value === "sem_validade") return "sem_validade";

  return "ok";
}
