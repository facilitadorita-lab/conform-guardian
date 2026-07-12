import { runtimeConfig } from "@/lib/runtime-config";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { logsAuditoriaMock } from "@/mocks";
import type { LogAuditoriaResumo } from "@/types";
import { cloneMock } from "./service-utils";

type LogAuditoriaRow = {
  id: string;
  created_at: string;
  acao: string;
  modulo: string;
  ip: string | null;
  usuarios?: { nome: string | null } | null;
};

export const auditoriaService = {
  async listar(empresaId: string): Promise<LogAuditoriaResumo[]> {
    if (runtimeConfig.useMocks) return cloneMock(logsAuditoriaMock);

    const { data, error } = await getSupabaseClient()
      .from("logs_auditoria")
      .select("id,created_at,acao,modulo,ip,usuarios(nome)")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return ((data ?? []) as LogAuditoriaRow[]).map((log) => ({
      id: log.id,
      data: new Date(log.created_at).toLocaleString("pt-BR"),
      usuario: log.usuarios?.nome ?? "Sistema",
      acao: log.acao,
      entidade: log.modulo,
      ip: log.ip ?? "-",
    }));
  },
};
