// Configuração de runtime do frontend Conform Flow.
// Controla se os services devolvem dados mockados (src/mocks) ou
// falam com o backend real (Supabase) via src/lib/supabaseClient.ts.

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

export const runtimeConfig = {
  // Enquanto o backend Supabase não está pronto, mocks ficam ligados por padrão.
  useMocks: readBool(import.meta.env.VITE_USE_MOCKS as string | undefined, true),
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "",
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "",
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey);
}

export function shouldUseMocks(): boolean {
  // Se mocks estão explicitamente ligados, usa mocks.
  // Se estão desligados mas o Supabase não foi configurado, cai em mocks para não quebrar a UI.
  return runtimeConfig.useMocks || !isSupabaseConfigured();
}