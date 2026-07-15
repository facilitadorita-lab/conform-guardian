import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { DocumentosPage } from "@/pages/DocumentosPage";

export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [{ title: "Documentos - Conform Flow" }] }),
  component: () => (
    <PlanFeatureGate recurso="documentos" nomeRecurso="Documentos">
      <DocumentosPage />
    </PlanFeatureGate>
  ),
});
