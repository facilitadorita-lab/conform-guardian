export interface IntelligentOnboarding {
  empresa_id: string;
  percentual: number;
  etapas: Array<{ key: string; label: string; complete: boolean }>;
  recomendacao_ia: string;
  fonte: "dados_estruturados_sem_leitura_de_anexos";
}

export interface LgpdExportRequest {
  id: string;
  empresa_id: string;
  status: "pending" | "processing" | "ready" | "failed" | "expired";
  expira_em: string | null;
  erro_codigo: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface RetentionPolicy {
  id?: string;
  empresa_id: string;
  modulo: "documentos" | "equipamentos" | "manutencoes" | "auditoria" | "anexos" | "usuarios";
  retention_months: number;
  legal_hold: boolean;
  descarte_automatico: boolean;
  justificativa?: string | null;
}

export interface CommercialHistoryEntry {
  id: string;
  empresa_id: string | null;
  entidade: "plano" | "assinatura" | "fatura" | "contratacao";
  entidade_id: string | null;
  evento: "insert" | "update" | "delete";
  valor_anterior: Record<string, unknown> | null;
  valor_novo: Record<string, unknown> | null;
  origem: string;
  actor_user_id: string | null;
  actor_role: string | null;
  created_at: string;
}

export interface CriticalActionRequest {
  id: string;
  empresa_id: string | null;
  action_type:
    | "delete_evidence"
    | "replace_evidence"
    | "mass_delete"
    | "export_sensitive"
    | "change_billing"
    | "block_company";
  target_type: string;
  target_id: string | null;
  justification: string;
  status: "pending" | "approved" | "rejected" | "executed" | "expired" | "canceled";
  requested_by: string;
  approved_by: string | null;
  requested_at: string;
  decided_at: string | null;
  expires_at: string;
  decision_notes: string | null;
}
