import { runtimeConfig } from "@/lib/runtime-config";
import { dashboardMock, pendenciasMock } from "@/mocks";
import type { DashboardResumo, PendenciaResumo } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export interface DashboardData extends DashboardResumo {
  pendencias: PendenciaResumo[];
}

export const dashboardService = {
  async obter(empresaId: string): Promise<DashboardData> {
    if (runtimeConfig.useMocks) {
      return cloneMock({ ...dashboardMock, pendencias: pendenciasMock });
    }

    return invokeRpc<DashboardData>("api_dashboard", { p_empresa_id: empresaId });
  },
};
