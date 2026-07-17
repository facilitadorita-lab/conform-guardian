// Helpers compartilhados entre os services.
import { shouldUseMocks } from "@/lib/runtime-config";
import { getSupabaseClient } from "@/lib/supabaseClient";

export { shouldUseMocks };

export function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ou ative VITE_USE_MOCKS=true.",
    );
  }
  return client;
}
