import { runtimeConfig } from "@/lib/runtime-config";
import { documentosMock } from "@/mocks";
import type { Documento, DocumentoResumo } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export interface ListarDocumentosParams {
  busca?: string;
  status?: string;
  limite?: number;
  offset?: number;
}

export const documentosService = {
  async listar(
    empresaId: string,
    params: ListarDocumentosParams = {},
  ): Promise<DocumentoResumo[]> {
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

    return invokeRpc<DocumentoResumo[]>("api_listar_documentos", {
      p_empresa_id: empresaId,
      p_busca: params.busca || null,
      p_status: params.status || null,
      p_limite: params.limite ?? 25,
      p_offset: params.offset ?? 0,
    });
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
