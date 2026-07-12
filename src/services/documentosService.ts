import { documentos } from "@/mocks";
import { requireSupabase, shouldUseMocks } from "./_supabase";

export const documentosService = {
  async list() {
    if (shouldUseMocks()) return documentos;
    const { data, error } = await requireSupabase()
      .from("documentos")
      .select("*")
      .is("deleted_at", null)
      .order("data_vencimento", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string) {
    if (shouldUseMocks()) return documentos.find((d) => d.id === id) ?? null;
    const { data, error } = await requireSupabase()
      .from("documentos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};