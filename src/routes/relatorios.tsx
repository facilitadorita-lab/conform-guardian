import { createFileRoute } from "@tanstack/react-router";
import { RelatoriosPage } from "@/pages/RelatoriosPage";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios - Conform Flow" }] }),
  component: RelatoriosPage,
});
