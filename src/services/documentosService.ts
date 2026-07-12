import { runtimeConfig } from "@/lib/runtime-config";
import { documentosMock } from "@/mocks";
import type { Documento, DocumentoResumo, StatusConformidade } from "@/types";
import { cloneMock, extractRpcItems, invokeRpc, type PaginatedRpcResponse } from "./service-utils";

export interface ListarDocumentosParams {
  busca?: string;
  status?: string;
  limite?: number;
  offset?: number;
}

export const documentosService = {
  async listar(empresaId: string, params: ListarDocumentosParams = {}): Promise<DocumentoResumo[]> {
    if (runtimeConfig.useMocks) {
      const busca = params.busca?.trim().toLocaleLowerCase("pt-BR");

      return cloneMock(
        documentosMock.filter((documento) => {
          const correspondeBusca =
            !busca ||
            [documento.nome, documento.numero, documento.orgao]
              .join(" ")
              .toLocaleLowerCase("pt-BR")
              .includes(busca);

          return correspondeBusca && (!params.status || documento.status === params.status);
        }),
      );
    }

    const data = await invokeRpc<PaginatedRpcResponse<ApiDocumento> | ApiDocumento[]>(
      "api_listar_documentos",
      {
        p_empresa_id: empresaId,
        p_busca: params.busca || null,
        p_status: params.status || null,
        p_limite: params.limite ?? 25,
        p_offset: params.offset ?? 0,
      },
    );

    return extractRpcItems(data).map(normalizeDocumento);
  },

  criar(empresaId: string, payload: Partial<Documento>) {
    return invokeRpc<Documento>("api_criar_documento", {
      p_empresa_id: empresaId,
      p_payload: payload,
    });
  },

  atualizar(empresaId: string, id: string, payload: Partial<Documento>) {
    return invokeRpc<Documento>("api_atualizar_documento", {
      p_empresa_id: empresaId,
      p_id: id,
      p_payload: payload,
    });
  },

  excluir(empresaId: string, id: string) {
    return invokeRpc<void>("api_excluir_logicamente", {
      p_empresa_id: empresaId,
      p_modulo: "documentos",
      p_registro_id: id,
    });
  },
};

type ApiDocumento = Partial<DocumentoResumo> & {
  numero_documento?: string | null;
  orgao_emissor?: string | null;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  status_calculado?: string | null;
  setor_unidade?: string | null;
  categoria_nome?: string | null;
  tipo_documento_nome?: string | null;
  responsavel_nome?: string | null;
  responsavel_id?: string | null;
};

function normalizeDocumento(documento: ApiDocumento): DocumentoResumo {
  return {
    id: documento.id ?? crypto.randomUUID(),
    nome: documento.nome ?? "Documento sem nome",
    categoria: documento.categoria ?? documento.categoria_nome ?? "Geral",
    tipo: documento.tipo ?? documento.tipo_documento_nome ?? "Documento",
    numero: documento.numero ?? documento.numero_documento ?? "-",
    orgao: documento.orgao ?? documento.orgao_emissor ?? "-",
    responsavel:
      documento.responsavel ??
      documento.responsavel_nome ??
      (documento.responsavel_id ? "Responsável definido" : "Sem responsável"),
    emissao: documento.emissao ?? documento.data_emissao ?? "-",
    vencimento: documento.vencimento ?? documento.data_vencimento ?? "-",
    status: normalizeStatus(documento.status ?? documento.status_calculado),
    setor: documento.setor ?? documento.setor_unidade ?? "-",
  };
}

function normalizeStatus(status: unknown): StatusConformidade {
  const value = String(status ?? "").toLowerCase();

  if (value === "ok" || value === "em_dia") return "ok";
  if (value === "atencao" || value === "a_vencer" || value === "pendente_anexo") return "atencao";
  if (value === "critico" || value === "vence_hoje" || value === "reprovado") return "critico";
  if (value === "vencido") return "vencido";
  if (value === "sem_validade") return "sem_validade";

  return "ok";
}
