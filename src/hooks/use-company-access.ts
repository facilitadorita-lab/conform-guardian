import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "./use-conform-data";
import { companyVerificationService } from "@/services/companyVerificationService";

export function useCompanyAccess() {
  const auth = useAuthContext();
  const empresaId = auth.data?.empresaAtual.id;

  return useQuery({
    queryKey: ["company-access", empresaId],
    queryFn: () => companyVerificationService.obterPermissoes(empresaId!),
    enabled: Boolean(empresaId),
    staleTime: 30_000,
  });
}

export function useCompanyVerificationStatus() {
  const auth = useAuthContext();
  const empresaId = auth.data?.empresaAtual.id;

  return useQuery({
    queryKey: ["company-verification", empresaId],
    queryFn: () => companyVerificationService.obterStatus(empresaId!),
    enabled: Boolean(empresaId),
    staleTime: 30_000,
  });
}
