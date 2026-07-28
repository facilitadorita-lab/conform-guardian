import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, DatabaseBackup, MailWarning, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminMasterService } from "@/services";
import { formatCurrencyFromCents } from "@/utils/money";
import { formatDateTimeBR } from "@/utils/date";

export function MasterOperationalControls() {
  const client = useQueryClient();
  const [backupReference, setBackupReference] = useState("");
  const backups = useQuery({
    queryKey: ["master", "backup-drills"],
    queryFn: () => adminMasterService.listarEnsaiosBackup(),
  });
  const dunning = useQuery({
    queryKey: ["master", "dunning-queue"],
    queryFn: () => adminMasterService.filaCobranca(),
    refetchInterval: 60_000,
  });
  const usage = useQuery({
    queryKey: ["master", "company-consumption"],
    queryFn: () => adminMasterService.consumoEmpresas(),
    staleTime: 5 * 60_000,
  });
  const security = useQuery({
    queryKey: ["master", "api-security"],
    queryFn: () => adminMasterService.apiSecuritySnapshot(),
    staleTime: 5 * 60_000,
  });
  const isolation = useMutation({
    mutationFn: () => adminMasterService.testarIsolamento(),
    onSuccess: () => client.invalidateQueries({ queryKey: ["master", "system-health"] }),
  });
  const registerBackup = useMutation({
    mutationFn: () =>
      adminMasterService.registrarEnsaioBackup({
        ambiente: "production",
        backup_reference: backupReference,
        status: "passed",
        rpo_minutes: 2,
        rto_minutes: 30,
        notes: "Ensaio registrado pelo painel Master.",
      }),
    onSuccess: () => {
      setBackupReference("");
      void client.invalidateQueries({ queryKey: ["master", "backup-drills"] });
      void client.invalidateQueries({ queryKey: ["master", "system-health"] });
    },
  });
  const requeue = useMutation({
    mutationFn: (id: string) => adminMasterService.enfileirarCobranca(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["master", "dunning-queue"] }),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          title="Tabelas com RLS"
          value={security.data?.rls_tables ?? "—"}
          icon={ShieldCheck}
        />
        <Metric
          title="Funções protegidas"
          value={security.data?.security_definer_functions ?? "—"}
          icon={Activity}
        />
        <Metric
          title="Cobranças na fila"
          value={dunning.data?.length ?? 0}
          icon={MailWarning}
          danger={Boolean(dunning.data?.length)}
        />
        <Metric title="Empresas monitoradas" value={usage.data?.length ?? 0} icon={Users} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-accent" /> Teste de isolamento
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Executa verificações de consistência entre empresas, equipamentos, calibrações,
                qualificações, manutenções e anexos.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => isolation.mutate()}
              disabled={isolation.isPending}
            >
              {isolation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Executar"}
            </Button>
          </div>
          {isolation.data ? (
            <div
              className={`mt-4 rounded-xl border p-3 text-xs ${isolation.data.status === "passed" ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"}`}
            >
              {isolation.data.status === "passed"
                ? "Nenhuma inconsistência encontrada."
                : "Foram encontradas inconsistências que precisam de revisão."}{" "}
              · {isolation.data.failed_checks}/{isolation.data.total_checks} falhas
            </div>
          ) : null}
          {isolation.error ? (
            <p className="mt-3 text-xs text-danger">{isolation.error.message}</p>
          ) : null}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <DatabaseBackup className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-sm font-semibold">Ensaio de restauração</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Registre a evidência do último teste de backup e acompanhe RPO/RTO.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={backupReference}
              onChange={(event) => setBackupReference(event.target.value)}
              placeholder="Referência do backup"
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <Button
              size="sm"
              onClick={() => registerBackup.mutate()}
              disabled={!backupReference.trim() || registerBackup.isPending}
            >
              Registrar
            </Button>
          </div>
          {backups.data?.[0] ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Último: {backups.data[0].status} · RPO {backups.data[0].rpo_minutes ?? "—"} min · RTO{" "}
              {backups.data[0].rto_minutes ?? "—"} min ·{" "}
              {formatDateTimeBR(backups.data[0].completed_at ?? backups.data[0].created_at)}
            </p>
          ) : null}
          {registerBackup.error ? (
            <p className="mt-3 text-xs text-danger">{registerBackup.error.message}</p>
          ) : null}
        </section>
      </div>
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-sm font-semibold">Regua de recuperação de cobrança</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Reenfileire uma cobrança e notifique o administrador da empresa sem expor dados a
              outros tenants.
            </p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {(dunning.data ?? []).slice(0, 8).map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-semibold">{item.nome_fantasia}</div>
                <div className="text-xs text-muted-foreground">
                  Tentativa {item.tentativa} · {item.erro_codigo ?? "Pagamento recusado"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <strong className="text-sm">{formatCurrencyFromCents(item.valor_centavos)}</strong>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => requeue.mutate(item.id)}
                  disabled={requeue.isPending}
                >
                  Reenfileirar
                </Button>
              </div>
            </div>
          ))}
          {!dunning.isLoading && !dunning.data?.length ? (
            <div className="p-7 text-center text-sm text-muted-foreground">
              Nenhuma cobrança pendente na fila.
            </div>
          ) : null}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-sm font-semibold">Consumo por empresa</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Acompanhamento administrativo de documentos, equipamentos e armazenamento.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Empresa</th>
                <th className="px-4 py-3 text-left">Segmento</th>
                <th className="px-4 py-3 text-right">Documentos</th>
                <th className="px-4 py-3 text-right">Equipamentos</th>
                <th className="px-5 py-3 text-right">Armazenamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(usage.data ?? []).slice(0, 20).map((item) => (
                <tr key={item.empresa_id}>
                  <td className="px-5 py-3 font-medium">{item.nome_fantasia ?? "Empresa"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.segmento ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {item.documentos ?? 0}
                    {item.limite_documentos ? ` / ${item.limite_documentos}` : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.equipamentos ?? 0}
                    {item.limite_equipamentos ? ` / ${item.limite_equipamentos}` : ""}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {Math.round(Number(item.storage_bytes ?? 0) / (1024 * 1024))} MB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  danger,
}: {
  title: string;
  value: string | number;
  icon: typeof Activity;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{title}</span>
        <Icon className={`h-4 w-4 ${danger ? "text-danger" : "text-accent"}`} />
      </div>
      <div className={`mt-2 text-2xl font-semibold ${danger ? "text-danger" : ""}`}>{value}</div>
    </div>
  );
}
