import { runtimeConfig } from "@/lib/runtime-config";
import { getSupabaseClient } from "@/lib/supabaseClient";

export interface EvidenciaTimelineItem {
  id: string;
  data: string;
  titulo: string;
  descricao: string;
  tipo: "upload" | "substituicao" | "visualizacao" | "edicao" | "arquivo" | "sistema";
  usuario: string;
}

type LogAuditoriaRow = {
  id: string;
  created_at: string;
  acao: string;
  modulo: string;
  registro_id: string | null;
  novo_valor: Record<string, unknown> | null;
  usuarios?: { nome: string | null } | Array<{ nome: string | null }> | null;
};

type AnexoRow = {
  id: string;
  created_at: string;
  nome_original: string;
  finalidade: string;
  versao: number;
  status: string;
};

export const evidenciasTimelineService = {
  async listar(
    empresaId: string,
    modulo: string,
    registroId: string,
  ): Promise<EvidenciaTimelineItem[]> {
    if (runtimeConfig.useMocks) {
      return [
        {
          id: "mock-1",
          data: new Date().toISOString(),
          titulo: "Registro criado",
          descricao: "Evento inicial simulado para visualização da linha do tempo.",
          tipo: "sistema",
          usuario: "Sistema",
        },
      ];
    }

    const supabase = getSupabaseClient();
    const [{ data: logs }, { data: anexos }] = await Promise.all([
      supabase
        .from("logs_auditoria")
        .select("id,created_at,acao,modulo,registro_id,novo_valor,usuarios(nome)")
        .eq("empresa_id", empresaId)
        .eq("modulo", modulo)
        .eq("registro_id", registroId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("anexos")
        .select("id,created_at,nome_original,finalidade,versao,status")
        .eq("empresa_id", empresaId)
        .eq("modulo", modulo)
        .eq("registro_id", registroId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    const timelineLogs = ((logs ?? []) as unknown as LogAuditoriaRow[]).map(normalizeLog);
    const timelineAnexos = ((anexos ?? []) as AnexoRow[]).map(normalizeAnexo);

    return [...timelineLogs, ...timelineAnexos].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    );
  },
};

function normalizeLog(log: LogAuditoriaRow): EvidenciaTimelineItem {
  const label = labelAcao(log.acao);
  const arquivo = String(log.novo_valor?.nome_original ?? "");

  return {
    id: log.id,
    data: log.created_at,
    titulo: label.titulo,
    descricao: arquivo ? `${label.descricao}: ${arquivo}` : label.descricao,
    tipo: label.tipo,
    usuario: firstUsuarioNome(log.usuarios) ?? "Sistema",
  };
}

function firstUsuarioNome(
  usuario: LogAuditoriaRow["usuarios"],
): string | null | undefined {
  return Array.isArray(usuario) ? usuario[0]?.nome : usuario?.nome;
}

function normalizeAnexo(anexo: AnexoRow): EvidenciaTimelineItem {
  return {
    id: `anexo-${anexo.id}`,
    data: anexo.created_at,
    titulo: anexo.status === "substituido" ? "Arquivo arquivado" : "Arquivo atual",
    descricao: `${anexo.nome_original} · ${anexo.finalidade} · versão ${anexo.versao}`,
    tipo: "arquivo",
    usuario: "Sistema",
  };
}

function labelAcao(acao: string): Pick<EvidenciaTimelineItem, "titulo" | "descricao" | "tipo"> {
  const labels: Record<string, Pick<EvidenciaTimelineItem, "titulo" | "descricao" | "tipo">> = {
    upload_anexo: {
      titulo: "Anexo enviado",
      descricao: "Arquivo incluído no registro",
      tipo: "upload",
    },
    substituicao_anexo: {
      titulo: "Anexo substituído",
      descricao: "Novo arquivo enviado e anterior arquivado",
      tipo: "substituicao",
    },
    visualizacao_anexo: {
      titulo: "Anexo visualizado",
      descricao: "Arquivo aberto em visualização segura",
      tipo: "visualizacao",
    },
    edicao: {
      titulo: "Registro editado",
      descricao: "Dados do registro foram atualizados",
      tipo: "edicao",
    },
    criacao: {
      titulo: "Registro criado",
      descricao: "Registro inicial criado no ambiente da empresa",
      tipo: "sistema",
    },
  };

  return labels[acao] ?? { titulo: acao, descricao: "Evento registrado na auditoria", tipo: "sistema" };
}
