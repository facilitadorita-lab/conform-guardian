import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { MOCK_EMPRESA_ID, runtimeConfig } from "@/lib/runtime-config";
import {
  alertasMock,
  authContextMock,
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
  authService,
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
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ["auth", "contexto"],
    queryFn: () => authService.obterContexto(),
    enabled: runtimeConfig.useMocks || (!loading && Boolean(user)),
    initialData: runtimeConfig.useMocks ? authContextMock : undefined,
    staleTime,
  });
}

function useResolvedCompanyId() {
  const authQuery = useAuthContext();
  const { selectedCompanyId, selectedCompany, isMaster } = useSession();
  const acessoBloqueado = Boolean(
    !isMaster && selectedCompany && selectedCompany.status !== "ativa",
  );
  const empresaId = acessoBloqueado
    ? undefined
    : runtimeConfig.useMocks
      ? MOCK_EMPRESA_ID
      : selectedCompanyId;

  return {
    ...authQuery,
    empresaId,
    acessoBloqueado,
  };
}

export function useDashboardData() {
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["dashboard", empresaId],
    queryFn: () => dashboardService.obter(empresaId!),
    enabled: Boolean(empresaId),
    initialData: runtimeConfig.useMocks
      ? { ...dashboardMock, pendencias: pendenciasMock }
      : undefined,
    staleTime,
  });
}

export function useDocumentos() {
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["documentos", empresaId],
    queryFn: () => documentosService.listar(empresaId!),
    enabled: Boolean(empresaId),
    initialData: runtimeConfig.useMocks ? documentosMock : undefined,
    staleTime,
  });
}

export function useEquipamentos() {
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["equipamentos", empresaId],
    queryFn: () => equipamentosService.listar(empresaId!),
    enabled: Boolean(empresaId),
    initialData: runtimeConfig.useMocks ? equipamentosMock : undefined,
    staleTime,
  });
}

export function useEquipamento(id: string) {
  const { empresaId } = useResolvedCompanyId();
  const equipamentoMock = equipamentosMock.find((equipamento) => equipamento.id === id);

  return useQuery({
    queryKey: ["equipamentos", empresaId, id],
    queryFn: () => equipamentosService.obterDetalhe(empresaId!, id),
    enabled: Boolean(empresaId),
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
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["manutencoes", empresaId, params],
    queryFn: () => manutencoesService.listar(empresaId!, params),
    enabled: Boolean(empresaId),
    initialData: runtimeConfig.useMocks ? manutencoesMock : undefined,
    staleTime,
  });
}

export function usePendencias() {
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["pendencias", empresaId],
    queryFn: () => pendenciasService.listar(empresaId!),
    enabled: Boolean(empresaId),
    initialData: runtimeConfig.useMocks ? pendenciasMock : undefined,
    staleTime,
  });
}

export function useAlertas() {
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["alertas", empresaId],
    queryFn: () => alertasService.listar(empresaId!),
    enabled: Boolean(empresaId),
    initialData: runtimeConfig.useMocks ? alertasMock : undefined,
    staleTime,
  });
}

export function useAuditoria() {
  const { empresaId } = useResolvedCompanyId();

  return useQuery({
    queryKey: ["auditoria", empresaId],
    queryFn: () => auditoriaService.listar(empresaId!),
    enabled: Boolean(empresaId),
    initialData: runtimeConfig.useMocks ? logsAuditoriaMock : undefined,
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
