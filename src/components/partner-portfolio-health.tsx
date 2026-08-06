import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { professionalService } from "@/services";
import { formatDateBR } from "@/utils/date";
import { cn } from "@/lib/utils";

export function PartnerPortfolioHealth({ partnerCompanyId }: { partnerCompanyId: string }) {
  const health = useQuery({
    queryKey: ["partner", "portfolio-health", partnerCompanyId],
    queryFn: () => professionalService.partnerPortfolioHealth(partnerCompanyId),
    enabled: Boolean(partnerCompanyId),
    staleTime: 45_000,
  });

  if (health.isLoading) return <div className="h-52 animate-pulse rounded-2xl border border-border bg-muted/40" />;
  if (!health.data || health.isError) return null;
  const data = health.data;

  return (
    <section className="rounded-2xl border border-primary/15 bg-primary/[0.025] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldAlert className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold">Saúde da carteira</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Indicadores dos clientes vinculados a este parceiro. A carteira não inclui clientes de outros parceiros.</p>
          </div>
        </div>
        <span className="rounded-full border border-primary/20 bg-background px-2.5 py-1 text-[11px] font-semibold text-primary">Dados isolados</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PortfolioMetric label="Clientes" value={data.resumo.clientes} />
        <PortfolioMetric label="Em risco" value={data.resumo.clientes_em_risco} tone={data.resumo.clientes_em_risco ? "danger" : "success"} />
        <PortfolioMetric label="Em atenção" value={data.resumo.clientes_em_atencao} tone={data.resumo.clientes_em_atencao ? "warning" : "success"} />
        <PortfolioMetric label="Vencimentos 30d" value={data.resumo.vencimentos_30d} tone={data.resumo.vencimentos_30d ? "warning" : "success"} />
        <PortfolioMetric label="Pendências" value={data.resumo.pendencias_criticas} tone={data.resumo.pendencias_criticas ? "danger" : "success"} />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        {data.clientes.length === 0 ? (
          <div className="flex items-center gap-3 p-5 text-sm text-muted-foreground"><Building2 className="h-5 w-5" /> Nenhum cliente vinculado à carteira ainda.</div>
        ) : (
          <div className="divide-y divide-border">
            {data.clientes.slice(0, 8).map((client) => (
              <div key={client.empresa_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-[180px] flex-1"><div className="text-sm font-semibold">{client.nome}</div><div className="mt-0.5 text-xs text-muted-foreground">CNPJ {client.cnpj}</div></div>
                <RiskBadge risk={client.risco} />
                <span className="text-xs text-muted-foreground">{client.vencimentos_30d} vencimento(s)</span>
                <span className="text-xs text-muted-foreground">{client.pendencias_criticas} pendência(s)</span>
                {client.proximo_vencimento ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {formatDateBR(client.proximo_vencimento)}</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PortfolioMetric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "danger" | "warning" | "success" | "neutral" }) {
  return <div className="rounded-xl border border-border/70 bg-background/70 p-3"><div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</div><div className={cn("mt-1 text-xl font-semibold tabular-nums", tone === "danger" && "text-danger", tone === "warning" && "text-warning", tone === "success" && "text-success")}>{value}</div></div>;
}

function RiskBadge({ risk }: { risk: "alto" | "medio" | "baixo" }) {
  const className = risk === "alto" ? "border-danger/25 bg-danger/10 text-danger" : risk === "medio" ? "border-warning/25 bg-warning/10 text-warning" : "border-success/25 bg-success/10 text-success";
  const Icon = risk === "alto" ? AlertTriangle : risk === "medio" ? Clock3 : CheckCircle2;
  const label = risk === "alto" ? "Risco alto" : risk === "medio" ? "Em atenção" : "Regular";
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold", className)}><Icon className="h-3.5 w-3.5" />{label}</span>;
}
