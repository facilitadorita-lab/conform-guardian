import { runtimeConfig } from "@/lib/runtime-config";
import { configuracoesMock } from "@/mocks";
import type { ConfiguracaoCatalogoItem, MatrizDocumentalEmpresa, OnboardingEmpresa } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export const configuracoesService = {
  async listar(): Promise<ConfiguracaoCatalogoItem[]> {
    if (runtimeConfig.useMocks) return cloneMock(configuracoesMock);
    return invokeRpc<ConfiguracaoCatalogoItem[]>("api_catalogo_configuracoes");
  },

  async matrizDocumental(empresaId: string): Promise<MatrizDocumentalEmpresa> {
    return invokeRpc<MatrizDocumentalEmpresa>("api_matriz_documental_empresa", {
      p_empresa_id: empresaId,
    });
  },

  async onboarding(empresaId: string): Promise<OnboardingEmpresa> {
    return invokeRpc<OnboardingEmpresa>("api_onboarding_empresa", {
      p_empresa_id: empresaId,
    });
  },
};
