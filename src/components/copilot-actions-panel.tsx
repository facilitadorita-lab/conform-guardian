import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Bot, CalendarClock, CheckCircle2, ClipboardCheck, FileWarning, Wrench } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useUnitContext } from "@/hooks/use-unit-context";
import { professionalService } from "@/services";
import type { CopilotAction } from "@/types";
import { formatDateBR } from "@/utils/date";
import { cn } from "@/lib/utils";

export function CopilotActionsPanel({ compact = false }: { compact?: boolean }) {
  const { selectedCompanyId } = useSession();
  const { unidadeAtualId } = useUnitContext();
  const query = useQuery({
    queryKey: ["copilot", "next-actions", selectedCompanyId, unidadeAtualId ?? "consolidado"],
    queryFn: () => professionalService.copilotActions(selectedCompanyId!, unidadeAtualId),
    enabled: Boolean(selectedCompanyId),
    staleTime: 45_000,
  });

  if (query.isLoading) {
    return <div className="grid gap-3">{Array.from({ length: compact ? 2 : 3 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl border border-border bg-muted/40" />)}</div>;
  }

  if (query.isError || !query.data) return null;
  const actions = query.data.acoes;

  return (
    <section className={compact ? "space-y-3" : "rounded-2xl border border-primary/15 bg-primary/[0.025] p-5"}>
      {!compact ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot className="h-5 w-5" /></div>
            <div>
              <h2 className="text-sm font-semibold">Próximas ações do FlowIA</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Prioridades calculadas com dados estruturados da empresa. Nada é executado automaticamente.</p>
            </div>
          </div>
          <span className="rounded-full border border-primary/20 bg-background px-2.5 py-1 text-[11px] font-semibold text-primary">IA segura</span>
        </div>
      ) : null}

      {actions.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/[0.04] p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <span>Não há ação prioritária agora. Continue registrando as rotinas para manter essa visão atualizada.</span>
        </div>
      ) : (
        <div className={cn("grid gap-3", !compact && "mt-5")}>{actions.slice(0, compact ? 3 : 6).map((action) => <CopilotActionRow key={action.id} action={action} companyId={selectedCompanyId!} />)}</div>
      )}
    </section>
  );
}

function CopilotActionRow({ action, companyId }: { action: CopilotAction; companyId: string }) {
  const Icon = action.modulo === "documentos" ? FileWarning : action.modulo === "manutencoes" ? Wrench : action.modulo === "pendencias" ? ClipboardCheck : CalendarClock;
  const priorityClass = action.prioridade === "critica" ? "text-danger bg-danger/10 border-danger/25" : action.prioridade === "alta" ? "text-warning bg-warning/10 border-warning/25" : "text-accent bg-accent/10 border-accent/25";
  return (
    <a
      href={action.destino}
      onClick={() => { void professionalService.registerCopilotAction(companyId, action.id, action.destino); }}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 outline-none cf-transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm focus-visible:ring-4 focus-visible:ring-primary/15"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{action.titulo}</p>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", priorityClass)}>{action.prioridade === "critica" ? "Crítica" : action.prioridade === "alta" ? "Alta" : "Preventiva"}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{action.descricao}{action.prazo ? ` · prazo ${formatDateBR(action.prazo)}` : ""}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground cf-transition group-hover:text-primary" />
    </a>
  );
}
