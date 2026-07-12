import { runtimeConfig } from "@/lib/runtime-config";
import { manutencoesMock } from "@/mocks";
import type { Manutencao, ManutencaoResumo } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

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

    return invokeRpc<ManutencaoResumo[]>("api_listar_manutencoes", {
      p_empresa_id: empresaId,
      p_busca: params.busca || null,
      p_status: params.status || null,
      p_natureza: params.natureza || null,
      p_equipamento_id: params.equipamentoId ?? null,
      p_limite: params.limite ?? 25,
      p_offset: params.offset ?? 0,
    });
  },

  criar(empresaId: string, payload: Partial<Manutencao>) {
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
