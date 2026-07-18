const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const useMocksFlag = import.meta.env.VITE_USE_MOCKS;

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export const runtimeConfig = {
  // Produção segura: se Supabase estiver configurado, mocks ficam desligados por padrão.
  // Para prototipar localmente, use VITE_USE_MOCKS=true explicitamente.
  // Mocks may only be activated explicitly. If Supabase variables are absent,
  // the app remains without data instead of exposing mocks as production data.
  useMocks: readBool(useMocksFlag, false),
  supabaseUrl,
  supabaseAnonKey,
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey);
}

export function shouldUseMocks(): boolean {
  return runtimeConfig.useMocks;
}

export const MOCK_EMPRESA_ID = "empresa-mock-clinica-vitalis";
export const MOCK_USUARIO_ID = "usuario-mock-marina-alves";
