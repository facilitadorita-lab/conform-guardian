import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Archive,
  Box,
  CheckCircle2,
  CreditCard,
  DatabaseBackup,
  LockKeyhole,
  Plus,
  Webhook,
  BellRing,
  CalendarClock,
  Bug,
  Rocket,
  WalletCards,
} from "lucide-react";
import { MasterOnly } from "@/components/master-guard";
import { adminMasterService, securityService } from "@/services";
import { formatDateTimeBR } from "@/utils/date";
import { MasterOperationalControls } from "@/components/master-operational-controls";
import { useMfaAssurance } from "@/hooks/use-mfa-assurance";
import { useAppSession } from "@/hooks/use-app-session";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/master/saude")({ component: MasterHealthPage });

function MasterHealthPage() {
  const mfa = useMfaAssurance();
  const mfaPolicy = useQuery({
    queryKey: ["security", "mfa-policy"],
    queryFn: () => securityService.mfaPolicyStatus(),
    enabled: Boolean(mfa.data),
    staleTime: 30_000,
  });
  const mfaReady = mfa.data?.currentLevel === "aal2";
  const query = useQuery({
    queryKey: ["master", "system-health"],
    queryFn: () => adminMasterService.saudeSistema(),
    enabled: mfaReady,
    refetchInterval: 60_000,
  });
  const stripe = useQuery({
    queryKey: ["master", "stripe-health"],
    queryFn: () => adminMasterService.stripeHealth(),
    enabled: mfaReady,
    refetchInterval: 60_000,
  });
  const data = query.data;
  return (
    <MasterOnly
      title="Saúde do sistema"
      description="Monitoramento de banco, pagamentos, checkout, exportações e restauração de backup."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        <Kpi
          icon={Bug}
          label="Erros do frontend (24h)"
          value={String(data?.client_errors_24h ?? 0)}
          danger={Boolean(data?.client_errors_24h)}
        />
        <Kpi
          icon={BellRing}
          label="Falhas de notificação (24h)"
          value={String(data?.notification_failures_24h ?? 0)}
          danger={Boolean(data?.notification_failures_24h)}
        />
        <Kpi
          icon={CalendarClock}
          label="Falhas de relatórios (24h)"
          value={String(data?.scheduled_report_failures_24h ?? 0)}
          danger={Boolean(data?.scheduled_report_failures_24h)}
        />
        <Kpi
          icon={WalletCards}
          label="Cobranças pendentes"
          value={String(data?.pending_dunning ?? 0)}
          danger={Boolean(data?.pending_dunning)}
        />
      </div>
      {!mfaReady && !mfa.isLoading ? (
        <section className="rounded-2xl border border-warning/30 bg-warning/5 p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <h2 className="text-sm font-semibold">MFA necessário para controles Master</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A área de saúde, o Sandbox e ações operacionais ficam bloqueados até a sessão
                atingir AAL2. Ative o autenticador para continuar.
              </p>
              {mfaPolicy.data?.needs_enrollment || mfa.data?.hasVerifiedFactor === false ? (
                <a
                  href="/seguranca/mfa"
                  className="mt-3 inline-flex text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Configurar MFA
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      {query.error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {query.error.message}
        </div>
      ) : null}
      {mfaReady ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 h-5 w-5 text-accent" />
              <div>
                <h2 className="text-sm font-semibold">Saúde detalhada do Stripe</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Acompanhamento agregado de webhooks, sem expor payloads financeiros no frontend.
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stripe.data?.status === "healthy" ? "bg-success/10 text-success" : stripe.data?.status === "critical" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}
            >
              {stripe.data?.status ?? "carregando"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <HealthMetric label="Eventos 24h" value={stripe.data?.total_24h ?? 0} />
            <HealthMetric
              label="Falhas 24h"
              value={stripe.data?.failed_24h ?? 0}
              danger={Boolean(stripe.data?.failed_24h)}
            />
            <HealthMetric
              label="Pendentes"
              value={stripe.data?.pending_total ?? 0}
              danger={Boolean(stripe.data?.pending_total)}
            />
            <HealthMetric
              label="Taxa de sucesso"
              value={`${Math.round((stripe.data?.success_rate_24h ?? 0) * 100)}%`}
            />
          </div>
          <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <span>
              Último sucesso:{" "}
              {stripe.data?.last_success_at ? formatDateTimeBR(stripe.data.last_success_at) : "—"}
            </span>
            <span>
              Última falha:{" "}
              {stripe.data?.last_failure_at ? formatDateTimeBR(stripe.data.last_failure_at) : "—"}
            </span>
          </div>
          {stripe.error ? <p className="mt-3 text-xs text-danger">{stripe.error.message}</p> : null}
        </section>
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
      {mfaReady ? <MasterOperationalControls /> : null}
      {mfaReady ? <MasterSandboxCard /> : null}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Rocket className="h-5 w-5 text-accent" />
          <div>
            <h2 className="text-sm font-semibold">Última publicação em produção</h2>
            <p className="text-xs text-muted-foreground">
              {data?.last_deployment
                ? `${data.last_deployment.versao} · ${data.last_deployment.status} · ${formatDateTimeBR(data.last_deployment.concluido_at ?? data.last_deployment.iniciado_at)}`
                : "Ainda não há publicação registrada pelo pipeline profissional."}
            </p>
          </div>
        </div>
      </section>
    </MasterOnly>
  );
}

function MasterSandboxCard() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const appSession = useAppSession();
  const [name, setName] = useState("");
  const query = useQuery({
    queryKey: ["master", "sandbox"],
    queryFn: () => adminMasterService.listarSandbox(),
    staleTime: 30_000,
  });
  const create = useMutation({
    mutationFn: () => adminMasterService.criarSandbox(name.trim() || "Ambiente de testes"),
    onSuccess: async (sandbox) => {
      setName("");
      await client.invalidateQueries({ queryKey: ["master", "sandbox"] });
      await appSession.refreshContext();
      await appSession.selectCompany(sandbox.empresa_id);
      await navigate({ to: "/dashboard" });
    },
  });
  const archive = useMutation({
    mutationFn: (id: string) => adminMasterService.arquivarSandbox(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["master", "sandbox"] }),
  });

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Box className="mt-0.5 h-5 w-5 text-accent" />
          <div>
            <h2 className="text-sm font-semibold">Sandbox privado do Admin Master</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              Ambiente separado para testar fluxos sem misturar empresas, assinaturas ou dados de
              produção. Só a conta que criou o Sandbox consegue listá-lo e entrar nele.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-accent/25 bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Somente você
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          placeholder="Nome do ambiente (ex.: QA Stripe)"
          className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
        />
        <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="h-4 w-4" />
          Criar Sandbox
        </Button>
      </div>
      {create.error ? <p className="mt-2 text-xs text-danger">{create.error.message}</p> : null}
      <div className="mt-4 space-y-2">
        {(query.data ?? []).map((sandbox) => (
          <div
            key={sandbox.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/80 p-3"
          >
            <div>
              <div className="text-sm font-semibold">{sandbox.nome}</div>
              <div className="text-xs text-muted-foreground">
                {sandbox.empresa?.cnpj ?? "CNPJ interno"} · criado em{" "}
                {formatDateTimeBR(sandbox.created_at)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  await appSession.selectCompany(sandbox.empresa_id);
                  await navigate({ to: "/dashboard" });
                }}
              >
                Abrir ambiente
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => archive.mutate(sandbox.id)}
                disabled={archive.isPending}
                aria-label={`Arquivar ${sandbox.nome}`}
              >
                <Archive className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {!query.isLoading && !query.data?.length ? (
          <div className="rounded-xl border border-dashed border-border bg-background/60 p-4 text-xs text-muted-foreground">
            Nenhum ambiente Sandbox ativo. Crie um para executar testes seguros.
          </div>
        ) : null}
      </div>
      {query.error || archive.error ? (
        <p className="mt-2 text-xs text-danger">{(query.error ?? archive.error)?.message}</p>
      ) : null}
    </section>
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

function HealthMetric({
  label,
  value,
  danger,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${danger ? "border-danger/25 bg-danger/5" : "border-border bg-muted/20"}`}
    >
      <div className={`text-lg font-semibold ${danger ? "text-danger" : ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
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
        client_observability: "Erros do frontend",
        notification_delivery: "Entrega de notificações",
        scheduled_reports: "Relatórios agendados",
        billing_dunning: "Cobrança e recuperação",
      } as Record<string, string>
    )[value] ?? value
  );
}
