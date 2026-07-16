import { useQuery } from "@tanstack/react-query";
import { publicCatalogService } from "@/services/publicCatalogService";

export function usePublicCatalog() {
  return useQuery({
    queryKey: ["public", "commercial-catalog"],
    queryFn: () => publicCatalogService.obter(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
