import { runtimeConfig } from "@/lib/runtime-config";
import type {
  Unidade,
  UnidadeFormPayload,
  UnidadeIndicadores,
  UnidadeListagem,
  UnidadeTransferencia,
  UUID,
} from "@/types";
import { invokeRpc } from "./service-utils";

const mockMatrix = (empresaId: UUID): UnidadeListagem => ({
  items: [
    {
      id: "00000000-0000-0000-0000-000000000901",
      empresa_id: empresaId,
      codigo: "MATRIZ",
      nome: "Matriz",
      tipo: "matriz",
      timezone: "America/Sao_Paulo",
      is_matriz: true,
      status: "ativa",
      usuarios: 4,
      documentos: 12,
      equipamentos: 5,
    },
  ],
  pode_visualizar_consolidado: true,
  pode_administrar: true,
  limites: {
    utilizadas: 1,
    limite: 3,
    disponiveis: 2,
    em_excesso: false,
    multiunidade_habilitada: true,
  },
});

export const unidadesService = {
  listar(empresaId: UUID): Promise<UnidadeListagem> {
    if (runtimeConfig.useMocks) return Promise.resolve(mockMatrix(empresaId));
    return invokeRpc<UnidadeListagem>("api_listar_unidades", {
      p_empresa_id: empresaId,
    });
  },

  obter(empresaId: UUID, unidadeId: UUID): Promise<Unidade> {
    return invokeRpc<Unidade>("api_obter_unidade", {
      p_empresa_id: empresaId,
      p_unidade_id: unidadeId,
    });
  },

  criar(empresaId: UUID, payload: UnidadeFormPayload): Promise<Unidade> {
    return invokeRpc<Unidade>("api_criar_unidade", {
      p_empresa_id: empresaId,
      p_payload: payload,
    });
  },

  atualizar(
    empresaId: UUID,
    unidadeId: UUID,
    payload: Partial<UnidadeFormPayload>,
  ): Promise<Unidade> {
    return invokeRpc<Unidade>("api_atualizar_unidade", {
      p_empresa_id: empresaId,
      p_unidade_id: unidadeId,
      p_payload: payload,
    });
  },

  alterarStatus(
    empresaId: UUID,
    unidadeId: UUID,
    status: Unidade["status"],
    motivo?: string,
  ): Promise<Unidade> {
    return invokeRpc<Unidade>("api_alterar_status_unidade", {
      p_empresa_id: empresaId,
      p_unidade_id: unidadeId,
      p_status: status,
      p_motivo: motivo ?? null,
    });
  },

  definirMatriz(empresaId: UUID, unidadeId: UUID): Promise<Unidade> {
    return invokeRpc<Unidade>("api_definir_unidade_matriz", {
      p_empresa_id: empresaId,
      p_unidade_id: unidadeId,
    });
  },

  obterIndicadores(empresaId: UUID, unidadeId: UUID): Promise<UnidadeIndicadores> {
    return invokeRpc<UnidadeIndicadores>("api_unidade_indicadores", {
      p_empresa_id: empresaId,
      p_unidade_id: unidadeId,
    });
  },

  registrarTroca(
    empresaId: UUID,
    unidadeAnteriorId: UUID | null,
    unidadeAtualId: UUID | null,
  ): Promise<void> {
    if (runtimeConfig.useMocks) return Promise.resolve();
    return invokeRpc<void>("api_registrar_troca_unidade", {
      p_empresa_id: empresaId,
      p_unidade_anterior_id: unidadeAnteriorId,
      p_unidade_atual_id: unidadeAtualId,
    });
  },

  salvarAcessoUsuario(input: {
    empresaId: UUID;
    usuarioId: UUID;
    acessoTodasUnidades: boolean;
    unidadeIds: UUID[];
    unidadePrincipalId?: UUID | null;
  }) {
    return invokeRpc("api_salvar_acesso_usuario_unidades", {
      p_empresa_id: input.empresaId,
      p_usuario_id: input.usuarioId,
      p_acesso_todas_unidades: input.acessoTodasUnidades,
      p_unidade_ids: input.unidadeIds,
      p_unidade_principal_id: input.unidadePrincipalId ?? null,
    });
  },

  transferirEquipamento(input: {
    empresaId: UUID;
    equipamentoId: UUID;
    unidadeDestinoId: UUID;
    motivo: string;
    responsavelId?: UUID | null;
    dataTransferencia?: string | null;
    observacoes?: string | null;
  }): Promise<UnidadeTransferencia> {
    return invokeRpc<UnidadeTransferencia>("api_transferir_equipamento_unidade", {
      p_empresa_id: input.empresaId,
      p_equipamento_id: input.equipamentoId,
      p_unidade_destino_id: input.unidadeDestinoId,
      p_motivo: input.motivo,
      p_responsavel_id: input.responsavelId ?? null,
      p_data_transferencia: input.dataTransferencia ?? null,
      p_observacoes: input.observacoes ?? null,
    });
  },
};
