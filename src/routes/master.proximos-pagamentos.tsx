import { createFileRoute } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { useMasterFinanceiroResumo } from "@/hooks/use-conform-data";
import { formatDateBR } from "@/utils/date";
import { formatCurrencyFromCents } from "@/utils/money";

export const Route = createFileRoute("/master/proximos-pagamentos")({
  component: MasterProximosPagamentos,
});
function MasterProximosPagamentos() {
  const query = useMasterFinanceiroResumo();
  const items = query.data?.proximos_pagamentos ?? [];
  const total = items.reduce((sum, item) => sum + item.valor_centavos, 0);
  return (
    <MasterOnly
      title="Próximos pagamentos"
      description="Previsão de cobranças calculada pelo backend."
    >
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Receita prevista
        </div>
        <div className="mt-1 text-2xl font-semibold">{formatCurrencyFromCents(total)}</div>
      </div>
      {query.error ? <div className="text-sm text-danger">{query.error.message}</div> : null}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.empresa_id} className="border-t border-border">
                <td className="px-4 py-3">{formatDateBR(item.proximo_vencimento)}</td>
                <td className="px-4 py-3 font-medium">{item.nome_fantasia}</td>
                <td className="px-4 py-3">{item.cnpj}</td>
                <td className="px-4 py-3">{formatCurrencyFromCents(item.valor_centavos)}</td>
                <td className="px-4 py-3 capitalize">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!query.isLoading && items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum pagamento próximo encontrado.
          </div>
        ) : null}
      </div>
    </MasterOnly>
  );
}
