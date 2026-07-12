import { useDashboardData, usePendencias } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { statusLabel } from "@/utils/status";

export function PendenciasPage() {
  const { data: pendencias = [] } = usePendencias();
  const { data: dashboard } = useDashboardData();
  const buckets = [
    { label: "Vencidos", count: dashboard?.documentosVencidos ?? 0, tone: "text-danger" },
    {
      label: "Próximos do vencimento",
      count: dashboard?.vencendo30 ?? 0,
      tone: "text-warning",
    },
    {
      label: "Sem responsável",
      count: dashboard?.semResponsavel ?? 0,
      tone: "text-warning",
    },
    {
      label: "Pendências críticas",
      count: dashboard?.pendenciasCriticas ?? 0,
      tone: "text-danger",
    },
    { label: "Atenção operacional", count: dashboard?.equipamentosAtencao ?? 0, tone: "text-warning" },
    {
      label: "Manutenções vencidas",
      count: dashboard?.manutencoesVencidas ?? 0,
      tone: "text-danger",
    },
    {
      label: "Pendências totais",
      count: pendencias.length,
      tone: "text-muted-foreground",
    },
  ];

  return (
    <AppShell
      title="Pendências"
      description="Central consolidada com tratativas, evidências, responsáveis e prazos."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {bucket.label}
            </div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${bucket.tone}`}>
              {bucket.count}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Todas as pendencias</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium">Item</th>
              <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
              <th className="px-4 py-2.5 text-left font-medium">Responsavel</th>
              <th className="px-4 py-2.5 text-left font-medium">Prazo</th>
              <th className="px-4 py-2.5 text-left font-medium">Prioridade</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pendencias.map((pendencia) => (
              <tr key={pendencia.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 font-medium">{pendencia.item}</td>
                <td className="px-4 py-3 text-muted-foreground">{pendencia.tipo}</td>
                <td className="px-4 py-3 text-muted-foreground">{pendencia.responsavel}</td>
                <td className="px-4 py-3 tabular-nums">{pendencia.vencimento}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      pendencia.status === "vencido" || pendencia.status === "critico"
                        ? "border-danger/30 bg-danger/5 text-danger"
                        : "border-warning/40 bg-warning/5 text-warning"
                    }`}
                  >
                    {pendencia.status === "atencao" ? "Media" : "Alta"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={pendencia.status}>
                    {statusLabel(pendencia.status)}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
