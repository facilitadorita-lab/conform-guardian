import { manutencoes } from "@/mocks";
import { requireSupabase, shouldUseMocks } from "./_supabase";

export const manutencoesService = {
  async list() {
    if (shouldUseMocks()) return manutencoes;
    const { data, error } = await requireSupabase()
      .from("manutencoes")
      .select("*")
      .is("deleted_at", null)
      .order("data_programada", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};