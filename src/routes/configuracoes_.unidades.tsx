import { createFileRoute } from "@tanstack/react-router";
import { UnidadesPage } from "@/pages/UnidadesPage";

export const Route = createFileRoute("/configuracoes_/unidades")({
  head: () => ({ meta: [{ title: "Unidades - Conform Flow" }] }),
  component: UnidadesPage,
});
