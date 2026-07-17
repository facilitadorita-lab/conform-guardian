import { createFileRoute } from "@tanstack/react-router";
import { EquipamentoDetalhePage } from "@/pages/EquipamentoDetalhePage";

export const Route = createFileRoute("/equipamentos/$id")({
  component: EquipamentoDetalheRoute,
});

function EquipamentoDetalheRoute() {
  const { id } = Route.useParams();
  return <EquipamentoDetalhePage id={id} />;
}
