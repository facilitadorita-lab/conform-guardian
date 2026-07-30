import { useQuery } from "@tanstack/react-query";
import { useAppSession } from "@/hooks/use-app-session";
import { useUnitContext } from "@/hooks/use-unit-context";
import { MOCK_EMPRESA_ID, runtimeConfig } from "@/lib/runtime-config";
import {
  alertasMock,
  dashboardMock,
  documentosMock,
  equipamentosMock,
  logsAuditoriaMock,
  manutencoesMock,
  pendenciasMock,
  usuariosMock,
} from "@/mocks";
import {
  adminMasterService,
  alertasService,
  auditoriaService,
  configuracoesService,
  dashboardService,
  documentosService,
  equipamentosService,
  manutencoesService,
  pendenciasService,
  relatoriosService,
  usuariosService,
} from "@/services";
import type { EquipamentoDetalhe } from "@/services/equipamentosService";

const staleTime = 60_000;

export function useAuthContext() {
  const { authContext, contextLoading, contextError, refreshContext } = useAppSession();
  return {
    data: authContext ?? undefined,
    isLoading: contextLoading,
    error: contextError,
    refetch: refreshContext,
  };
}

function useResolvedCompanyId() {
  const { selectedCompanyId, permissions } = useAppSession();
  const { unidadeAtualId, carregando: unitLoading, unidadesPermitidas } = useUnitContext();
  const authQuery = useAuthContext();
  const acessoBloqueado = Boolean(
    authQuery.data &&
    !authQuery.data.usuario.isMaster &&
    (authQuery.data.empresaAtual.status !== "ativa" ||
      permissions?.can_open_operational_modules !== true),
  );
  const empresaId = acessoBloqueado
    ? undefined
    : runtimeConfig.useMocks
      ? MOCK_EMPRESA_ID
      : (selectedCompanyId ?? authQuery.data?.empresaAtual.id);

  return {
    ...authQuery,
    empresaId,
    unidadeId: unidadeAtualId,
    unitScope: unidadeAtualId ?? "consolidado",
    unitReady: runtimeConfig.useMocks || (!unitLoading && unidadesPermitidas.length > 0),
    acessoBloqueado,
  };
}

export function useDashboardData() {
  const { empresaId, unidadeId, unitScope, unitReady } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["dashboard", empresaId, unitScope],
    queryFn: () => dashboardService.obter(empresaId!, unidadeId),
    enabled: Boolean(empresaId) && unitReady,
    initialData: runtimeConfig.useMocks
      ? { ...dashboardMock, pendencias: pendenciasMock }
      : undefined,
    staleTime,
  });
}

export function useDocumentos() {
  const { empresaId, unidadeId, unitScope, unitReady } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["documentos", empresaId, unitScope],
    queryFn: () => documentosService.listar(empresaId!, { unidadeId }),
    enabled: Boolean(empresaId) && unitReady,
    initialData: runtimeConfig.useMocks ? documentosMock : undefined,
    staleTime,
  });
}

export function useEquipamentos() {
  const { empresaId, unidadeId, unitScope, unitReady } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["equipamentos", empresaId, unitScope],
    queryFn: () => equipamentosService.listar(empresaId!, { unidadeId }),
    enabled: Boolean(empresaId) && unitReady,
    initialData: runtimeConfig.useMocks ? equipamentosMock : undefined,
    staleTime,
  });
}

export function useEquipamento(id: string) {
  const { empresaId, unitScope, unitReady } = useResolvedCompanyId();
  const equipamentoMock = equipamentosMock.find((equipamento) => equipamento.id === id);

  return useQuery({
    queryKey: ["equipamentos", empresaId, unitScope, id],
    queryFn: () => equipamentosService.obterDetalhe(empresaId!, id),
    enabled: Boolean(empresaId) && unitReady,
    initialData: runtimeConfig.useMocks
      ? equipamentoMock
        ? ({
            ...equipamentoMock,
            calibracoes: [],
            qualificacoes: [],
            manutencoes: [],
            anexos: [],
            historico: [],
          } satisfies EquipamentoDetalhe)
        : null
      : undefined,
    staleTime,
  });
}

export function useManutencoes(params: Parameters<typeof manutencoesService.listar>[1] = {}) {
  const { empresaId, unidadeId, unitScope, unitReady } = useResolvedCompanyId();
  const scopedParams = { ...params, unidadeId };

  return useQuery({
    queryKey: ["manutencoes", empresaId, unitScope, scopedParams],
    queryFn: () => manutencoesService.listar(empresaId!, scopedParams),
    enabled: Boolean(empresaId) && unitReady,
    initialData: runtimeConfig.useMocks ? manutencoesMock : undefined,
    staleTime,
  });
}

export function usePendencias() {
  const { empresaId, unidadeId, unitScope, unitReady } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["pendencias", empresaId, unitScope],
    queryFn: () => pendenciasService.listar(empresaId!, { unidadeId }),
    enabled: Boolean(empresaId) && unitReady,
    initialData: runtimeConfig.useMocks ? pendenciasMock : undefined,
    staleTime,
  });
}

export function useAlertas() {
  const { empresaId, unidadeId, unitScope, unitReady } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["alertas", empresaId, unitScope],
    queryFn: () => alertasService.listar(empresaId!, unidadeId),
    enabled: Boolean(empresaId) && unitReady,
    initialData: runtimeConfig.useMocks ? alertasMock : undefined,
    staleTime,
  });
}

export function useAuditoria() {
  const { empresaId, unidadeId, unitScope, unitReady } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["auditoria", empresaId, unitScope],
    queryFn: () => auditoriaService.listar(empresaId!, unidadeId),
    enabled: Boolean(empresaId) && unitReady,
    initialData: runtimeConfig.useMocks ? logsAuditoriaMock : undefined,
    staleTime,
  });
}

export function useAuditoriaAvancada() {
  const { empresaId, unidadeId, unitScope, unitReady } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["auditoria", "avancada", empresaId, unitScope],
    queryFn: () => auditoriaService.avancada(empresaId!, unidadeId),
    enabled: Boolean(empresaId) && unitReady,
    staleTime,
  });
}

export function useUsuarios() {
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["usuarios", empresaId],
    queryFn: () => usuariosService.listar(empresaId!),
    enabled: Boolean(empresaId),
    initialData: runtimeConfig.useMocks ? usuariosMock : undefined,
    staleTime,
  });
}

export function useRelatorios() {
  return useQuery({
    queryKey: ["relatorios"],
    queryFn: () => relatoriosService.listar(),
    staleTime,
  });
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: ["configuracoes"],
    queryFn: () => configuracoesService.listar(),
    staleTime,
  });
}

export function useMatrizDocumental() {
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["configuracoes", "matriz-documental", empresaId],
    queryFn: () => configuracoesService.matrizDocumental(empresaId!),
    enabled: Boolean(empresaId),
    staleTime,
  });
}

export function useOnboardingEmpresa() {
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["configuracoes", "onboarding", empresaId],
    queryFn: () => configuracoesService.onboarding(empresaId!),
    enabled: Boolean(empresaId),
    staleTime,
  });
}

export function useMasterFinanceiroResumo() {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ["master", "financeiro", "resumo"],
    queryFn: () => adminMasterService.financeiroResumo(),
    enabled: Boolean(auth.data?.usuario.isMaster),
    staleTime,
  });
}

export function useMasterAssinaturas() {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ["master", "assinaturas"],
    queryFn: () => adminMasterService.listarAssinaturas(),
    enabled: Boolean(auth.data?.usuario.isMaster),
    staleTime,
  });
}

export function useMasterPlanos() {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ["master", "planos"],
    queryFn: () => adminMasterService.listarPlanos(),
    enabled: Boolean(auth.data?.usuario.isMaster),
    staleTime,
  });
}
