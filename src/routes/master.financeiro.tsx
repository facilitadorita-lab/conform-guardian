import { createFileRoute } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { masterFinanceiro } from "@/mocks/conformflow-mocks";

export const Route = createFileRoute("/master/financeiro")({
  component: MasterFinanceiro,
});

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MasterFinanceiro() {
  const f = masterFinanceiro;
  const max = Math.max(...f.meses.map((m) => m.receita));
  return (
    <MasterOnly title="Financeiro" description="Visão consolidada de receita e saúde financeira da plataforma.">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="MRR" value={fmt(f.mrr)} />
        <Kpi label="ARR" value={fmt(f.arr)} />
        <Kpi label="Receita do mês" value={fmt(f.receitaMes)} />
        <Kpi label="Ticket médio" value={fmt(f.ticketMedio)} />
        <Kpi label="Churn" value={`${f.churn}%`} />
        <Kpi label="Inadimplência" value={`${f.inadimplenciaPct}%`} />
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Receita mensal (últimos 6 meses)</h2>
        <div className="flex items-end gap-4 h-48">
          {f.meses.map((m) => (
            <div key={m.mes} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md bg-accent/80"
                style={{ height: `${(m.receita / max) * 100}%` }}
                title={fmt(m.receita)}
              />
              <span className="text-[11px] text-muted-foreground">{m.mes}</span>
            </div>
          ))}
        </div>
      </div>
    </MasterOnly>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}