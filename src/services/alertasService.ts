import { runtimeConfig } from "@/lib/runtime-config";
import { alertasMock } from "@/mocks";
import type { AlertaResumo, StatusConformidade } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export const alertasService = {
  async listar(empresaId: string): Promise<AlertaResumo[]> {
    if (runtimeConfig.useMocks) {
      return cloneMock(alertasMock);
    }

    const data = await invokeRpc<ApiAlerta[]>("api_listar_alertas", {
      p_empresa_id: empresaId,
      p_somente_nao_lidos: false,
      p_limite: 25,
    });

    return data.map(normalizeAlerta);
  },

  marcarComoLido(alertaId: string, lido: boolean) {
    return invokeRpc<void>("api_marcar_alerta_lido", {
      p_alerta_id: alertaId,
      p_lido: lido,
    });
  },
};

type ApiAlerta = Partial<AlertaResumo> & {
  marco_dias?: number | null;
  titulo?: string | null;
  mensagem?: string | null;
  data_vencimento?: string | null;
  status?: string | null;
  modulo?: string | null;
};

function normalizeAlerta(alerta: ApiAlerta): AlertaResumo {
  return {
    id: alerta.id ?? crypto.randomUUID(),
    marco: alerta.marco ?? labelMarco(alerta.marco_dias),
    item: alerta.item ?? alerta.titulo ?? alerta.mensagem ?? "Alerta",
    canal: alerta.canal ?? "Central interna",
    data: alerta.data ?? alerta.data_vencimento ?? "-",
    nivel: alerta.nivel ?? normalizeNivel(alerta.status, alerta.data_vencimento),
  };
}

function labelMarco(marcoDias: number | null | undefined): string {
  if (marcoDias === null || marcoDias === undefined) return "Alerta";
  if (marcoDias < 0) return "Vencido";
  if (marcoDias === 0) return "Vence hoje";
  return `${marcoDias} dias`;
}

function normalizeNivel(
  status: unknown,
  dataVencimento?: string | null,
): StatusConformidade | "info" {
  const value = String(status ?? "").toLowerCase();

  if (value === "vencido") return "vencido";
  if (value === "critico") return "critico";
  if (value === "atencao" || value === "nao_lido" || value === "não_lido") return "atencao";

  const dias = calcularDiasRestantes(dataVencimento);
  if (dias < 0) return "vencido";
  if (dias <= 7) return "critico";
  if (dias <= 30) return "atencao";

  return "info";
}

function calcularDiasRestantes(date: string | null | undefined): number {
  if (!date) return 999;
  const hoje = new Date();
  const alvo = new Date(`${date}T00:00:00`);
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / 86_400_000);
}
