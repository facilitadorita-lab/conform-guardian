import { runtimeConfig } from "@/lib/runtime-config";
import { alertasMock } from "@/mocks";
import type { AlertaResumo } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export const alertasService = {
  async listar(empresaId: string): Promise<AlertaResumo[]> {
    if (runtimeConfig.useMocks) {
      return cloneMock(alertasMock);
    }

    return invokeRpc<AlertaResumo[]>("api_listar_alertas", {
      p_empresa_id: empresaId,
      p_limite: 25,
      p_offset: 0,
    });
  },

  marcarComoLido(alertaId: string, lido: boolean) {
    return invokeRpc<void>("api_marcar_alerta_lido", {
      p_alerta_id: alertaId,
      p_lido: lido,
    });
  },
};
