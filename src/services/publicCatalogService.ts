import type { PublicCommercialCatalog } from "@/types";
import { invokeRpc } from "./service-utils";

export const publicCatalogService = {
  obter(): Promise<PublicCommercialCatalog> {
    return invokeRpc<PublicCommercialCatalog>("api_public_catalogo_planos");
  },
};
