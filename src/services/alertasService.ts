import { alertas } from "@/mocks";
import { requireSupabase, shouldUseMocks } from "./_supabase";

export const alertasService = {
  async list() {
    if (shouldUseMocks()) return alertas;
    const { data, error } = await requireSupabase()
      .from("alertas")
      .select("*")
      .order("data_disparo", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};