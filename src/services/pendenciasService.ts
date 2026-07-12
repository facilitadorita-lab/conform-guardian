import { runtimeConfig } from "@/lib/runtime-config";
import { pendenciasMock } from "@/mocks";
import type { PendenciaResumo, TratativaPendencia } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export interface ListarPendenciasParams {
  busca?: string;
  status?: string;
  limite?: number;
  offset?: number;
}

export const pendenciasService = {
  async listar(
    empresaId: string,
    params: ListarPendenciasParams = {},
  ): Promise<PendenciaResumo[]> {
    if (runtimeConfig.useMocks) {
      const busca = params.busca?.trim().toLocaleLowerCase("pt-BR");

      return cloneMock(
        pendenciasMock.filter((pendencia) => {
          const correspondeBusca =
            !busca ||
            [pendencia.item, pendencia.tipo, pendencia.responsavel]
              .join(" ")
              .toLocaleLowerCase("pt-BR")
              .includes(busca);

          return correspondeBusca && (!params.status || pendencia.status === params.status);
        }),
      );
    }

    return invokeRpc<PendenciaResumo[]>("api_listar_pendencias", {
      p_empresa_id: empresaId,
      p_busca: params.busca || null,
      p_status: params.status || null,
      p_limite: params.limite ?? 25,
      p_offset: params.offset ?? 0,
    });
  },

  registrarTratativa(
    empresaId: string,
    pendenciaId: string,
    payload: Partial<TratativaPendencia>,
  ) {
    return invokeRpc<void>("api_registrar_tratativa", {
      p_empresa_id: empresaId,
      p_pendencia_id: pendenciaId,
      p_payload: payload,
    });
  },
};
