import { requireSupabase, shouldUseMocks } from "./_supabase";

export const authService = {
  async getSession() {
    if (shouldUseMocks()) {
      return {
        user: { id: "mock-user", email: "marina.alves@empresa.com", nome: "Marina Alves" },
        empresa_id: "mock-empresa",
      };
    }
    const { data, error } = await requireSupabase().auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async signInWithPassword(email: string, password: string) {
    if (shouldUseMocks()) return { user: { id: "mock-user", email } };
    const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (shouldUseMocks()) return;
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  },
};