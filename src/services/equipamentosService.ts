import { runtimeConfig } from "@/lib/runtime-config";
import { getSupabaseClient } from "@/lib/supabaseClient";
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

    const data = await invokeRpc<
      | ApiEquipamentoDetalheResponse
      | ApiEquipamento
      | ApiEquipamentoDetalheResponse[]
      | ApiEquipamento[]
      | null
    >("api_equipamento_detalhe", {
      p_empresa_id: empresaId,
      p_equipamento_id: equipamentoId,
    });

    if (!data) return null;

    const detalhe = normalizeEquipamentoDetalhe(data);
    return hydrateEquipamentoAttachmentUrls(empresaId, detalhe);
  },

  criarCalibracao(empresaId: string, equipamentoId: string, payload: CriarCalibracaoPayload) {
    return invokeRpc<{ id: string }>("api_criar_calibracao", {
      p_empresa_id: empresaId,
      p_equipamento_id: equipamentoId,
      p_payload: payload,
    });
  },

  criarQualificacao(empresaId: string, equipamentoId: string, payload: CriarQualificacaoPayload) {
    return invokeRpc<{ id: string }>("api_criar_qualificacao", {
      p_empresa_id: empresaId,
      p_equipamento_id: equipamentoId,
      p_payload: payload,
    });
  },

  criarManutencao(empresaId: string, payload: CriarManutencaoPayload) {
    return invokeRpc<{ id: string }>("api_criar_manutencao", {
      p_empresa_id: empresaId,
      p_payload: payload,
    });
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
  registroId?: string | null;
  modulo?: string | null;
  data?: string | null;
  descricao: string;
  tipo?: string | null;
  status?: StatusConformidade | "info";
  documentoUrl?: string | null;
  documentoNome?: string | null;
};

export type CriarCalibracaoPayload = {
  data_calibracao: string;
  data_vencimento?: string;
  numero_certificado?: string;
  laboratorio_responsavel?: string;
  resultado: "aprovado" | "reprovado" | "aprovado_restricao" | "nao_aplicavel";
  observacoes?: string;
};

export type CriarQualificacaoPayload = {
  tipo: string;
  data_qualificacao: string;
  data_vencimento?: string;
  resultado: "aprovado" | "reprovado" | "aprovado_restricao" | "nao_aplicavel";
  empresa_executora?: string;
  observacoes?: string;
};

export type CriarManutencaoPayload = {
  equipamento_id: string;
  nome_servico?: string;
  natureza: "preventiva" | "corretiva";
  tipo_servico?: string;
  status_execucao?: "programada" | "em_andamento" | "concluida" | "cancelada";
  data_manutencao: string;
  proxima_manutencao?: string;
  periodicidade_meses?: string;
  empresa_responsavel?: string;
  tecnico_responsavel?: string;
  numero_ordem_servico?: string;
  exige_evidencia?: boolean;
  falha_apresentada?: string;
  prioridade?: string;
  diagnostico?: string;
  causa_raiz?: string;
  acao_realizada?: string;
  observacoes?: string;
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
  numero_serie?: string | null;
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
  data:
    | ApiEquipamentoDetalheResponse
    | ApiEquipamento
    | ApiEquipamentoDetalheResponse[]
    | ApiEquipamento[],
): EquipamentoDetalhe {
  const normalizedData = unwrapRpcObject(data);
  const payload = isEquipamentoDetalheResponse(normalizedData)
    ? normalizedData
    : ({
        equipamento: normalizedData as ApiEquipamento,
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

function unwrapRpcObject(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return unwrapRpcObject(value[0] ?? {});

  if (!value || typeof value !== "object") return {};

  const objectValue = value as Record<string, unknown>;
  const wrapperKeys = ["data", "result", "api_equipamento_detalhe"];

  for (const key of wrapperKeys) {
    if (objectValue[key]) return unwrapRpcObject(objectValue[key]);
  }

  if (Array.isArray(objectValue.items)) return unwrapRpcObject(objectValue.items[0] ?? {});

  return objectValue;
}

function isEquipamentoDetalheResponse(
  value: Record<string, unknown>,
): value is ApiEquipamentoDetalheResponse {
  return (
    "equipamento" in value ||
    "calibracoes" in value ||
    "qualificacoes" in value ||
    "manutencoes" in value ||
    "anexos" in value ||
    "historico" in value
  );
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

function normalizeTimeline(items: unknown, kind: string): EquipamentoHistoricoItem[] {
  const normalizedItems = normalizeTimelineItems(items);

  return normalizedItems.map((raw, index) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const status = normalizeTimelineStatus(
      item.status_calculado ?? item.status_execucao ?? item.status ?? item.nivel ?? "info",
    );

    return {
      id: String(item.id ?? `${kind}-${index}`),
      registroId: String(item.registro_id ?? item.registroId ?? item.id ?? ""),
      modulo: String(item.modulo ?? kind),
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
      documentoNome: String(item.nome_original ?? item.nome ?? item.finalidade ?? ""),
    };
  });
}

function normalizeTimelineItems(items: unknown): unknown[] {
  if (Array.isArray(items)) return items;
  if (!items || typeof items !== "object") return [];

  const objectValue = items as Record<string, unknown>;
  if (Array.isArray(objectValue.items)) return objectValue.items;
  if (Array.isArray(objectValue.data)) return objectValue.data;

  return [];
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
type ApiAnexo = {
  id: string;
  registro_id: string;
  modulo: string;
  storage_path: string;
  nome_original?: string | null;
};

async function hydrateEquipamentoAttachmentUrls(
  empresaId: string,
  detalhe: EquipamentoDetalhe,
): Promise<EquipamentoDetalhe> {
  const supabase = getSupabaseClient();
  if (!supabase) return detalhe;

  const registroIds = [
    detalhe.id,
    ...detalhe.calibracoes.map((item) => item.id).filter(Boolean),
    ...detalhe.qualificacoes.map((item) => item.id).filter(Boolean),
    ...detalhe.manutencoes.map((item) => item.id).filter(Boolean),
  ] as string[];

  if (!registroIds.length) return detalhe;

  const { data, error } = await supabase
    .from("anexos")
    .select("id, registro_id, modulo, storage_path, nome_original")
    .eq("empresa_id", empresaId)
    .in("registro_id", registroIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return detalhe;

  const anexos = data as ApiAnexo[];
  const signedUrls = new Map<string, string>();

  await Promise.all(
    anexos.map(async (anexo) => {
      const { data: signedUrlData } = await supabase.storage
        .from("evidencias")
        .createSignedUrl(anexo.storage_path, 60 * 10, { download: false });

      if (signedUrlData?.signedUrl) signedUrls.set(anexo.id, signedUrlData.signedUrl);
    }),
  );

  return {
    ...detalhe,
    anexos: detalhe.anexos.map((item) => {
      const anexo = anexos.find((candidate) => candidate.id === item.id);
      if (!anexo) return item;

      return {
        ...item,
        registroId: anexo.registro_id,
        modulo: anexo.modulo,
        documentoUrl: signedUrls.get(anexo.id) ?? null,
        documentoNome: anexo.nome_original ?? item.documentoNome ?? "Anexo",
      };
    }),
  };
}
