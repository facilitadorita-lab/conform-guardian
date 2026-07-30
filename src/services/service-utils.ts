import { getSupabaseClient } from "@/lib/supabaseClient";

export interface PaginatedRpcResponse<T> {
  items?: T[];
  total?: number;
  limit?: number;
  offset?: number;
}

export function cloneMock<T>(value: T): T {
  return structuredClone(value);
}

export function extractRpcItems<T>(value: T[] | PaginatedRpcResponse<T> | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

export async function invokeRpc<T>(
  functionName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await getSupabaseClient().rpc(functionName, args);

  if (error) {
    if (error.message.includes("MFA_AAL2_REQUIRED")) {
      throw new Error(
        "Por segurança, confirme a autenticação em duas etapas (MFA) antes de concluir esta ação.",
      );
    }
    throw new Error(error.message);
  }
  return data as T;
}
