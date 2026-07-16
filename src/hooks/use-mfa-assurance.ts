import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useAppSession } from "./use-app-session";

export interface MfaAssuranceState {
  currentLevel: "aal1" | "aal2" | null;
  nextLevel: "aal1" | "aal2" | null;
  verifiedFactorId: string | null;
  hasVerifiedFactor: boolean;
}

export function useMfaAssurance() {
  const { user } = useAppSession();
  return useQuery({
    queryKey: ["auth", "mfa-assurance", user?.id],
    queryFn: loadMfaAssurance,
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

export async function loadMfaAssurance(): Promise<MfaAssuranceState> {
  const supabase = getSupabaseClient();
  const [{ data: aal, error: aalError }, { data: factors, error: factorsError }] =
    await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
  if (aalError) throw aalError;
  if (factorsError) throw factorsError;
  const verified = factors.totp.find((factor) => factor.status === "verified") ?? null;
  return {
    currentLevel: normalizeAal(aal.currentLevel),
    nextLevel: normalizeAal(aal.nextLevel),
    verifiedFactorId: verified?.id ?? null,
    hasVerifiedFactor: Boolean(verified),
  };
}

function normalizeAal(value: string | null): "aal1" | "aal2" | null {
  return value === "aal1" || value === "aal2" ? value : null;
}
