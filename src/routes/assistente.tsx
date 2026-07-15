import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { AssistentePage } from "@/pages/AssistentePage";

export const Route = createFileRoute("/assistente")({
  component: () => (
    <PlanFeatureGate recurso="assistente_ia" nomeRecurso="Assistente IA">
      <AssistentePage />
    </PlanFeatureGate>
  ),
});
