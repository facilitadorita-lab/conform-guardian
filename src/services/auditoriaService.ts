import { auditoriaLogs } from "@/mocks";
import { requireSupabase, shouldUseMocks } from "./_supabase";

export const auditoriaService = {
  async list() {
    if (shouldUseMocks()) return auditoriaLogs;
    const { data, error } = await requireSupabase()
      .from("logs_auditoria")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  },
};