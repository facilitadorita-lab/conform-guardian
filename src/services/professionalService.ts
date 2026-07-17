import type {
  DataQualityResult,
  DocumentWorkflow,
  NotificationCenter,
  PermissionMatrix,
  ProfessionalFinanceSummary,
  ScheduledReportsData,
} from "@/types";
import { invokeRpc } from "./service-utils";
import { getSupabaseClient } from "@/lib/supabaseClient";

export const professionalService = {
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
  rotateEquipmentQr(companyId: string, equipmentId: string) {
    return invokeRpc<{ qr_token: string }>("api_rotacionar_qr_equipamento", {
      p_empresa_id: companyId,
      p_equipamento_id: equipmentId,
    });
  },
  async getEquipmentQrToken(companyId: string, equipmentId: string) {
    const { data, error } = await getSupabaseClient().from("equipamentos").select("qr_token")
      .eq("empresa_id", companyId).eq("id", equipmentId).is("deleted_at", null).single();
    if (error) throw new Error(error.message);
    return String(data.qr_token);
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
};
