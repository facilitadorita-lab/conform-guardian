import { createFileRoute } from "@tanstack/react-router";
import { ManutencoesPage } from "@/pages/ManutencoesPage";

export const Route = createFileRoute("/manutencoes")({
  head: () => ({ meta: [{ title: "Manutenções - Conform Flow" }] }),
  component: ManutencoesPage,
});
