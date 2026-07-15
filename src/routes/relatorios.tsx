import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { RelatoriosPage } from "@/pages/RelatoriosPage";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios - Conform Flow" }] }),
  component: () => (
    <PlanFeatureGate recurso="relatorios" nomeRecurso="Relatórios">
      <RelatoriosPage />
    </PlanFeatureGate>
  ),
});
