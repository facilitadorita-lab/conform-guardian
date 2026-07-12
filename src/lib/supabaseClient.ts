import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runtimeConfig, isSupabaseConfigured } from "./runtime-config";

// Client único do Supabase para o frontend do Conform Flow.
// As chaves vêm de variáveis de ambiente (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// Nunca hardcodar credenciais neste arquivo.

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

// Acesso direto para telas que já assumem Supabase disponível.
// Retorna null quando as envs não estão preenchidas — checar antes de usar.
export const supabase = getSupabaseClient();