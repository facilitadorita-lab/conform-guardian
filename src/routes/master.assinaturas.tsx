import { createFileRoute } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { useMasterAssinaturas } from "@/hooks/use-conform-data";
import { StatusBadge } from "@/layouts/app-layout";
import { formatDateBR } from "@/utils/date";
import { formatCurrencyFromCents } from "@/utils/money";

export const Route = createFileRoute("/master/assinaturas")({ component: MasterAssinaturas });

function MasterAssinaturas() {
  const query = useMasterAssinaturas();
  const items = query.data ?? [];
  return (
    <MasterOnly
      title="Assinaturas"
      description="Dados reais de planos, cobrança e acesso das empresas."
    >
      {query.error ? <ErrorState message={query.error.message} /> : null}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Ciclo</th>
              <th className="px-4 py-3">Próxima cobrança</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.empresa_id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{item.nome_fantasia}</div>
                  <div className="text-xs text-muted-foreground">{item.cnpj}</div>
                </td>
                <td className="px-4 py-3">{item.plano_nome ?? "Sem plano"}</td>
                <td className="px-4 py-3 capitalize">{item.ciclo ?? "—"}</td>
                <td className="px-4 py-3">{formatDateBR(item.proximo_vencimento)}</td>
                <td className="px-4 py-3 font-medium">
                  {formatCurrencyFromCents(item.valor_mensal_centavos)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={
                      item.status === "ativa"
                        ? "ok"
                        : item.status === "inadimplente" || item.status === "bloqueada"
                          ? "vencido"
                          : "atencao"
                    }
                  >
                    {item.status ?? "sem assinatura"}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!query.isLoading && items.length === 0 ? <EmptyState /> : null}
      </div>
    </MasterOnly>
  );
}

function EmptyState() {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Nenhuma assinatura encontrada no backend.
    </div>
  );
}
function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
      Não foi possível carregar as assinaturas: {message}
    </div>
  );
}
