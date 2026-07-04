import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/app-shell";
import {
  kpis,
  pendenciasCriticas,
  statusLabel,
} from "@/lib/mock-data";
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Wrench,
  ClipboardList,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppShell
      title="Dashboard"
      description="Visão consolidada de conformidade, vencimentos e pendências críticas."
      actions={
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Exportar relatório <ArrowRight className="h-4 w-4" />
        </button>
      }
    >
      {/* Índice principal */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Índice de Conformidade
            </span>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-5xl font-semibold text-primary tabular-nums">{kpis.indiceConformidade}%</span>
            <span className="text-sm text-success font-medium">+2,4 pts</span>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-success" style={{ width: `${kpis.indiceConformidade}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Calculado no backend considerando documentos, equipamentos, manutenções e pendências.
          </p>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Documentos vencidos" value={kpis.documentosVencidos} tone="vencido" icon={FileWarning} />
          <KpiCard label="Vencendo em 7d" value={kpis.vencendo7} tone="critico" icon={AlertTriangle} />
          <KpiCard label="Vencendo em 30d" value={kpis.vencendo30} tone="atencao" icon={AlertTriangle} />
          <KpiCard label="Vencendo em 60d" value={kpis.vencendo60} tone="info" icon={AlertTriangle} />
          <KpiCard label="Equip. em atenção" value={kpis.equipamentosAtencao} tone="atencao" icon={AlertTriangle} />
          <KpiCard label="Manut. vencidas" value={kpis.manutencoesVencidas} tone="vencido" icon={Wrench} />
          <KpiCard label="Manut. próximas" value={kpis.manutencoesProximas} tone="atencao" icon={Wrench} />
          <KpiCard label="Pendências críticas" value={kpis.pendenciasCriticas} tone="critico" icon={ClipboardList} />
        </div>
      </section>

      {/* Linha de higiene */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniStat label="Registros sem anexo" value={kpis.semAnexo} hint="Exigem evidência para conformidade" />
        <MiniStat label="Registros sem responsável" value={kpis.semResponsavel} hint="Atribuir para permitir rastreabilidade" />
        <MiniStat label="Conformidade geral" value={`${kpis.indiceConformidade}%`} hint="Meta operacional: ≥ 95%" tone="ok" />
      </section>

      {/* Pendências críticas */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">Pendências Críticas</h2>
            <p className="text-xs text-muted-foreground">Itens que exigem tratativa imediata.</p>
          </div>
          <button className="text-xs font-medium text-accent hover:underline">Ver todas</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-6 py-2.5">Item</th>
                <th className="text-left font-medium px-4 py-2.5">Tipo</th>
                <th className="text-left font-medium px-4 py-2.5">Responsável</th>
                <th className="text-left font-medium px-4 py-2.5">Vencimento</th>
                <th className="text-left font-medium px-4 py-2.5">Dias</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-right font-medium px-6 py-2.5">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pendenciasCriticas.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{p.item}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.tipo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.responsavel}</td>
                  <td className="px-4 py-3 tabular-nums">{p.vencimento}</td>
                  <td className={`px-4 py-3 tabular-nums font-medium ${p.diasRestantes < 0 ? "text-danger" : p.diasRestantes < 7 ? "text-warning" : ""}`}>
                    {p.diasRestantes < 0 ? `${Math.abs(p.diasRestantes)}d atraso` : `${p.diasRestantes}d`}
                  </td>
                  <td className="px-4 py-3"><StatusBadge tone={p.status}>{statusLabel(p.status)}</StatusBadge></td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-xs font-medium text-accent hover:underline">Abrir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function KpiCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "vencido" | "critico" | "atencao" | "ok" | "info";
  icon: typeof CheckCircle2;
}) {
  const toneColor: Record<string, string> = {
    vencido: "text-danger",
    critico: "text-danger",
    atencao: "text-warning",
    ok: "text-success",
    info: "text-accent",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${toneColor[tone]}`} />
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneColor[tone]}`}>{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "ok";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${tone === "ok" ? "text-success" : "text-primary"}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
