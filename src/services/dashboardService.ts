import { runtimeConfig } from "@/lib/runtime-config";
import { dashboardMock, pendenciasMock } from "@/mocks";
import type { DashboardResumo, PendenciaResumo, StatusConformidade } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export interface DashboardData extends DashboardResumo {
  pendencias: PendenciaResumo[];
}

type ApiPendenciasResumo = {
  abertas?: number;
  sem_responsavel?: number;
};

type ApiDashboardResponse = Partial<DashboardData> & {
  conformidade_percentual?: number;
  documentos?: {
    total?: number;
    vencidos?: number;
    criticos?: number;
    a_vencer_30?: number;
    pendentes_anexo?: number;
  };
  equipamentos?: {
    total?: number;
    conformes?: number;
    atencao?: number;
  };
  manutencoes?: {
    vencidas?: number;
    a_vencer?: number;
  };
  pendencias?: PendenciaResumo[] | ApiPendenciasResumo;
  pendencias_criticas?: Array<{
    id?: string;
    modulo?: string;
    titulo?: string;
    prazo?: string | null;
    status?: string;
    responsavel_id?: string | null;
  }>;
};

export const dashboardService = {
  async obter(empresaId: string): Promise<DashboardData> {
    if (runtimeConfig.useMocks) {
      return cloneMock({ ...dashboardMock, pendencias: pendenciasMock });
    }

    const data = await invokeRpc<ApiDashboardResponse>("api_dashboard", {
      p_empresa_id: empresaId,
    });
    return normalizeDashboard(data);
  },
};

function normalizeDashboard(data: ApiDashboardResponse): DashboardData {
  const pendenciasRaw = data.pendencias as PendenciaResumo[] | ApiPendenciasResumo | undefined;
  const pendencias = Array.isArray(pendenciasRaw)
    ? pendenciasRaw
    : normalizePendenciasCriticas(data.pendencias_criticas ?? []);

  return {
    indiceConformidade: numberOrZero(data.indiceConformidade ?? data.conformidade_percentual),
    documentosVencidos: numberOrZero(data.documentosVencidos ?? data.documentos?.vencidos),
    vencendo7: numberOrZero(data.vencendo7 ?? data.documentos?.criticos),
    vencendo30: numberOrZero(data.vencendo30 ?? data.documentos?.a_vencer_30),
    vencendo60: numberOrZero(data.vencendo60 ?? data.documentos?.a_vencer_30),
    equipamentosAtencao: numberOrZero(data.equipamentosAtencao ?? data.equipamentos?.atencao),
    manutencoesVencidas: numberOrZero(data.manutencoesVencidas ?? data.manutencoes?.vencidas),
    manutencoesProximas: numberOrZero(data.manutencoesProximas ?? data.manutencoes?.a_vencer),
    pendenciasCriticas: numberOrZero(
      data.pendenciasCriticas ??
        (Array.isArray(pendenciasRaw) ? pendenciasRaw.length : pendenciasRaw?.abertas),
    ),
    semAnexo: numberOrZero(data.semAnexo ?? data.documentos?.pendentes_anexo),
    semResponsavel: numberOrZero(
      data.semResponsavel ?? (Array.isArray(pendenciasRaw) ? 0 : pendenciasRaw?.sem_responsavel),
    ),
    pendencias,
  };
}

function normalizePendenciasCriticas(
  pendenciasCriticas: NonNullable<ApiDashboardResponse["pendencias_criticas"]>,
): PendenciaResumo[] {
  return pendenciasCriticas.map((pendencia) => {
    const vencimento = pendencia.prazo ?? "";
    const diasRestantes = calcularDiasRestantes(vencimento);

    return {
      id: pendencia.id ?? crypto.randomUUID(),
      item: pendencia.titulo ?? "Pendência sem título",
      tipo: labelModulo(pendencia.modulo),
      responsavel: pendencia.responsavel_id ? "Responsável definido" : "Sem responsável",
      vencimento,
      diasRestantes,
      status: statusPorPrazo(diasRestantes),
    };
  });
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calcularDiasRestantes(date: string | null | undefined): number {
  if (!date) return 999;
  const hoje = new Date();
  const alvo = new Date(`${date}T00:00:00`);
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

function statusPorPrazo(diasRestantes: number): StatusConformidade {
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= 7) return "critico";
  if (diasRestantes <= 30) return "atencao";
  return "ok";
}

function labelModulo(modulo: string | undefined): string {
  const labels: Record<string, string> = {
    documentos: "Documento",
    equipamentos: "Equipamento",
    calibracoes: "Calibração",
    qualificacoes: "Qualificação",
    manutencoes: "Manutenção",
    pendencias: "Pendência",
  };

  return modulo ? (labels[modulo] ?? modulo) : "Pendência";
}
