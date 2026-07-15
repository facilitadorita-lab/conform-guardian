import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { ManutencoesPage } from "@/pages/ManutencoesPage";

export const Route = createFileRoute("/manutencoes")({
  head: () => ({ meta: [{ title: "Manutenções - Conform Flow" }] }),
  component: () => (
    <PlanFeatureGate recurso="manutencoes" nomeRecurso="Manutenções">
      <ManutencoesPage />
    </PlanFeatureGate>
  ),
});
