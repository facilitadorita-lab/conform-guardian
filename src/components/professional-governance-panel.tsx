import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BellRing, CheckCircle2, DatabaseZap, Loader2, Save, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { professionalService } from "@/services";
import type { PermissionCatalogItem } from "@/types";
import { cn } from "@/lib/utils";

export function ProfessionalGovernancePanel({
  companyId,
  canAdmin,
  currentUserId,
}: {
  companyId: string;
  canAdmin: boolean;
  currentUserId: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <DataQualityCard companyId={companyId} canAdmin={canAdmin} />
      <NotificationPreferencesCard companyId={companyId} />
      {canAdmin ? (
        <PermissionsMatrixCard companyId={companyId} currentUserId={currentUserId} />
      ) : null}
    </div>
  );
}

function DataQualityCard({ companyId, canAdmin }: { companyId: string; canAdmin: boolean }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["professional", "data-quality", companyId],
    queryFn: () => professionalService.dataQuality(companyId),
  });
  const run = useMutation({
    mutationFn: () => professionalService.runDataQuality(companyId),
    onSuccess: (data) => client.setQueryData(["professional", "data-quality", companyId], data),
  });
  const summary = query.data?.resumo;
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <DatabaseZap className="mt-0.5 h-5 w-5 text-accent" />
          <div>
            <h2 className="text-sm font-semibold">Qualidade dos dados</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Detecta duplicidades, datas incoerentes e cadastros incompletos no ambiente atual.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-center">
          <div className="text-xl font-semibold">{summary?.total ?? 0}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">achados</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Críticos" value={summary?.criticos ?? 0} danger />
        <Metric label="Alertas" value={summary?.alertas ?? 0} />
      </div>
      <div className="mt-4 max-h-48 space-y-2 overflow-auto">
        {(query.data?.achados ?? []).slice(0, 8).map((finding) => (
          <div key={finding.id} className="flex items-start gap-2 rounded-xl border border-border bg-muted/20 p-3">
            {finding.severidade === "critical" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            ) : (
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            )}
            <div>
              <div className="text-xs font-semibold">{finding.titulo}</div>
              <div className="mt-0.5 text-[11px] capitalize text-muted-foreground">{finding.modulo}</div>
            </div>
          </div>
        ))}
        {!query.isLoading && !query.data?.achados.length ? (
          <div className="rounded-xl border border-success/25 bg-success/5 p-4 text-xs text-success">
            <CheckCircle2 className="mr-2 inline h-4 w-4" /> Nenhum problema ativo no último diagnóstico.
          </div>
        ) : null}
      </div>
      {canAdmin ? (
        <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
          Executar diagnóstico agora
        </Button>
      ) : null}
      {run.error || query.error ? <ErrorText message={(run.error ?? query.error)?.message} /> : null}
    </section>
  );
}

function NotificationPreferencesCard({ companyId }: { companyId: string }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["professional", "notifications", companyId],
    queryFn: () => professionalService.notificationCenter(companyId),
  });
  const [email, setEmail] = useState(true);
  const [inApp, setInApp] = useState(true);
  const [digest, setDigest] = useState(false);
  const [severity, setSeverity] = useState("info");
  useEffect(() => {
    const preference = query.data?.preferencias;
    if (!preference) return;
    setEmail(preference.canais.includes("email"));
    setInApp(preference.canais.includes("in_app"));
    setDigest(preference.resumo_diario);
    setSeverity(preference.severidade_minima);
  }, [query.data?.preferencias]);
  const save = useMutation({
    mutationFn: () => professionalService.saveNotificationPreferences(companyId, {
      canais: [inApp ? "in_app" : null, email ? "email" : null].filter(Boolean),
      severidade_minima: severity,
      resumo_diario: digest,
      hora_resumo: "08:00",
      timezone: "America/Sao_Paulo",
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["professional", "notifications", companyId] }),
  });
  const delivery = query.data?.entregas_30d;
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 text-accent" />
        <div>
          <h2 className="text-sm font-semibold">Preferências de notificação</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Canais, criticidade mínima e resumo diário por usuário, sem misturar empresas.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Toggle label="No sistema" checked={inApp} onChange={setInApp} />
        <Toggle label="E-mail" checked={email} onChange={setEmail} />
        <Toggle label="Resumo diário" checked={digest} onChange={setDigest} />
      </div>
      <label className="mt-4 block text-xs font-semibold text-muted-foreground">
        Criticidade mínima
        <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground">
          <option value="info">Todas</option>
          <option value="warning">Atenção e críticas</option>
          <option value="critical">Somente críticas</option>
        </select>
      </label>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Metric label="Enviadas 30d" value={delivery?.enviadas ?? 0} />
        <Metric label="Falhas 30d" value={delivery?.falhas ?? 0} danger={Boolean(delivery?.falhas)} />
        <Metric label="Total 30d" value={delivery?.total ?? 0} />
      </div>
      <Button type="button" className="mt-4 w-full" onClick={() => save.mutate()} disabled={save.isPending || (!email && !inApp)}>
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar preferências
      </Button>
      {save.error || query.error ? <ErrorText message={(save.error ?? query.error)?.message} /> : null}
    </section>
  );
}

function PermissionsMatrixCard({ companyId, currentUserId }: { companyId: string; currentUserId: string }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["professional", "permissions", companyId],
    queryFn: () => professionalService.permissionMatrix(companyId),
  });
  const editableUsers = useMemo(() => (query.data?.usuarios ?? []).filter((item) => item.usuario_id !== currentUserId), [currentUserId, query.data?.usuarios]);
  const [selectedId, setSelectedId] = useState("");
  const selected = editableUsers.find((item) => item.usuario_id === selectedId) ?? editableUsers[0];
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("Ajuste administrativo de responsabilidade operacional.");
  useEffect(() => {
    if (selected) {
      setSelectedId(selected.usuario_id);
      setPermissions(selected.permissoes);
    }
  }, [selected?.usuario_id, query.dataUpdatedAt]);
  const save = useMutation({
    mutationFn: () => professionalService.saveUserPermissions(companyId, selected!.usuario_id, permissions, reason),
    onSuccess: () => client.invalidateQueries({ queryKey: ["professional", "permissions", companyId] }),
  });
  const modules = useMemo(() => {
    const grouped = new Map<string, PermissionCatalogItem[]>();
    for (const item of query.data?.catalogo ?? []) grouped.set(item.modulo, [...(grouped.get(item.modulo) ?? []), item]);
    return [...grouped.entries()];
  }, [query.data?.catalogo]);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 text-accent" />
          <div>
            <h2 className="text-sm font-semibold">Matriz avançada de permissões</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Exceções individuais aplicadas e auditadas com rastreabilidade.</p>
          </div>
        </div>
        <select value={selected?.usuario_id ?? ""} onChange={(event) => {
          const user = editableUsers.find((item) => item.usuario_id === event.target.value);
          setSelectedId(event.target.value);
          setPermissions(user?.permissoes ?? {});
        }} className="h-10 min-w-64 rounded-xl border border-input bg-background px-3 text-sm">
          {editableUsers.map((user) => <option key={user.usuario_id} value={user.usuario_id}>{user.nome} · {user.perfil}</option>)}
        </select>
      </div>
      {selected ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map(([module, items]) => (
              <div key={module} className="rounded-2xl border border-border bg-muted/15 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{module}</h3>
                <div className="mt-3 space-y-2">
                  {items.map((item) => (
                    <label key={item.codigo} className="flex cursor-pointer items-start gap-3 text-sm">
                      <input type="checkbox" checked={Boolean(permissions[item.codigo])} onChange={(event) => setPermissions((current) => ({ ...current, [item.codigo]: event.target.checked }))} className="mt-0.5 h-4 w-4 rounded" />
                      <span><span className="font-medium">{item.nome}</span>{item.sensivel ? <span className="ml-1 text-[10px] text-warning">sensível</span> : null}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Justificativa da alteração" className="h-10 rounded-xl border border-input bg-background px-3 text-sm" />
            <Button type="button" onClick={() => save.mutate()} disabled={save.isPending || reason.trim().length < 10}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Aplicar permissões
            </Button>
          </div>
        </>
      ) : <p className="mt-5 text-sm text-muted-foreground">Cadastre outro usuário para configurar exceções individuais.</p>}
      {save.error || query.error ? <ErrorText message={(save.error ?? query.error)?.message} /> : null}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className={cn("rounded-xl border px-3 py-3 text-xs font-semibold transition", checked ? "border-success/30 bg-success/5 text-success" : "border-border bg-muted/20 text-muted-foreground")}>{checked ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : null}{label}</button>;
}
function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return <div className={cn("rounded-xl border border-border bg-muted/20 p-3", danger && "border-danger/25 bg-danger/5 text-danger")}><div className="text-lg font-semibold">{value}</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div></div>;
}
function ErrorText({ message }: { message?: string }) { return message ? <p className="mt-3 text-xs text-danger">{message}</p> : null; }
