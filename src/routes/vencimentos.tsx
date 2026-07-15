import { createFileRoute } from "@tanstack/react-router";
import { VencimentosPage } from "@/pages/VencimentosPage";

export const Route = createFileRoute("/vencimentos")({
  head: () => ({ meta: [{ title: "Central de Vencimentos - Conform Flow" }] }),
  component: VencimentosPage,
});
