import type { PublicCommercialCatalog, PublicPartnerCatalogItem } from "@/types";
import { invokeRpc } from "./service-utils";

export const publicCatalogService = {
  obter(): Promise<PublicCommercialCatalog> {
    return invokeRpc<PublicCommercialCatalog>("api_public_catalogo_planos");
  },

  obterParceiros(): Promise<PublicPartnerCatalogItem[]> {
    return invokeRpc<PublicPartnerCatalogItem[]>("api_public_catalogo_parceiros");
  },
};
