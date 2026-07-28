import type {
  DataQualityResult,
  DocumentWorkflow,
  NotificationCenter,
  PermissionMatrix,
  ProfessionalFinanceSummary,
  ScheduledReportsData,
} from "@/types";
import { invokeRpc } from "./service-utils";

export const professionalService = {
  tenantIsolationSuite(companyId?: string | null) {
    return invokeRpc<{
      id: string;
      status: "passed" | "failed" | "warning";
      total_checks: number;
      failed_checks: number;
      checks: Array<{ codigo: string; status: string; inconsistencias: number }>;
      executed_at: string;
    }>("api_master_testar_isolamento", { p_empresa_id: companyId ?? null });
  },
  permissionMatrix(companyId: string) {
    return invokeRpc<PermissionMatrix>("api_matriz_permissoes_empresa", {
      p_empresa_id: companyId,
    });
  },
  saveUserPermissions(
    companyId: string,
    userId: string,
    permissions: Record<string, boolean>,
    reason: string,
  ) {
    return invokeRpc<{ ok: boolean }>("api_salvar_permissoes_usuario", {
      p_empresa_id: companyId,
      p_usuario_id: userId,
      p_permissoes: permissions,
      p_justificativa: reason,
    });
  },
  documentWorkflow(companyId: string, documentId: string) {
    return invokeRpc<DocumentWorkflow>("api_documento_workflow", {
      p_empresa_id: companyId,
      p_documento_id: documentId,
    });
  },
  submitDocument(companyId: string, documentId: string, comment?: string) {
    return invokeRpc("api_documento_enviar_aprovacao", {
      p_empresa_id: companyId,
      p_documento_id: documentId,
      p_comentario: comment || null,
    });
  },
  decideDocument(
    companyId: string,
    revisionId: string,
    decision: "aprovado" | "reprovado",
    comment: string,
    statement?: string,
  ) {
    return invokeRpc("api_documento_decidir_aprovacao", {
      p_empresa_id: companyId,
      p_revisao_id: revisionId,
      p_decisao: decision,
      p_comentario: comment || null,
      p_declaracao: statement || null,
      p_user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
    });
  },
  notificationCenter(companyId: string) {
    return invokeRpc<NotificationCenter>("api_central_notificacoes", {
      p_empresa_id: companyId,
    });
  },
  saveNotificationPreferences(companyId: string, payload: Record<string, unknown>) {
    return invokeRpc("api_salvar_preferencias_notificacao", {
      p_empresa_id: companyId,
      p_payload: payload,
    });
  },
  saveNotificationRule(companyId: string, payload: Record<string, unknown>) {
    return invokeRpc("api_salvar_regra_notificacao", {
      p_empresa_id: companyId,
      p_payload: payload,
    });
  },
  dataQuality(companyId: string) {
    return invokeRpc<DataQualityResult>("api_qualidade_dados", { p_empresa_id: companyId });
  },
  runDataQuality(companyId: string) {
    return invokeRpc<DataQualityResult>("api_executar_qualidade_dados", {
      p_empresa_id: companyId,
    });
  },
  scheduledReports(companyId: string) {
    return invokeRpc<ScheduledReportsData>("api_listar_relatorios_agendados", {
      p_empresa_id: companyId,
    });
  },
  saveScheduledReport(companyId: string, payload: Record<string, unknown>) {
    return invokeRpc("api_salvar_relatorio_agendado", {
      p_empresa_id: companyId,
      p_payload: payload,
    });
  },
  resolveEquipmentQr(token: string) {
    return invokeRpc<{ empresa_id: string; equipamento_id: string; nome: string; codigo: string }>(
      "api_resolver_qr_equipamento",
      { p_qr_token: token },
    );
  },
  rotateEquipmentQr(equipmentId: string) {
    return invokeRpc<{ qr_token: string }>("api_rotacionar_qr_equipamento", {
      p_equipamento_id: equipmentId,
    });
  },
  async getEquipmentQrToken(equipmentId: string) {
    const data = await invokeRpc<{ qr_token: string }>("api_obter_qr_equipamento", {
      p_equipamento_id: equipmentId,
    });
    return data.qr_token;
  },
  professionalFinance() {
    return invokeRpc<ProfessionalFinanceSummary>("api_master_financeiro_profissional");
  },
  exportAudit(companyId: string) {
    return invokeRpc<Record<string, unknown>>("api_exportar_auditoria", {
      p_empresa_id: companyId,
      p_inicio: null,
      p_fim: null,
    });
  },
  isolationDiagnostic(companyId: string) {
    return invokeRpc<{
      empresa_id: string;
      isolamento_ok: boolean;
      registros_sem_empresa: number;
      anexos_com_empresa_inconsistente: number;
      checks: Array<{ tabela: string; registros_empresa: number }>;
      executado_em: string;
    }>("api_diagnostico_isolamento", { p_empresa_id: companyId });
  },
  segmentAssessment(companyId: string) {
    return invokeRpc<{
      empresa_id: string;
      segmento: string | null;
      tipo_estabelecimento: string | null;
      cnae: string | null;
      confianca: "alta" | "media" | "baixa";
      chaves_documentais: string[];
      analise_ia: string[];
      recomendacoes: string[];
      matriz_documental: Record<string, unknown>;
      politica: { leu_anexos: boolean; fonte: string };
    }>("api_avaliar_segmento_ia", { p_empresa_id: companyId });
  },
  calendar(companyId: string, start: string, end: string) {
    return invokeRpc<
      Array<{
        id: string;
        modulo: string;
        titulo: string;
        vencimento: string;
        responsavel_id: string | null;
        status: string;
      }>
    >("api_calendario_vencimentos", {
      p_empresa_id: companyId,
      p_inicio: start,
      p_fim: end,
    });
  },
};
