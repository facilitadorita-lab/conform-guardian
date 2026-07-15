import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { AuditoriaPage } from "@/pages/AuditoriaPage";

export const Route = createFileRoute("/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria - Conform Flow" }] }),
  component: () => (
    <PlanFeatureGate recurso="auditoria" nomeRecurso="Auditoria">
      <AuditoriaPage />
    </PlanFeatureGate>
  ),
});
