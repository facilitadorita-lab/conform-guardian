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

  async obterDetalhe(empresaId: string, equipamentoId: string): Promise<EquipamentoDetalhe | null> {
    if (runtimeConfig.useMocks) {
      const equipamento = equipamentosMock.find((item) => item.id === equipamentoId);
      return equipamento
        ? {
            ...cloneMock(equipamento),
            calibracoes: [],
            qualificacoes: [],
            manutencoes: [],
            anexos: [],
            historico: [],
          }
        : null;
    }

    const data = await invokeRpc<ApiEquipamentoDetalheResponse | ApiEquipamento>(
      "api_equipamento_detalhe",
      {
        p_empresa_id: empresaId,
        p_equipamento_id: equipamentoId,
      },
    );

    return data ? normalizeEquipamentoDetalhe(data) : null;
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

export type EquipamentoHistoricoItem = {
  id?: string;
  data?: string | null;
  descricao: string;
  tipo?: string | null;
  status?: StatusConformidade | "info";
  documentoUrl?: string | null;
};

export type EquipamentoDetalhe = EquipamentoResumo & {
  calibracoes: EquipamentoHistoricoItem[];
  qualificacoes: EquipamentoHistoricoItem[];
  manutencoes: EquipamentoHistoricoItem[];
  anexos: EquipamentoHistoricoItem[];
  historico: EquipamentoHistoricoItem[];
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

type ApiEquipamentoDetalheResponse = {
  equipamento?: ApiEquipamento | null;
  calibracoes?: unknown[];
  qualificacoes?: unknown[];
  manutencoes?: unknown[];
  anexos?: unknown[];
  historico?: unknown[];
};

function normalizeEquipamentoDetalhe(
  data: ApiEquipamentoDetalheResponse | ApiEquipamento,
): EquipamentoDetalhe {
  const payload =
    "equipamento" in data && data.equipamento
      ? data
      : ({
          equipamento: data as ApiEquipamento,
          calibracoes: [],
          qualificacoes: [],
          manutencoes: [],
          anexos: [],
          historico: [],
        } satisfies ApiEquipamentoDetalheResponse);

  const equipamento = normalizeEquipamento(payload.equipamento ?? {});

  return {
    ...equipamento,
    calibracoes: normalizeTimeline(payload.calibracoes, "calibracao"),
    qualificacoes: normalizeTimeline(payload.qualificacoes, "qualificacao"),
    manutencoes: normalizeTimeline(payload.manutencoes, "manutencao"),
    anexos: normalizeTimeline(payload.anexos, "anexo"),
    historico: normalizeTimeline(payload.historico, "historico"),
  };
}

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

function normalizeTimelineStatus(status: unknown): StatusConformidade | "info" {
  const value = String(status ?? "").toLowerCase();
  if (value === "info") return "info";
  return normalizeStatus(status);
}

function normalizeTimeline(items: unknown[] | undefined, kind: string): EquipamentoHistoricoItem[] {
  return (items ?? []).map((raw, index) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const status = normalizeTimelineStatus(
      item.status_calculado ?? item.status_execucao ?? item.status ?? item.nivel ?? "info",
    );

    return {
      id: String(item.id ?? `${kind}-${index}`),
      data: String(
        item.data_vencimento ??
          item.proxima_manutencao ??
          item.data_manutencao ??
          item.data_calibracao ??
          item.data_qualificacao ??
          item.created_at ??
          "",
      ),
      descricao: buildTimelineDescription(item, kind),
      tipo: String(item.tipo ?? item.natureza ?? item.finalidade ?? item.acao ?? kind),
      status,
      documentoUrl: typeof item.url === "string" ? item.url : null,
    };
  });
}

function buildTimelineDescription(item: Record<string, unknown>, kind: string) {
  if (kind === "calibracao") {
    return [
      item.numero_certificado ? `Certificado ${item.numero_certificado}` : "Calibração",
      item.laboratorio_responsavel ? `laboratório ${item.laboratorio_responsavel}` : null,
      item.resultado ? `resultado ${item.resultado}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (kind === "qualificacao") {
    return [
      item.tipo ? `Qualificação ${item.tipo}` : "Qualificação",
      item.empresa_executora ? `executora ${item.empresa_executora}` : null,
      item.resultado ? `resultado ${item.resultado}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (kind === "manutencao") {
    return [
      item.nome_servico ?? "Manutenção",
      item.numero_ordem_servico ? `OS ${item.numero_ordem_servico}` : null,
      item.tecnico_responsavel ? `técnico ${item.tecnico_responsavel}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (kind === "anexo") {
    return String(item.nome_original ?? item.finalidade ?? "Anexo");
  }

  return [item.acao, item.entidade, item.descricao].filter(Boolean).join(" · ") || "Registro";
}
