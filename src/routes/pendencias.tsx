import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { PendenciasPage } from "@/pages/PendenciasPage";

export const Route = createFileRoute("/pendencias")({
  head: () => ({ meta: [{ title: "Pendências - Conform Flow" }] }),
  component: () => (
    <PlanFeatureGate recurso="pendencias" nomeRecurso="Pendências">
      <PendenciasPage />
    </PlanFeatureGate>
  ),
});
