import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { AlertasPage } from "@/pages/AlertasPage";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas - Conform Flow" }] }),
  component: () => (
    <PlanFeatureGate recurso="alertas" nomeRecurso="Alertas">
      <AlertasPage />
    </PlanFeatureGate>
  ),
});
