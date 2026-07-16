import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, CheckCircle2, DatabaseBackup, Webhook } from "lucide-react";
import { MasterOnly } from "@/components/master-guard";
import { adminMasterService } from "@/services";
import { formatDateTimeBR } from "@/utils/date";

export const Route = createFileRoute("/master/saude")({ component: MasterHealthPage });

function MasterHealthPage() {
  const query = useQuery({
    queryKey: ["master", "system-health"],
    queryFn: () => adminMasterService.saudeSistema(),
    refetchInterval: 60_000,
  });
  const data = query.data;
  return (
    <MasterOnly
      title="Saúde do sistema"
      description="Monitoramento de banco, pagamentos, checkout, exportações e restauração de backup."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Kpi
          icon={Activity}
          label="Componentes monitorados"
          value={String(data?.components.length ?? 0)}
        />
        <Kpi
          icon={AlertTriangle}
          label="Alertas abertos"
          value={String(data?.open_alerts.length ?? 0)}
          danger={Boolean(data?.open_alerts.length)}
        />
        <Kpi
          icon={Webhook}
          label="Webhooks com falha (24h)"
          value={String(data?.webhook_failures_24h ?? 0)}
          danger={Boolean(data?.webhook_failures_24h)}
        />
      </div>
      {query.error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {query.error.message}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card">
          <header className="border-b border-border p-4">
            <h2 className="font-semibold">Componentes</h2>
          </header>
          <div className="divide-y divide-border">
            {(data?.components ?? []).map((item) => (
              <div key={item.componente} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="text-sm font-medium">{labelComponent(item.componente)}</div>
                  <div className="text-xs text-muted-foreground">
                    Atualizado em {formatDateTimeBR(item.checked_at)}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "healthy" ? "bg-success/10 text-success" : item.status === "down" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card">
          <header className="border-b border-border p-4">
            <h2 className="font-semibold">Alertas operacionais</h2>
          </header>
          <div className="divide-y divide-border">
            {(data?.open_alerts ?? []).map((alert) => (
              <div key={alert.id} className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${alert.severidade === "critical" ? "text-danger" : "text-warning"}`}
                  />
                  <div className="text-sm font-semibold">{alert.titulo}</div>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{alert.mensagem}</p>
              </div>
            ))}
            {!data?.open_alerts.length ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
                Nenhum alerta aberto.
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <DatabaseBackup className="h-5 w-5 text-accent" />
          <div>
            <h2 className="text-sm font-semibold">Último teste de restauração</h2>
            <p className="text-xs text-muted-foreground">
              {data?.last_restore_test
                ? `${data.last_restore_test.status} · ${formatDateTimeBR(data.last_restore_test.completed_at)}`
                : "Ainda não há ensaio de restauração registrado."}
            </p>
          </div>
        </div>
      </section>
    </MasterOnly>
  );
}
function Kpi({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <Icon className={`h-4 w-4 ${danger ? "text-danger" : "text-accent"}`} />
      </div>
      <div className={`mt-2 text-2xl font-semibold ${danger ? "text-danger" : ""}`}>{value}</div>
    </div>
  );
}
function labelComponent(value: string) {
  return (
    (
      {
        database: "Banco de dados",
        stripe_webhooks: "Webhooks Stripe",
        checkout: "Checkout",
        lgpd_exports: "Exportações LGPD",
        backup_restore: "Backup e restauração",
      } as Record<string, string>
    )[value] ?? value
  );
}
