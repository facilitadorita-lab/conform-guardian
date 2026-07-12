import { createFileRoute } from "@tanstack/react-router";
import { PendenciasPage } from "@/pages/PendenciasPage";

export const Route = createFileRoute("/pendencias")({
  head: () => ({ meta: [{ title: "Pendências - Conform Flow" }] }),
  component: PendenciasPage,
});
