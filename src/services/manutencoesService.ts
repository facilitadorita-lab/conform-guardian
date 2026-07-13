import { runtimeConfig } from "@/lib/runtime-config";
import { manutencoesMock } from "@/mocks";
import type { Manutencao, ManutencaoResumo, StatusConformidade } from "@/types";
import { cloneMock, extractRpcItems, invokeRpc, type PaginatedRpcResponse } from "./service-utils";

export interface ListarManutencoesParams {
  busca?: string;
  status?: string;
  natureza?: string;
  equipamentoId?: string | null;
  limite?: number;
  offset?: number;
}

export const manutencoesService = {
  async listar(
    empresaId: string,
    params: ListarManutencoesParams = {},
  ): Promise<ManutencaoResumo[]> {
    if (runtimeConfig.useMocks) {
      const busca = params.busca?.trim().toLocaleLowerCase("pt-BR");

      return cloneMock(
        manutencoesMock.filter((manutencao) => {
          const correspondeBusca =
            !busca ||
            [manutencao.equipamento, manutencao.tipo, manutencao.responsavel, manutencao.os]
              .join(" ")
              .toLocaleLowerCase("pt-BR")
              .includes(busca);

          return correspondeBusca && (!params.status || manutencao.status === params.status);
        }),
      );
    }

    const data = await invokeRpc<PaginatedRpcResponse<ApiManutencao> | ApiManutencao[]>(
      "api_listar_manutencoes",
      {
        p_empresa_id: empresaId,
        p_busca: params.busca || null,
        p_status: params.status || null,
        p_natureza: params.natureza || null,
        p_equipamento_id: params.equipamentoId ?? null,
        p_limite: params.limite ?? 25,
        p_offset: params.offset ?? 0,
      },
    );

    return extractRpcItems(data).map(normalizeManutencao);
  },

  criar(empresaId: string, payload: Record<string, unknown>) {
    return invokeRpc<Manutencao>("api_criar_manutencao", {
      p_empresa_id: empresaId,
      p_payload: payload,
    });
  },

  atualizar(empresaId: string, id: string, payload: Partial<Manutencao>) {
    return invokeRpc<Manutencao>("api_atualizar_manutencao", {
      p_empresa_id: empresaId,
      p_id: id,
      p_payload: payload,
    });
  },
};

type ApiManutencao = Partial<ManutencaoResumo> & {
  equipamento_id?: string | null;
  equipamento_nome?: string | null;
  item_nome?: string | null;
  nome_servico?: string | null;
  natureza?: string | null;
  tipo_servico?: string | null;
  data_manutencao?: string | null;
  proxima_manutencao?: string | null;
  tecnico_responsavel?: string | null;
  empresa_responsavel?: string | null;
  numero_ordem_servico?: string | null;
  status_calculado?: string | null;
  status_execucao?: string | null;
};

function normalizeManutencao(manutencao: ApiManutencao): ManutencaoResumo {
  return {
    id: manutencao.id ?? crypto.randomUUID(),
    equipamentoId: manutencao.equipamentoId ?? manutencao.equipamento_id ?? null,
    equipamento:
      manutencao.equipamento ??
      manutencao.equipamento_nome ??
      manutencao.item_nome ??
      manutencao.nome_servico ??
      "Serviço geral",
    natureza: manutencao.natureza ?? null,
    tipo: manutencao.tipo ?? labelManutencao(manutencao.natureza, manutencao.tipo_servico),
    data: manutencao.data ?? manutencao.proxima_manutencao ?? manutencao.data_manutencao ?? "-",
    responsavel:
      manutencao.responsavel ??
      manutencao.tecnico_responsavel ??
      manutencao.empresa_responsavel ??
      "Sem responsável",
    status: normalizeStatus(
      manutencao.status ?? manutencao.status_calculado ?? manutencao.status_execucao,
    ),
    os: manutencao.os ?? manutencao.numero_ordem_servico ?? "-",
    statusExecucao: manutencao.status_execucao ?? null,
  };
}

function labelManutencao(natureza: unknown, tipoServico: unknown): string {
  const naturezaLabel = labelFromSnakeCase(natureza, "Manutenção");
  const tipoLabel = labelFromSnakeCase(tipoServico, "");

  return tipoLabel ? `${naturezaLabel} · ${tipoLabel}` : naturezaLabel;
}

function labelFromSnakeCase(value: unknown, fallback: string): string {
  const text = String(value ?? "")
    .replaceAll("_", " ")
    .trim();
  if (!text) return fallback;

  return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);
}

function normalizeStatus(status: unknown): StatusConformidade {
  const value = String(status ?? "").toLowerCase();

  if (value === "ok" || value === "em_dia" || value === "concluida" || value === "concluída") {
    return "ok";
  }
  if (
    value === "atencao" ||
    value === "a_vencer" ||
    value === "programada" ||
    value === "pendente_evidencia"
  ) {
    return "atencao";
  }
  if (value === "critico" || value === "vence_hoje" || value === "em_andamento") return "critico";
  if (value === "vencido") return "vencido";
  if (value === "sem_validade" || value === "cancelada") return "sem_validade";

  return "ok";
}
