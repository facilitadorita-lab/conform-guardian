import { runtimeConfig } from "@/lib/runtime-config";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { usuariosMock } from "@/mocks";
import type { UsuarioResumo } from "@/types";
import { cloneMock, invokeRpc } from "./service-utils";

export type PerfilUsuarioEmpresa =
  "administrador" | "responsavel_tecnico" | "colaborador" | "somente_leitura";

type UsuarioEmpresaRow = {
  perfil: PerfilUsuarioEmpresa;
  usuarios?:
    | {
        id: string;
        nome: string;
        email: string;
        cargo: string | null;
        status: "ativo" | "inativo";
      }
    | Array<{
        id: string;
        nome: string;
        email: string;
        cargo: string | null;
        status: "ativo" | "inativo";
      }>
    | null;
};

type UsuarioUnidadeAccess = {
  usuario_id: string;
  acesso_todas_unidades: boolean;
  unidade_principal_id: string | null;
  unidade_ids: string[];
};

const perfilLabel: Record<UsuarioEmpresaRow["perfil"], UsuarioResumo["perfil"]> = {
  administrador: "Administrador",
  responsavel_tecnico: "Responsavel tecnico",
  colaborador: "Colaborador",
  somente_leitura: "Somente leitura",
};

export const usuariosService = {
  async listar(empresaId: string): Promise<UsuarioResumo[]> {
    if (runtimeConfig.useMocks) return cloneMock(usuariosMock);

    const [memberships, unitAccess] = await Promise.all([
      getSupabaseClient()
        .from("usuarios_empresas")
        .select("perfil,usuarios(id,nome,email,cargo,status)")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .is("deleted_at", null),
      invokeRpc<UsuarioUnidadeAccess[]>("api_obter_acessos_usuarios_unidades", {
        p_empresa_id: empresaId,
      }).catch(() => []),
    ]);

    if (memberships.error) throw new Error(memberships.error.message);
    const accessByUser = new Map(unitAccess.map((access) => [access.usuario_id, access]));

    return ((memberships.data ?? []) as unknown as UsuarioEmpresaRow[])
      .map((vinculo) => ({ vinculo, usuario: firstUsuario(vinculo.usuarios) }))
      .filter((item) => Boolean(item.usuario))
      .map(({ vinculo, usuario }) => {
        const access = accessByUser.get(usuario!.id);
        return {
          id: usuario!.id,
          nome: usuario!.nome,
          email: usuario!.email,
          perfil: perfilLabel[vinculo.perfil],
          setor: usuario!.cargo ?? "-",
          status: usuario!.status === "ativo" ? "Ativo" : "Inativo",
          acessoTodasUnidades: access?.acesso_todas_unidades ?? true,
          unidadePrincipalId: access?.unidade_principal_id ?? null,
          unidadeIds: access?.unidade_ids ?? [],
        };
      });
  },

  atualizarPerfil(
    empresaId: string,
    usuarioId: string,
    payload: { perfil: PerfilUsuarioEmpresa; ativo: boolean },
  ) {
    return invokeRpc<{
      usuario_id: string;
      empresa_id: string;
      perfil: PerfilUsuarioEmpresa;
      ativo: boolean;
    }>("api_atualizar_usuario_empresa", {
      p_empresa_id: empresaId,
      p_usuario_id: usuarioId,
      p_payload: payload,
    });
  },

  atualizarPerfilEAcesso(
    empresaId: string,
    usuarioId: string,
    payload: {
      perfil: PerfilUsuarioEmpresa;
      ativo: boolean;
      acessoTodasUnidades: boolean;
      unidadeIds: string[];
      unidadePrincipalId: string | null;
    },
  ) {
    return invokeRpc("api_atualizar_usuario_empresa_multiunit", {
      p_empresa_id: empresaId,
      p_usuario_id: usuarioId,
      p_payload: { perfil: payload.perfil, ativo: payload.ativo },
      p_acesso_todas_unidades: payload.acessoTodasUnidades,
      p_unidade_ids: payload.unidadeIds,
      p_unidade_principal_id: payload.unidadePrincipalId,
    });
  },
};

function firstUsuario(usuario: UsuarioEmpresaRow["usuarios"]) {
  return Array.isArray(usuario) ? usuario[0] : usuario;
}
