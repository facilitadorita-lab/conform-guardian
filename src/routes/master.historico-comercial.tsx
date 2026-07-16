import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Clock3, FileClock, ShieldCheck } from "lucide-react";
import { MasterOnly } from "@/components/master-guard";
import { adminMasterService } from "@/services";
import { formatDateTimeBR } from "@/utils/date";

export const Route = createFileRoute("/master/historico-comercial")({
  component: MasterCommercialHistoryPage,
});

function MasterCommercialHistoryPage() {
  const query = useQuery({
    queryKey: ["master", "commercial-history"],
    queryFn: () => adminMasterService.historicoComercial(),
  });

  return (
    <MasterOnly
      title="Histórico comercial"
      description="Linha do tempo imutável de planos, assinaturas e faturas, registrada diretamente pelo backend."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Eventos carregados"
          value={String(query.data?.length ?? 0)}
          icon={FileClock}
        />
        <Metric
          label="Alterações de plano"
          value={String(query.data?.filter((item) => item.entidade === "plano").length ?? 0)}
          icon={ShieldCheck}
        />
        <Metric
          label="Último registro"
          value={query.data?.[0] ? formatDateTimeBR(query.data[0].created_at) : "Sem registros"}
          icon={Clock3}
          compact
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Eventos imutáveis</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Valores anteriores e novos permanecem no banco para auditoria e não podem ser editados.
          </p>
        </header>
        {query.error ? (
          <div className="border-b border-danger/20 bg-danger/5 px-5 py-3 text-sm text-danger">
            {query.error.message}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Entidade</th>
                <th className="px-4 py-3 text-left">Evento</th>
                <th className="px-4 py-3 text-left">Origem</th>
                <th className="px-4 py-3 text-left">Empresa</th>
                <th className="px-4 py-3 text-left">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(query.data ?? []).map((item) => (
                <tr key={item.id} className="hover:bg-muted/25">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDateTimeBR(item.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium capitalize">{item.entidade}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border bg-muted/40 px-2 py-1 text-xs font-medium uppercase">
                      {eventLabel(item.evento)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{originLabel(item.origem)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {shortId(item.empresa_id)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {item.actor_role ?? "sistema"} · {shortId(item.actor_user_id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!query.isLoading && !query.data?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            O histórico será preenchido automaticamente nas próximas alterações comerciais.
          </div>
        ) : null}
      </section>
    </MasterOnly>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  compact,
}: {
  label: string;
  value: string;
  icon: typeof FileClock;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className={`mt-2 font-semibold ${compact ? "text-base" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function shortId(value: string | null) {
  return value ? `${value.slice(0, 8)}…` : "—";
}

function eventLabel(value: "insert" | "update" | "delete") {
  return { insert: "criação", update: "alteração", delete: "exclusão" }[value];
}

function originLabel(value: string) {
  return value === "backend_service" ? "Serviço de backend" : "Usuário autenticado";
}
