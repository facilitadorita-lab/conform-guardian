import { equipamentos } from "@/mocks";
import { requireSupabase, shouldUseMocks } from "./_supabase";

export const equipamentosService = {
  async list() {
    if (shouldUseMocks()) return equipamentos;
    const { data, error } = await requireSupabase()
      .from("equipamentos")
      .select("*")
      .is("deleted_at", null)
      .order("nome", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string) {
    if (shouldUseMocks()) return equipamentos.find((e) => e.id === id) ?? null;
    const { data, error } = await requireSupabase()
      .from("equipamentos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};