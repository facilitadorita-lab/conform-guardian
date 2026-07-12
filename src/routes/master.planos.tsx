import { createFileRoute } from "@tanstack/react-router";
import { MasterPlanosPage } from "@/pages/MasterPlanosPage";

export const Route = createFileRoute("/master/planos")({
  head: () => ({ meta: [{ title: "Planos Master - Conform Flow" }] }),
  component: MasterPlanosPage,
});
