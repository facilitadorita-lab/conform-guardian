import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  CriticalActionRequest,
  IntelligentOnboarding,
  LgpdExportRequest,
  RetentionPolicy,
} from "@/types";
import { invokeRpc } from "./service-utils";

export const governanceService = {
  onboarding(companyId: string) {
    return invokeRpc<IntelligentOnboarding>("api_onboarding_inteligente", {
      p_empresa_id: companyId,
    });
  },

  requestExport(companyId: string) {
    return invokeRpc<LgpdExportRequest>("api_solicitar_exportacao_lgpd", {
      p_empresa_id: companyId,
      p_escopo: ["all"],
    });
  },

  async listExports(companyId: string) {
    const { data, error } = await getSupabaseClient()
      .from("solicitacoes_exportacao_lgpd")
      .select("id, empresa_id, status, expira_em, erro_codigo, created_at, processed_at")
      .eq("empresa_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data as LgpdExportRequest[];
  },

  async downloadExport(requestId: string) {
    const { data, error } = await getSupabaseClient().functions.invoke<{ signed_url: string }>(
      "download-lgpd-export",
      { body: { request_id: requestId } },
    );
    if (error || !data?.signed_url) throw error ?? new Error("Link de exportação indisponível.");
    return data.signed_url;
  },

  async listRetention(companyId: string) {
    const { data, error } = await getSupabaseClient()
      .from("politicas_retencao_empresa")
      .select(
        "id, empresa_id, modulo, retention_months, legal_hold, descarte_automatico, justificativa",
      )
      .eq("empresa_id", companyId)
      .order("modulo");
    if (error) throw error;
    return data as RetentionPolicy[];
  },

  async saveRetention(policy: RetentionPolicy) {
    const { data, error } = await getSupabaseClient()
      .from("politicas_retencao_empresa")
      .upsert(policy, { onConflict: "empresa_id,modulo" })
      .select(
        "id, empresa_id, modulo, retention_months, legal_hold, descarte_automatico, justificativa",
      )
      .single();
    if (error) throw error;
    return data as RetentionPolicy;
  },

  async listCriticalActions(companyId: string) {
    const { data, error } = await getSupabaseClient()
      .from("solicitacoes_acao_critica")
      .select(
        "id, empresa_id, action_type, target_type, target_id, justification, status, requested_by, approved_by, requested_at, decided_at, expires_at, decision_notes",
      )
      .eq("empresa_id", companyId)
      .order("requested_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data as CriticalActionRequest[];
  },

  requestCriticalAction(input: {
    companyId: string;
    actionType: CriticalActionRequest["action_type"];
    targetType: string;
    targetId?: string | null;
    payload?: Record<string, unknown>;
    justification: string;
  }) {
    return invokeRpc<CriticalActionRequest>("api_solicitar_acao_critica", {
      p_empresa_id: input.companyId,
      p_action_type: input.actionType,
      p_target_type: input.targetType,
      p_target_id: input.targetId ?? null,
      p_payload: input.payload ?? {},
      p_justification: input.justification,
    });
  },

  decideCriticalAction(requestId: string, approve: boolean, notes?: string) {
    return invokeRpc<CriticalActionRequest>("api_decidir_acao_critica", {
      p_solicitacao_id: requestId,
      p_approve: approve,
      p_notes: notes ?? null,
    });
  },
};
