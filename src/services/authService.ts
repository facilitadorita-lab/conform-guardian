import { runtimeConfig } from "@/lib/runtime-config";
import { authContextMock } from "@/mocks";
import type {
  AuthContexto,
  CompanyAccessStatus,
  CompanyVerificationStatus,
  EmpresaPlanoResumo,
  SubscriptionStatusNormalized,
} from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export const SELECTED_COMPANY_STORAGE_KEY = "conformflow.selectedCompanyId";

interface ApiContextoUsuarioResponse {
  usuario: {
    id: string;
    nome: string;
    email: string;
    is_master: boolean;
  };
  empresas: Array<{
    id: string;
    nome_fantasia: string;
    razao_social: string;
    cnpj: string;
    status: "ativa" | "bloqueada" | "cancelada";
    verification_status?: CompanyVerificationStatus;
    access_status?: CompanyAccessStatus;
    subscription_status?: SubscriptionStatusNormalized;
    plano?: EmpresaPlanoResumo | null;
    perfil:
      | "administrador_provisorio"
      | "administrador"
      | "responsavel_tecnico"
      | "colaborador"
      | "somente_leitura"
      | "master";
  }>;
}

export function getSelectedCompanyId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
}

export function setSelectedCompanyId(companyId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, companyId);
}

export function clearSelectedCompanyId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
}

export const authService = {
  async obterContexto(): Promise<AuthContexto> {
    if (runtimeConfig.useMocks) {
      return cloneMock(authContextMock);
    }

    const contexto = await invokeRpc<ApiContextoUsuarioResponse>("api_contexto_usuario");
    const selectedCompanyId = getSelectedCompanyId();
    const empresaAtual =
      contexto.empresas.find((empresa) => empresa.id === selectedCompanyId) ?? contexto.empresas[0];

    if (!empresaAtual) {
      throw new Error("Nenhuma empresa vinculada ao usuario autenticado.");
    }

    if (!selectedCompanyId || selectedCompanyId !== empresaAtual.id) {
      setSelectedCompanyId(empresaAtual.id);
    }

    return {
      usuario: {
        id: contexto.usuario.id,
        nome: contexto.usuario.nome,
        email: contexto.usuario.email,
        isMaster: contexto.usuario.is_master,
      },
      empresaAtual: {
        id: empresaAtual.id,
        nome: empresaAtual.razao_social || empresaAtual.nome_fantasia,
        cnpj: empresaAtual.cnpj,
        status: empresaAtual.status,
        verificationStatus: empresaAtual.verification_status,
        accessStatus: empresaAtual.access_status,
        subscriptionStatus: empresaAtual.subscription_status,
        plano: normalizePlano(empresaAtual.plano),
      },
      empresasPermitidas: contexto.empresas.map((empresa) => ({
        id: empresa.id,
        nome: empresa.razao_social || empresa.nome_fantasia,
        cnpj: empresa.cnpj,
        status: empresa.status,
        verificationStatus: empresa.verification_status,
        accessStatus: empresa.access_status,
        subscriptionStatus: empresa.subscription_status,
        plano: normalizePlano(empresa.plano),
      })),
      perfilAtual: empresaAtual.perfil,
    };
  },
};

function normalizePlano(plano: EmpresaPlanoResumo | null | undefined): EmpresaPlanoResumo | null {
  if (!plano) return null;
  return {
    id: plano.id ?? null,
    nome: plano.nome ?? null,
    codigo: plano.codigo ?? null,
    recursos: plano.recursos ?? {},
    limite_usuarios: plano.limite_usuarios ?? null,
    limite_documentos: plano.limite_documentos ?? null,
    limite_equipamentos: plano.limite_equipamentos ?? null,
    limite_storage_mb: plano.limite_storage_mb ?? null,
  };
}
