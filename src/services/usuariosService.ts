import { usuarios } from "@/mocks";
import { requireSupabase, shouldUseMocks } from "./_supabase";

export const usuariosService = {
  async list() {
    if (shouldUseMocks()) return usuarios;
    const { data, error } = await requireSupabase()
      .from("usuarios_empresa")
      .select("id, perfil, setor, ativo, usuario:usuarios(id, nome, email)")
      .eq("ativo", true);
    if (error) throw error;
    return data ?? [];
  },
};