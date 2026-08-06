import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { FiscalizacaoPage } from "@/pages/FiscalizacaoPage";

export const Route = createFileRoute("/fiscalizacao")({
  head: () => ({ meta: [{ title: "Modo fiscalização - Conform Flow" }] }),
  component: () => (
    <PlanFeatureGate recurso="auditoria" nomeRecurso="Modo fiscalização">
      <FiscalizacaoPage />
    </PlanFeatureGate>
  ),
});
