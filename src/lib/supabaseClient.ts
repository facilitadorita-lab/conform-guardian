import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runtimeConfig } from "./runtime-config";

export const isSupabaseConfigured = Boolean(
  runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey,
);

export const supabaseClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(runtimeConfig.supabaseUrl!, runtimeConfig.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error(
      "Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    );
  }

  return supabaseClient;
}
