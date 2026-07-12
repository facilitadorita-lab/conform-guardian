import { pendenciasCriticas } from "@/mocks";
import { requireSupabase, shouldUseMocks } from "./_supabase";

export const pendenciasService = {
  async list() {
    if (shouldUseMocks()) return pendenciasCriticas;
    const { data, error } = await requireSupabase()
      .from("pendencias")
      .select("*")
      .order("data_vencimento", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};