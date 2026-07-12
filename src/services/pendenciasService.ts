import { runtimeConfig } from "@/lib/runtime-config";
import { pendenciasMock } from "@/mocks";
import type { PendenciaResumo, StatusConformidade, TratativaPendencia } from "@/types";
import { cloneMock, extractRpcItems, invokeRpc, type PaginatedRpcResponse } from "./service-utils";

export interface ListarPendenciasParams {
  busca?: string;
  status?: string;
  limite?: number;
  offset?: number;
}

export const pendenciasService = {
  async listar(empresaId: string, params: ListarPendenciasParams = {}): Promise<PendenciaResumo[]> {
    if (runtimeConfig.useMocks) {
      const busca = params.busca?.trim().toLocaleLowerCase("pt-BR");

      return cloneMock(
        pendenciasMock.filter((pendencia) => {
          const correspondeBusca =
            !busca ||
            [pendencia.item, pendencia.tipo, pendencia.responsavel]
              .join(" ")
              .toLocaleLowerCase("pt-BR")
              .includes(busca);

          return correspondeBusca && (!params.status || pendencia.status === params.status);
        }),
      );
    }

    const data = await invokeRpc<PaginatedRpcResponse<ApiPendencia> | ApiPendencia[]>(
      "api_listar_pendencias",
      {
        p_empresa_id: empresaId,
        p_status: params.status || null,
        p_responsavel_id: null,
        p_limite: params.limite ?? 25,
        p_offset: params.offset ?? 0,
      },
    );

    const busca = params.busca?.trim().toLocaleLowerCase("pt-BR");
    const pendencias = extractRpcItems(data).map(normalizePendencia);

    if (!busca) return pendencias;

    return pendencias.filter((pendencia) =>
      [pendencia.item, pendencia.tipo, pendencia.responsavel]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(busca),
    );
  },

  registrarTratativa(empresaId: string, pendenciaId: string, payload: Partial<TratativaPendencia>) {
    return invokeRpc<void>("api_registrar_tratativa", {
      p_empresa_id: empresaId,
      p_pendencia_id: pendenciaId,
      p_payload: payload,
    });
  },
};

type ApiPendencia = Partial<PendenciaResumo> & {
  titulo?: string | null;
  modulo?: string | null;
  prazo?: string | null;
  responsavel_nome?: string | null;
  responsavel_id?: string | null;
  dias_atraso?: number | null;
};

function normalizePendencia(pendencia: ApiPendencia): PendenciaResumo {
  const vencimento = pendencia.vencimento ?? pendencia.prazo ?? "";

  return {
    id: pendencia.id ?? crypto.randomUUID(),
    item: pendencia.item ?? pendencia.titulo ?? "Pendência sem título",
    tipo: pendencia.tipo ?? labelModulo(pendencia.modulo),
    responsavel:
      pendencia.responsavel ??
      pendencia.responsavel_nome ??
      (pendencia.responsavel_id ? "Responsável definido" : "Sem responsável"),
    vencimento,
    diasRestantes:
      typeof pendencia.diasRestantes === "number"
        ? pendencia.diasRestantes
        : calcularDiasRestantes(vencimento),
    status: normalizeStatus(pendencia.status, vencimento),
  };
}

function normalizeStatus(status: unknown, prazo?: string): StatusConformidade {
  const value = String(status ?? "").toLowerCase();

  if (value === "concluida" || value === "concluída" || value === "ok") return "ok";
  if (value === "em_andamento" || value === "critico") return "critico";
  if (value === "cancelada" || value === "sem_validade") return "sem_validade";
  if (value === "vencido") return "vencido";

  const dias = calcularDiasRestantes(prazo);
  if (dias < 0) return "vencido";
  if (dias <= 7) return "critico";
  if (dias <= 30) return "atencao";
  return "atencao";
}

function calcularDiasRestantes(date: string | null | undefined): number {
  if (!date) return 999;
  const hoje = new Date();
  const alvo = new Date(`${date}T00:00:00`);
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

function labelModulo(modulo: string | undefined | null): string {
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
