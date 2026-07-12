import { getSupabaseClient } from "@/lib/supabaseClient";

export function cloneMock<T>(value: T): T {
  return structuredClone(value);
}

export async function invokeRpc<T>(
  functionName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await getSupabaseClient().rpc(functionName, args);

  if (error) throw new Error(error.message);
  return data as T;
}
