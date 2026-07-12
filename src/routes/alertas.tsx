import { createFileRoute } from "@tanstack/react-router";
import { AlertasPage } from "@/pages/AlertasPage";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas - Conform Flow" }] }),
  component: AlertasPage,
});
