import { createFileRoute } from "@tanstack/react-router";
import { AuditoriaPage } from "@/pages/AuditoriaPage";

export const Route = createFileRoute("/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria - Conform Flow" }] }),
  component: AuditoriaPage,
});
