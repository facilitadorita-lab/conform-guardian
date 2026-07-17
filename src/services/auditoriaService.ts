import { runtimeConfig } from "@/lib/runtime-config";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { logsAuditoriaMock } from "@/mocks";
import type { AuditoriaAvancada, LogAuditoriaResumo } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

type LogAuditoriaRow = {
  id: string;
  created_at: string;
  acao: string;
  modulo: string;
  ip: string | null;
  usuarios?: { nome: string | null } | Array<{ nome: string | null }> | null;
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

    return ((data ?? []) as unknown as LogAuditoriaRow[]).map((log) => ({
      id: log.id,
      data: new Date(log.created_at).toLocaleString("pt-BR"),
      usuario: firstUsuarioNome(log.usuarios) ?? "Sistema",
      acao: log.acao,
      entidade: log.modulo,
      ip: log.ip ?? "-",
    }));
  },

  async avancada(empresaId: string): Promise<AuditoriaAvancada> {
    if (runtimeConfig.useMocks) {
      return {
        resumo: {
          eventos_30d: logsAuditoriaMock.length,
          eventos_alto_risco_30d: 2,
          downloads_30d: 1,
          visualizacoes_30d: 1,
          substituicoes_30d: 1,
        },
        por_modulo: [
          { modulo: "documentos", total: 3 },
          { modulo: "anexos", total: 2 },
          { modulo: "usuarios", total: 1 },
        ],
        eventos: cloneMock(logsAuditoriaMock).map((log, index) => ({
          ...log,
          risco: index < 2 ? "alto" : index < 4 ? "medio" : "baixo",
          categoria: index < 2 ? "Operação crítica" : "Rotina",
          detalhes: null,
        })),
      };
    }

    const data = await invokeRpc<ApiAuditoriaAvancada>("api_auditoria_avancada", {
      p_empresa_id: empresaId,
      p_limite: 150,
    });

    return {
      resumo: {
        eventos_30d: Number(data.resumo?.eventos_30d ?? 0),
        eventos_alto_risco_30d: Number(data.resumo?.eventos_alto_risco_30d ?? 0),
        downloads_30d: Number(data.resumo?.downloads_30d ?? 0),
        visualizacoes_30d: Number(data.resumo?.visualizacoes_30d ?? 0),
        substituicoes_30d: Number(data.resumo?.substituicoes_30d ?? 0),
      },
      por_modulo: data.por_modulo ?? [],
      eventos: (data.eventos ?? []).map((log) => ({
        id: log.id,
        data: log.created_at,
        usuario: log.usuario ?? "Sistema",
        acao: log.acao,
        entidade: log.modulo,
        ip: log.ip ?? "-",
        risco: normalizeRisco(log.risco),
        categoria: log.categoria ?? "Sistema",
        detalhes: log.novo_valor ?? log.valor_anterior ?? null,
        userAgent: log.user_agent ?? null,
      })),
    };
  },
};

type ApiAuditoriaAvancada = {
  resumo?: Partial<AuditoriaAvancada["resumo"]>;
  por_modulo?: Array<{ modulo: string; total: number }>;
  eventos?: Array<{
    id: string;
    created_at: string;
    usuario?: string | null;
    acao: string;
    modulo: string;
    ip?: string | null;
    risco?: string | null;
    categoria?: string | null;
    user_agent?: string | null;
    valor_anterior?: Record<string, unknown> | null;
    novo_valor?: Record<string, unknown> | null;
  }>;
};

function normalizeRisco(value?: string | null): "baixo" | "medio" | "alto" {
  if (value === "alto") return "alto";
  if (value === "medio" || value === "médio") return "medio";
  return "baixo";
}

function firstUsuarioNome(usuario: LogAuditoriaRow["usuarios"]): string | null | undefined {
  return Array.isArray(usuario) ? usuario[0]?.nome : usuario?.nome;
}
