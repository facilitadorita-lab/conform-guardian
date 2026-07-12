import { requireSupabase, shouldUseMocks } from "./_supabase";

// Operações restritas ao Admin Master (multi-empresa).
// Toda escrita crítica deve ser feita via RPC/Edge Function no backend.
export const adminMasterService = {
  async listEmpresas() {
    if (shouldUseMocks()) {
      return [
        { id: "mock-empresa", cnpj: "12.345.678/0001-90", razao_social: "Clínica Vitalis Ltda.", ativo: true },
      ];
    }
    const { data, error } = await requireSupabase()
      .from("empresas")
      .select("*")
      .order("razao_social", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async impersonateEmpresa(_empresaId: string) {
    if (shouldUseMocks()) return { ok: true };
    // TODO(supabase): RPC dedicada com log de auditoria imutável.
    throw new Error("impersonateEmpresa: implementar via RPC segura no backend.");
  },
};