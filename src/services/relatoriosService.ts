import { relatoriosMock } from "@/mocks";
import type { RelatorioCatalogoItem } from "@/types";
import { cloneMock } from "./service-utils";

export const relatoriosService = {
  async listar(): Promise<RelatorioCatalogoItem[]> {
    return cloneMock(relatoriosMock);
  },
};
