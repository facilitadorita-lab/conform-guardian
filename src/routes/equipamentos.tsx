import { createFileRoute } from "@tanstack/react-router";
import { EquipamentosPage } from "@/pages/EquipamentosPage";

export const Route = createFileRoute("/equipamentos")({
  head: () => ({ meta: [{ title: "Equipamentos - Conform Flow" }] }),
  component: EquipamentosPage,
});
