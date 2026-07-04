import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { pendenciasCriticas, statusLabel } from "@/lib/mock-data";

export const Route = createFileRoute("/pendencias")({
  head: () => ({ meta: [{ title: "Pendências — Conform Flow" }] }),
  component: PendenciasPage,
});

const buckets = [
  { label: "Vencidos", count: 4, tone: "text-danger" },
  { label: "Próximos do vencimento", count: 11, tone: "text-warning" },
  { label: "Sem anexo", count: 5, tone: "text-warning" },
  { label: "Sem responsável", count: 3, tone: "text-warning" },
  { label: "Calibrações reprovadas", count: 2, tone: "text-danger" },
  { label: "Qualificações sem relatório", count: 1, tone: "text-warning" },
  { label: "Manutenções sem evidência", count: 3, tone: "text-warning" },
  { label: "Pendências manuais", count: 6, tone: "text-muted-foreground" },
];

function PendenciasPage() {
  return (
    <AppShell
      title="Pendências"
      description="Central consolidada com tratativas, evidências, responsáveis e prazos."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <div key={b.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{b.label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${b.tone}`}>{b.count}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Todas as pendências</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-2.5">Item</th>
              <th className="text-left font-medium px-4 py-2.5">Tipo</th>
              <th className="text-left font-medium px-4 py-2.5">Responsável</th>
              <th className="text-left font-medium px-4 py-2.5">Prazo</th>
              <th className="text-left font-medium px-4 py-2.5">Prioridade</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pendenciasCriticas.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 font-medium">{p.item}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.tipo}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.responsavel}</td>
                <td className="px-4 py-3 tabular-nums">{p.vencimento}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    p.status === "vencido" || p.status === "critico" ? "border-danger/30 text-danger bg-danger/5" : "border-warning/40 text-warning bg-warning/5"
                  }`}>{p.status === "atencao" ? "Média" : "Alta"}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge tone={p.status}>{statusLabel(p.status)}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}