import { getSupabaseClient } from "@/lib/supabaseClient";
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

    const documentos = extractRpcItems(data).map(normalizeDocumento);
    return hydrateDocumentAttachmentUrls(empresaId, documentos);
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

type ApiAnexoDocumento = {
  registro_id: string;
  storage_path: string;
  nome_original?: string | null;
  mime_type?: string | null;
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
    anexoUrl: documento.anexoUrl ?? null,
    anexoNome: documento.anexoNome ?? null,
  };
}

async function hydrateDocumentAttachmentUrls(
  empresaId: string,
  documentos: DocumentoResumo[],
): Promise<DocumentoResumo[]> {
  if (documentos.length === 0) return documentos;

  const supabase = getSupabaseClient();
  const documentoIds = documentos.map((documento) => documento.id);
  const { data, error } = await supabase
    .from("anexos")
    .select("registro_id, storage_path, nome_original, mime_type")
    .eq("empresa_id", empresaId)
    .eq("modulo", "documentos")
    .in("registro_id", documentoIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return documentos;

  const anexosPorDocumento = new Map<string, ApiAnexoDocumento>();
  for (const anexo of data as ApiAnexoDocumento[]) {
    if (!anexosPorDocumento.has(anexo.registro_id)) {
      anexosPorDocumento.set(anexo.registro_id, anexo);
    }
  }

  const signedUrls = new Map<string, string>();

  await Promise.all(
    Array.from(anexosPorDocumento.values()).map(async (anexo) => {
      const { data: signedUrlData } = await supabase.storage
        .from("evidencias")
        .createSignedUrl(anexo.storage_path, 60 * 10, { download: false });

      if (signedUrlData?.signedUrl) {
        signedUrls.set(anexo.storage_path, signedUrlData.signedUrl);
      }
    }),
  );

  return documentos.map((documento) => {
    const anexo = anexosPorDocumento.get(documento.id);
    if (!anexo) return documento;

    return {
      ...documento,
      anexoUrl: signedUrls.get(anexo.storage_path) ?? null,
      anexoNome: anexo.nome_original ?? "Anexo do documento",
    };
  });
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
