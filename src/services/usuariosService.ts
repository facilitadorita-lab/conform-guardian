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

const perfilLabel: Record<UsuarioEmpresaRow["perfil"], UsuarioResumo["perfil"]> = {
  administrador: "Administrador",
  responsavel_tecnico: "Responsavel tecnico",
  colaborador: "Colaborador",
  somente_leitura: "Somente leitura",
};

export const usuariosService = {
  async listar(empresaId: string): Promise<UsuarioResumo[]> {
    if (runtimeConfig.useMocks) return cloneMock(usuariosMock);

    const { data, error } = await getSupabaseClient()
      .from("usuarios_empresas")
      .select("perfil,usuarios(id,nome,email,cargo,status)")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    return ((data ?? []) as unknown as UsuarioEmpresaRow[])
      .map((vinculo) => ({ vinculo, usuario: firstUsuario(vinculo.usuarios) }))
      .filter((item) => Boolean(item.usuario))
      .map(({ vinculo, usuario }) => ({
        id: usuario!.id,
        nome: usuario!.nome,
        email: usuario!.email,
        perfil: perfilLabel[vinculo.perfil],
        setor: usuario!.cargo ?? "-",
        status: usuario!.status === "ativo" ? "Ativo" : "Inativo",
      }));
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
};

function firstUsuario(usuario: UsuarioEmpresaRow["usuarios"]) {
  return Array.isArray(usuario) ? usuario[0] : usuario;
}
