import { runtimeConfig } from "@/lib/runtime-config";
import { relatoriosMock } from "@/mocks";
import type { RelatorioCatalogoItem, RelatorioExecutivoIA } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export const relatoriosService = {
  async listar(): Promise<RelatorioCatalogoItem[]> {
    if (runtimeConfig.useMocks) return cloneMock(relatoriosMock);
    return invokeRpc<RelatorioCatalogoItem[]>("api_catalogo_relatorios");
  },

  async gerarExecutivoIA(empresaId: string): Promise<RelatorioExecutivoIA> {
    return invokeRpc<RelatorioExecutivoIA>("api_relatorio_executivo_ia", {
      p_empresa_id: empresaId,
    });
  },
};
