import type { ISODateTime, UUID } from "./domain";

export interface PermissionCatalogItem {
  codigo: string;
  modulo: string;
  acao: string;
  nome: string;
  descricao: string;
  sensivel: boolean;
  ordem: number;
}

export interface PermissionMatrixUser {
  usuario_id: UUID;
  nome: string;
  email: string;
  perfil: string;
  permissoes: Record<string, boolean>;
  overrides: Record<string, boolean>;
}

export interface PermissionMatrix {
  catalogo: PermissionCatalogItem[];
  usuarios: PermissionMatrixUser[];
}

export interface DocumentWorkflowRevision {
  id: UUID;
  numero_versao: number;
  status: "em_aprovacao" | "aprovada" | "reprovada" | "substituida";
  conteudo_hash: string;
  comentario_submissao?: string | null;
  created_by: UUID;
  created_at: ISODateTime;
  decided_at?: ISODateTime | null;
  aprovacoes: Array<{
    id: UUID;
    decisao: "aprovado" | "reprovado";
    comentario?: string | null;
    decidido_por: UUID;
    assinatura_id?: UUID | null;
    decidido_at: ISODateTime;
  }>;
}

export interface DocumentWorkflow {
  documento: {
    id: UUID;
    workflow_status: "rascunho" | "em_aprovacao" | "aprovado" | "reprovado" | "arquivado";
    versao_atual: number;
    exige_aprovacao: boolean;
  } | null;
  revisoes: DocumentWorkflowRevision[];
}

export interface NotificationCenter {
  preferencias: {
    canais: string[];
    severidade_minima: "info" | "warning" | "critical";
    resumo_diario: boolean;
    hora_resumo: string;
    silencio_inicio?: string | null;
    silencio_fim?: string | null;
    timezone: string;
  } | null;
  regras: Array<{
    id: UUID;
    nome: string;
    evento: string;
    antecedencia_dias: number[];
    canais: string[];
    escalonar_apos_horas?: number | null;
    destinatarios_perfis: string[];
    ativa: boolean;
  }>;
  entregas_30d: { total: number; falhas: number; enviadas: number };
}

export interface DataQualityResult {
  resumo: { total: number; criticos: number; alertas: number };
  achados: Array<{
    id: UUID;
    regra_codigo: string;
    modulo: string;
    registro_id?: UUID | null;
    titulo: string;
    detalhes_json: Record<string, unknown>;
    severidade: "info" | "warning" | "critical";
    detectado_at: ISODateTime;
  }>;
}

export interface ScheduledReportsData {
  agendamentos: Array<{
    id: UUID;
    nome: string;
    tipo_relatorio: string;
    frequencia: "semanal" | "mensal";
    dia_semana?: number | null;
    dia_mes?: number | null;
    horario: string;
    timezone: string;
    destinatarios: string[];
    ativo: boolean;
    proxima_execucao_at: ISODateTime;
    ultima_execucao_at?: ISODateTime | null;
  }>;
  ultimas_execucoes: Array<{
    id: UUID;
    relatorio_agendado_id: UUID;
    status: "queued" | "processing" | "sent" | "failed" | "skipped";
    erro_codigo?: string | null;
    created_at: ISODateTime;
    completed_at?: ISODateTime | null;
  }>;
}

export interface ProfessionalFinanceSummary {
  mrr_centavos: number;
  arr_centavos: number;
  assinaturas_ativas: number;
  ticket_medio_centavos: number;
  churn_90d: number;
  recebiveis_vencidos_centavos: number;
  tentativas_30d: number;
  recuperadas_30d: number;
  cupons_ativos: number;
  mudancas_pendentes: number;
  aging: { ate_7_dias: number; de_8_a_30_dias: number; mais_30_dias: number };
  ultimas_tentativas: Array<{
    id: UUID;
    empresa_id: UUID;
    nome_fantasia: string;
    gateway: string;
    status: string;
    valor_centavos?: number | null;
    created_at: ISODateTime;
  }>;
}
