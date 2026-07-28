import { getSupabaseClient } from "@/lib/supabaseClient";

export const stripeService = {
  async abrirPortal(empresaId: string) {
    const { data, error } = await getSupabaseClient().functions.invoke<{ portal_url: string }>(
      "create-stripe-portal",
      { body: { empresa_id: empresaId } },
    );
    if (error) throw error;
    if (!data?.portal_url) throw new Error("Não foi possível abrir o portal financeiro.");
    return data.portal_url;
  },
};
