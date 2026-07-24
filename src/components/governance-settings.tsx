import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { governanceService } from "@/services";
import type { RetentionPolicy } from "@/types";
import { formatDateTimeBR } from "@/utils/date";

const retentionModules: Array<{ key: RetentionPolicy["modulo"]; label: string }> = [
  { key: "documentos", label: "Documentos" },
  { key: "equipamentos", label: "Equipamentos" },
  { key: "manutencoes", label: "Manutenções" },
  { key: "auditoria", label: "Auditoria" },
  { key: "anexos", label: "Anexos" },
  { key: "usuarios", label: "Usuários" },
];

export function GovernanceSettings({
  companyId,
  canAdmin,
  userId,
}: {
  companyId: string;
  canAdmin: boolean;
  userId: string;
}) {
  const client = useQueryClient();
  const onboarding = useQuery({
    queryKey: ["governance", "onboarding", companyId],
    queryFn: () => governanceService.onboarding(companyId),
  });
  const exportsQuery = useQuery({
    queryKey: ["governance", "exports", companyId],
    queryFn: () => governanceService.listExports(companyId),
    enabled: canAdmin,
    refetchInterval: 30_000,
  });
  const retentionQuery = useQuery({
    queryKey: ["governance", "retention", companyId],
    queryFn: () => governanceService.listRetention(companyId),
    enabled: canAdmin,
  });
  const criticalActions = useQuery({
    queryKey: ["governance", "critical-actions", companyId],
    queryFn: () => governanceService.listCriticalActions(companyId),
    enabled: canAdmin,
  });
  const requestExport = useMutation({
    mutationFn: () => governanceService.requestExport(companyId),
    onSuccess: () => client.invalidateQueries({ queryKey: ["governance", "exports", companyId] }),
  });
  const decideAction = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      governanceService.decideCriticalAction(id, approve),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["governance", "critical-actions", companyId] }),
  });
  const latestExport = exportsQuery.data?.[0];

  async function download(id: string) {
    const url = await governanceService.downloadExport(id);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" /> Implantação guiada
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Recomendações da IA usando somente dados estruturados.
            </p>
          </div>
          <div className="text-2xl font-semibold text-accent">
            {onboarding.data?.percentual ?? 0}%
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${onboarding.data?.percentual ?? 0}%` }}
          />
        </div>
        <div className="mt-4 space-y-2">
          {(onboarding.data?.etapas ?? []).map((step) => (
            <div key={step.key} className="flex items-center gap-2 text-sm">
              <CheckCircle2
                className={`h-4 w-4 ${step.complete ? "text-success" : "text-muted-foreground/40"}`}
              />
              <span className={step.complete ? "" : "text-muted-foreground"}>{step.label}</span>
            </div>
          ))}
        </div>
        {onboarding.data?.recomendacao_ia ? (
          <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm leading-6 text-foreground">
            {onboarding.data.recomendacao_ia}
          </div>
        ) : null}
      </section>
      {canAdmin ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <FileArchive className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-sm font-semibold">Portabilidade e LGPD</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Gere uma cópia estruturada dos dados da empresa. O arquivo fica disponível por 24
                horas e exige MFA para download.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-muted/40 p-4 text-sm">
            {latestExport ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">Exportação {latestExport.status}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTimeBR(latestExport.created_at)}
                  </span>
                </div>
                {latestExport.status === "ready" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => download(latestExport.id)}
                  >
                    <Download className="h-4 w-4" /> Baixar por link seguro
                  </Button>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">Nenhuma exportação solicitada.</span>
            )}
          </div>
          <Button
            type="button"
            onClick={() => requestExport.mutate()}
            disabled={
              requestExport.isPending ||
              latestExport?.status === "pending" ||
              latestExport?.status === "processing"
            }
            className="mt-4 w-full"
          >
            {requestExport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}{" "}
            Solicitar exportação completa
          </Button>
          {requestExport.error ? (
            <p className="mt-3 text-xs text-danger">{requestExport.error.message}</p>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold">Governança administrativa</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Exportações e políticas de retenção são restritas aos administradores da empresa.
              </p>
            </div>
          </div>
        </section>
      )}
      {canAdmin ? (
        <section className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-sm font-semibold">Retenção e preservação legal</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Defina prazos por módulo. Alterações exigem MFA e são aplicadas com segurança.
              </p>
            </div>
          </div>
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {retentionModules.map((module) => (
              <RetentionRow
                key={module.key}
                companyId={companyId}
                module={module}
                policy={retentionQuery.data?.find((item) => item.modulo === module.key)}
                onSaved={() =>
                  client.invalidateQueries({ queryKey: ["governance", "retention", companyId] })
                }
              />
            ))}
          </div>
        </section>
      ) : null}
      {canAdmin ? (
        <section className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-sm font-semibold">Aprovação em duas etapas</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Ações sensíveis precisam de outro administrador com MFA. O solicitante nunca pode
                aprovar a própria solicitação.
              </p>
            </div>
          </div>
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {(criticalActions.data ?? []).map((request) => {
              const canDecide = request.status === "pending" && request.requested_by !== userId;
              return (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 bg-card p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {criticalActionLabel(request.action_type)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {request.justification} · expira em {formatDateTimeBR(request.expires_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border bg-muted/40 px-2 py-1 text-xs font-medium capitalize">
                      {request.status}
                    </span>
                    {canDecide ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={decideAction.isPending}
                          onClick={() => decideAction.mutate({ id: request.id, approve: false })}
                        >
                          <XCircle className="h-4 w-4" /> Rejeitar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={decideAction.isPending}
                          onClick={() => decideAction.mutate({ id: request.id, approve: true })}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Aprovar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {!criticalActions.data?.length ? (
              <div className="p-7 text-center text-sm text-muted-foreground">
                Nenhuma ação sensível aguardando decisão.
              </div>
            ) : null}
          </div>
          {decideAction.error ? (
            <p className="mt-3 text-xs text-danger">{decideAction.error.message}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function RetentionRow({
  companyId,
  module,
  policy,
  onSaved,
}: {
  companyId: string;
  module: { key: RetentionPolicy["modulo"]; label: string };
  policy?: RetentionPolicy;
  onSaved: () => void;
}) {
  const [months, setMonths] = useState(policy?.retention_months ?? 60);
  const [legalHold, setLegalHold] = useState(policy?.legal_hold ?? false);
  const [automatic, setAutomatic] = useState(policy?.descarte_automatico ?? false);
  useEffect(() => {
    setMonths(policy?.retention_months ?? 60);
    setLegalHold(policy?.legal_hold ?? false);
    setAutomatic(policy?.descarte_automatico ?? false);
  }, [policy]);
  const save = useMutation({
    mutationFn: () =>
      governanceService.saveRetention({
        id: policy?.id,
        empresa_id: companyId,
        modulo: module.key,
        retention_months: Math.max(1, Math.min(360, months)),
        legal_hold: legalHold,
        descarte_automatico: legalHold ? false : automatic,
        justificativa: legalHold ? "Preservação legal habilitada pelo administrador." : null,
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="grid gap-3 bg-card p-4 md:grid-cols-[1fr_150px_150px_150px_auto] md:items-center">
      <div>
        <div className="text-sm font-semibold">{module.label}</div>
        <div className="text-xs text-muted-foreground">
          {policy ? "Política configurada" : "Padrão sugerido: 60 meses"}
        </div>
      </div>
      <label className="text-xs text-muted-foreground">
        Meses
        <input
          type="number"
          min={1}
          max={360}
          value={months}
          onChange={(event) => setMonths(Number(event.target.value))}
          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={legalHold}
          onChange={(event) => setLegalHold(event.target.checked)}
        />
        Preservação legal
      </label>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={automatic && !legalHold}
          disabled={legalHold}
          onChange={(event) => setAutomatic(event.target.checked)}
        />
        Descarte automático
      </label>
      <Button
        type="button"
        variant="outline"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Salvar
      </Button>
      {save.error ? (
        <p className="text-xs text-danger md:col-span-5">{save.error.message}</p>
      ) : null}
    </div>
  );
}

function criticalActionLabel(value: string) {
  return (
    (
      {
        delete_evidence: "Excluir evidência",
        replace_evidence: "Substituir evidência",
        mass_delete: "Exclusão em massa",
        export_sensitive: "Exportação sensível",
        change_billing: "Alteração de cobrança",
        block_company: "Bloqueio de empresa",
      } as Record<string, string>
    )[value] ?? value
  );
}
