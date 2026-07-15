import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { EquipamentosPage } from "@/pages/EquipamentosPage";

export const Route = createFileRoute("/equipamentos")({
  head: () => ({ meta: [{ title: "Equipamentos - Conform Flow" }] }),
  component: EquipamentosRoute,
});

function EquipamentosRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <PlanFeatureGate recurso="equipamentos" nomeRecurso="Equipamentos">
      {pathname === "/equipamentos" ? <EquipamentosPage /> : <Outlet />}
    </PlanFeatureGate>
  );
}
