import { kpis, pendenciasCriticas } from "@/mocks";
import { requireSupabase, shouldUseMocks } from "./_supabase";

export const dashboardService = {
  async getKpis() {
    if (shouldUseMocks()) return kpis;
    // TODO(supabase): substituir por RPC agregada (ex.: rpc('dashboard_kpis')).
    const supabase = requireSupabase();
    const { data, error } = await supabase.rpc("dashboard_kpis");
    if (error) throw error;
    return data as typeof kpis;
  },

  async getPendenciasCriticas() {
    if (shouldUseMocks()) return pendenciasCriticas;
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("pendencias")
      .select("*")
      .in("status", ["vencido", "critico"])
      .order("data_vencimento", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};