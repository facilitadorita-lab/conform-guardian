import { createFileRoute } from "@tanstack/react-router";
import { MasterEmpresasPage } from "@/pages/MasterEmpresasPage";

export const Route = createFileRoute("/master/empresas")({
  head: () => ({ meta: [{ title: "Empresas Master - Conform Flow" }] }),
  component: MasterEmpresasPage,
});
