import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { VencimentosPage } from "@/pages/VencimentosPage";

export const Route = createFileRoute("/vencimentos")({
  head: () => ({ meta: [{ title: "Central de Vencimentos - Conform Flow" }] }),
  component: () => (
    <PlanFeatureGate recurso="vencimentos" nomeRecurso="Vencimentos">
      <VencimentosPage />
    </PlanFeatureGate>
  ),
});
