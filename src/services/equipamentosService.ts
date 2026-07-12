import { runtimeConfig } from "@/lib/runtime-config";
import { equipamentosMock } from "@/mocks";
import type { Equipamento, EquipamentoResumo } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

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

    return invokeRpc<EquipamentoResumo[]>("api_listar_equipamentos", {
      p_empresa_id: empresaId,
      p_busca: params.busca || null,
      p_status: params.status || null,
      p_limite: params.limite ?? 25,
      p_offset: params.offset ?? 0,
    });
  },

  async obterDetalhe(
    empresaId: string,
    equipamentoId: string,
  ): Promise<EquipamentoResumo | null> {
    if (runtimeConfig.useMocks) {
      return cloneMock(
        equipamentosMock.find((equipamento) => equipamento.id === equipamentoId) ?? null,
      );
    }

    return invokeRpc<EquipamentoResumo>("api_equipamento_detalhe", {
      p_empresa_id: empresaId,
      p_equipamento_id: equipamentoId,
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
