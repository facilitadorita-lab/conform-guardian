import { useCallback, useMemo, type ReactNode } from "react";
import type { EmpresaAtualMock, EmpresaStatus, UsuarioAtualMock } from "@/mocks/conformflow-mocks";
import { useAppSession } from "./use-app-session";

export type EmpresaResumo = {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  plano: string;
  status: EmpresaStatus;
  usuarios: number;
  documentos: number;
  equipamentos: number;
  assinatura: string;
  desde: string;
};

/** @deprecated O projeto usa somente AppSessionProvider; mantido para compatibilidade. */
export function SessionProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useSession() {
  const appSession = useAppSession();
  const { authContext, permissions, selectedCompanyId } = appSession;

  const empresasDisponiveis = useMemo<EmpresaResumo[]>(
    () =>
      (authContext?.empresasPermitidas ?? []).map((company) => ({
        id: company.id,
        razao_social: company.nome,
        nome_fantasia: company.nome,
        cnpj: company.cnpj,
        plano: company.plano?.nome ?? "—",
        status: company.status,
        usuarios: 0,
        documentos: 0,
        equipamentos: 0,
        assinatura: company.subscriptionStatus ?? "—",
        desde: "",
      })),
    [authContext],
  );

  const selectedCompany = useMemo(
    () => empresasDisponiveis.find((company) => company.id === selectedCompanyId) ?? null,
    [empresasDisponiveis, selectedCompanyId],
  );

  const empresaAtual = useMemo<EmpresaAtualMock>(
    () =>
      selectedCompany
        ? {
            id: selectedCompany.id,
            razao_social: selectedCompany.razao_social,
            nome_fantasia: selectedCompany.nome_fantasia,
            cnpj: selectedCompany.cnpj,
            status: selectedCompany.status,
            plano: selectedCompany.plano,
            proximo_vencimento: "",
          }
        : {
            id: "",
            razao_social: "—",
            nome_fantasia: "Nenhuma empresa selecionada",
            cnpj: "",
            status: "ativa",
            plano: "—",
            proximo_vencimento: "",
          },
    [selectedCompany],
  );

  const usuarioAtual = useMemo<UsuarioAtualMock>(
    () => ({
      id: authContext?.usuario.id ?? appSession.user?.id ?? "",
      nome: authContext?.usuario.nome ?? appSession.user?.email ?? "",
      email: authContext?.usuario.email ?? appSession.user?.email ?? "",
      perfil: authContext?.usuario.isMaster ? "Admin Master" : "Administrador",
      isMaster: authContext?.usuario.isMaster ?? false,
    }),
    [appSession.user, authContext],
  );

  const trocarEmpresa = useCallback(
    (companyId: string) => {
      if (!empresasDisponiveis.some((company) => company.id === companyId)) return false;
      void appSession.selectCompany(companyId);
      return true;
    },
    [appSession, empresasDisponiveis],
  );

  return {
    empresaAtual,
    selectedCompany,
    selectedCompanyId,
    empresasDisponiveis,
    usuarioAtual,
    isMaster: usuarioAtual.isMaster,
    empresaAtiva: empresaAtual.status === "ativa",
    podeEscrever: usuarioAtual.isMaster || permissions?.can_write === true,
    podeAdministrar: usuarioAtual.isMaster || permissions?.can_admin_company === true,
    acessoLiberado:
      usuarioAtual.isMaster ||
      permissions?.can_open_operational_modules ||
      Boolean(selectedCompany && empresaAtual.status === "ativa"),
    contextoCarregando: appSession.authLoading || appSession.contextLoading,
    trocarEmpresa,
    limparEmpresa: appSession.clearSelectedCompany,
    setEmpresaStatus: (_status: EmpresaStatus) => undefined,
    setIsMaster: (_isMaster: boolean) => undefined,
  };
}
