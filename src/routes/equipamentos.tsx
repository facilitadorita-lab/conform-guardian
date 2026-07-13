import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { EquipamentosPage } from "@/pages/EquipamentosPage";

export const Route = createFileRoute("/equipamentos")({
  head: () => ({ meta: [{ title: "Equipamentos - Conform Flow" }] }),
  component: EquipamentosRoute,
});

function EquipamentosRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname === "/equipamentos") {
    return <EquipamentosPage />;
  }

  return <Outlet />;
}
