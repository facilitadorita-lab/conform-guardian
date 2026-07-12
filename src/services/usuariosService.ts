import { runtimeConfig } from "@/lib/runtime-config";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { usuariosMock } from "@/mocks";
import type { UsuarioResumo } from "@/types";
import { cloneMock } from "./service-utils";

type UsuarioEmpresaRow = {
  perfil: "administrador" | "responsavel_tecnico" | "colaborador" | "somente_leitura";
  usuarios?: {
    id: string;
    nome: string;
    email: string;
    cargo: string | null;
    status: "ativo" | "inativo";
  } | null;
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

    return ((data ?? []) as UsuarioEmpresaRow[])
      .filter((vinculo) => Boolean(vinculo.usuarios))
      .map((vinculo) => ({
        id: vinculo.usuarios!.id,
        nome: vinculo.usuarios!.nome,
        email: vinculo.usuarios!.email,
        perfil: perfilLabel[vinculo.perfil],
        setor: vinculo.usuarios!.cargo ?? "-",
        status: vinculo.usuarios!.status === "ativo" ? "Ativo" : "Inativo",
      }));
  },
};
