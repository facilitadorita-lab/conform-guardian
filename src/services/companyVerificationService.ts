import type {
  AdminVerificationQueue,
  CompanyVerificationStatusView,
  EffectiveCompanyPermissions,
  UUID,
} from "@/types";
import { invokeRpc } from "./service-utils";

export interface AdminVerificationFilters {
  status?: string;
  risco?: string;
  analista_id?: UUID;
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
  limit?: number;
  offset?: number;
}

export interface AdminVerificationDetail {
  empresa: Record<string, unknown>;
  solicitacao: Record<string, unknown>;
  evidencias: Array<Record<string, unknown>>;
  historico: Array<Record<string, unknown>>;
  ambiente_provisorio: Record<string, unknown>;
  atividades_recentes: Array<Record<string, unknown>>;
}

export const companyVerificationService = {
  obterPermissoes(empresaId: UUID) {
    return invokeRpc<EffectiveCompanyPermissions>("get_effective_company_permissions", {
      p_empresa_id: empresaId,
    });
  },

  obterStatus(empresaId: UUID) {
    return invokeRpc<CompanyVerificationStatusView>("api_status_verificacao_empresa", {
      p_empresa_id: empresaId,
    });
  },

  concederAcessoProvisorio(empresaId: UUID) {
    return invokeRpc<EffectiveCompanyPermissions>("api_conceder_acesso_provisorio", {
      p_empresa_id: empresaId,
    });
  },

  enviarInformacoes(solicitacaoId: UUID, comment?: string) {
    return invokeRpc<Record<string, unknown>>("api_enviar_informacoes_verificacao", {
      p_solicitacao_id: solicitacaoId,
      p_comment: comment ?? null,
    });
  },

  solicitarAcessoEmpresa(cnpj: string, message: string, idempotencyKey: string) {
    return invokeRpc<{ received: true; message: string }>(
      "api_solicitar_acesso_empresa_existente",
      {
        p_cnpj: cnpj,
        p_message: message,
        p_idempotency_key: idempotencyKey,
      },
    );
  },

  listarFila(filters: AdminVerificationFilters = {}) {
    return invokeRpc<AdminVerificationQueue>("api_master_fila_verificacoes", {
      p_filtros: filters,
    });
  },

  obterDetalheAdmin(solicitacaoId: UUID) {
    return invokeRpc<AdminVerificationDetail>("api_master_detalhe_verificacao", {
      p_solicitacao_id: solicitacaoId,
    });
  },

  assumirAnalise(solicitacaoId: UUID) {
    return invokeRpc<Record<string, unknown>>("api_master_assumir_verificacao", {
      p_solicitacao_id: solicitacaoId,
    });
  },

  solicitarInformacoes(
    solicitacaoId: UUID,
    message: string,
    items: unknown[] = [],
    dueAt?: string,
  ) {
    return invokeRpc<Record<string, unknown>>("api_master_solicitar_informacoes_verificacao", {
      p_solicitacao_id: solicitacaoId,
      p_message: message,
      p_items: items,
      p_due_at: dueAt ?? null,
    });
  },

  aprovar(solicitacaoId: UUID, reviewNotes?: string) {
    return invokeRpc<EffectiveCompanyPermissions>("api_master_aprovar_empresa", {
      p_solicitacao_id: solicitacaoId,
      p_review_notes: reviewNotes ?? null,
    });
  },

  rejeitar(
    solicitacaoId: UUID,
    category: string,
    reason: string,
    options: { reviewNotes?: string; blockAccess?: boolean } = {},
  ) {
    return invokeRpc<{ verification_status: "rejected"; access_status: string }>(
      "api_master_rejeitar_empresa",
      {
        p_solicitacao_id: solicitacaoId,
        p_category: category,
        p_reason: reason,
        p_review_notes: options.reviewNotes ?? null,
        p_block_access: options.blockAccess ?? false,
      },
    );
  },

  alterarAcesso(empresaId: UUID, accessStatus: string, reason: string) {
    return invokeRpc<{ empresa_id: UUID; access_status: string }>(
      "api_master_alterar_acesso_empresa",
      {
        p_empresa_id: empresaId,
        p_access_status: accessStatus,
        p_reason: reason,
      },
    );
  },

  salvarLimitesProvisorios(payload: Record<string, unknown>) {
    return invokeRpc<Record<string, unknown>>("api_master_salvar_limites_provisorios", {
      p_payload: payload,
    });
  },

  marcarNotificacaoLida(notificacaoId: UUID) {
    return invokeRpc<void>("api_marcar_notificacao_lida", {
      p_notificacao_id: notificacaoId,
    });
  },
};
