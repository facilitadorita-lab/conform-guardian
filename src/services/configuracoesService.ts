import { configuracoesMock } from "@/mocks";
import type { ConfiguracaoCatalogoItem } from "@/types";
import { cloneMock } from "./service-utils";

export const configuracoesService = {
  async listar(): Promise<ConfiguracaoCatalogoItem[]> {
    return cloneMock(configuracoesMock);
  },
};
