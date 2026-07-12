import { createFileRoute } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { masterProximosPagamentos } from "@/mocks/conformflow-mocks";

export const Route = createFileRoute("/master/proximos-pagamentos")({
  component: MasterProximosPagamentos,
});

function MasterProximosPagamentos() {
  const total = masterProximosPagamentos.reduce((s, p) => s + p.valor, 0);
  return (
    <MasterOnly title="Próximos pagamentos" description="Faturas previstas nos próximos ciclos de cobrança.">
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Receita prevista</div>
        <div className="text-2xl font-semibold mt-1">R$ {total.toLocaleString("pt-BR")}</div>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {masterProximosPagamentos.map((p) => (
              <tr key={`${p.empresa}-${p.vencimento}`} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{p.vencimento}</td>
                <td className="px-4 py-3 font-medium">{p.empresa}</td>
                <td className="px-4 py-3">{p.plano}</td>
                <td className="px-4 py-3">R$ {p.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MasterOnly>
  );
}