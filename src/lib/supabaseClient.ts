import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runtimeConfig } from "./runtime-config";

export const isSupabaseConfigured = Boolean(
  runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey,
);

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    // New-format Supabase keys are opaque, not JWTs — PostgREST rejects them
    // as bearer tokens with "Expected 3 parts in JWT; got 1".
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const supabaseClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(runtimeConfig.supabaseUrl!, runtimeConfig.supabaseAnonKey!, {
      global: {
        fetch: createSupabaseFetch(runtimeConfig.supabaseAnonKey!),
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error("Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }

  return supabaseClient;
}
