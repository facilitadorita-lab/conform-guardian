import { createFileRoute } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { UsuariosPage } from "@/pages/UsuariosPage";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários - Conform Flow" }] }),
  component: () => (
    <PlanFeatureGate recurso="usuarios" nomeRecurso="Usuários">
      <UsuariosPage />
    </PlanFeatureGate>
  ),
});
