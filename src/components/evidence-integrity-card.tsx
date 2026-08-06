import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileWarning, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useUnitContext } from "@/hooks/use-unit-context";
import { professionalService } from "@/services";
import { formatDateTimeBR } from "@/utils/date";
import { cn } from "@/lib/utils";

export function EvidenceIntegrityCard() {
  const { selectedCompanyId } = useSession();
  const { unidadeAtualId } = useUnitContext();
  const integrity = useQuery({
    queryKey: ["audit", "integrity", selectedCompanyId, unidadeAtualId ?? "consolidado"],
    queryFn: () => professionalService.auditIntegrity(selectedCompanyId!, unidadeAtualId),
    enabled: Boolean(selectedCompanyId),
    staleTime: 60_000,
  });

  if (integrity.isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl border border-border bg-muted/40" />;
  }

  if (!integrity.data || integrity.isError) return null;
  const data = integrity.data;
  const valid = data.status === "verificada";
  const partial = data.status === "parcial";
  const Icon = valid ? ShieldCheck : partial ? FileWarning : ShieldAlert;

  return (
    <section
      className={cn(
        "rounded-2xl border p-5",
        valid
          ? "border-success/25 bg-success/[0.045]"
          : partial
            ? "border-warning/30 bg-warning/[0.05]"
            : "border-danger/30 bg-danger/[0.05]",
      )}
      aria-label="Integridade da trilha de evidências"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              valid ? "bg-success/10 text-success" : partial ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Integridade das evidências</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {valid
                ? "A cadeia de eventos desta visualização está íntegra e os registros novos são selados com SHA-256."
                : partial
                  ? "Há registros históricos anteriores ao selo encadeado. Os eventos novos continuam protegidos e verificáveis."
                  : "Foram encontrados indícios de inconsistência. Restrinja alterações e acione o responsável pela segurança."}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            valid ? "border-success/25 bg-success/10 text-success" : partial ? "border-warning/30 bg-warning/10 text-warning" : "border-danger/30 bg-danger/10 text-danger",
          )}
        >
          {valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {valid ? "Verificada" : partial ? "Histórico parcial" : "Revisão necessária"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Eventos verificados" value={data.eventos_verificados} />
        <Metric label="Elos inconsistentes" value={data.elos_inconsistentes + data.hashes_invalidos} tone={data.elos_inconsistentes + data.hashes_invalidos > 0 ? "danger" : "success"} />
        <Metric label="Anexos sem hash" value={data.anexos_sem_hash} tone={data.anexos_sem_hash > 0 ? "warning" : "success"} />
      </div>
      {data.ultimo_evento_em ? (
        <p className="mt-4 text-[11px] text-muted-foreground">
          Último evento analisado: {formatDateTimeBR(data.ultimo_evento_em)} · conteúdo dos anexos permanece privado.
        </p>
      ) : null}
    </section>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "success" | "warning" | "danger" | "neutral" }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function IntegrityLoadingIndicator() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}
