import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useDashboardData } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { statusLabel } from "@/utils/status";

export function DashboardPage() {
  const { data } = useDashboardData();
  const dashboard = data ?? {
    indiceConformidade: 0,
    documentosVencidos: 0,
    vencendo7: 0,
    vencendo30: 0,
    vencendo60: 0,
    equipamentosAtencao: 0,
    manutencoesVencidas: 0,
    manutencoesProximas: 0,
    pendenciasCriticas: 0,
    semAnexo: 0,
    semResponsavel: 0,
    pendencias: [],
  };

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
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Índice de Conformidade
            </span>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-5xl font-semibold tabular-nums text-primary">
              {dashboard.indiceConformidade}%
            </span>
            <span className="text-sm font-medium text-success">+2,4 pts</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-success"
              style={{ width: `${dashboard.indiceConformidade}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Calculado no backend considerando documentos, equipamentos, manutenções e
            pendências.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:col-span-2">
          <KpiCard label="Documentos vencidos" value={dashboard.documentosVencidos} tone="vencido" icon={FileWarning} />
          <KpiCard label="Vencendo em 7d" value={dashboard.vencendo7} tone="critico" icon={AlertTriangle} />
          <KpiCard label="Vencendo em 30d" value={dashboard.vencendo30} tone="atencao" icon={AlertTriangle} />
          <KpiCard label="Vencendo em 60d" value={dashboard.vencendo60} tone="info" icon={AlertTriangle} />
          <KpiCard label="Equip. em atenção" value={dashboard.equipamentosAtencao} tone="atencao" icon={AlertTriangle} />
          <KpiCard label="Manut. vencidas" value={dashboard.manutencoesVencidas} tone="vencido" icon={Wrench} />
          <KpiCard label="Manut. próximas" value={dashboard.manutencoesProximas} tone="atencao" icon={Wrench} />
          <KpiCard label="Pendências críticas" value={dashboard.pendenciasCriticas} tone="critico" icon={ClipboardList} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MiniStat label="Registros sem responsável" value={dashboard.semResponsavel} hint="Atribuir para permitir rastreabilidade" />
        <MiniStat label="Conformidade geral" value={`${dashboard.indiceConformidade}%`} hint="Meta operacional: >= 95%" tone="ok" />
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Pendências Críticas</h2>
            <p className="text-xs text-muted-foreground">
              Itens que exigem tratativa imediata.
            </p>
          </div>
          <button className="text-xs font-medium text-accent hover:underline">
            Ver todas
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-2.5 text-left font-medium">Item</th>
                <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                <th className="px-4 py-2.5 text-left font-medium">Responsavel</th>
                <th className="px-4 py-2.5 text-left font-medium">Vencimento</th>
                <th className="px-4 py-2.5 text-left font-medium">Dias</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-6 py-2.5 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dashboard.pendencias.map((pendencia) => (
                <tr key={pendencia.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{pendencia.item}</td>
                  <td className="px-4 py-3 text-muted-foreground">{pendencia.tipo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{pendencia.responsavel}</td>
                  <td className="px-4 py-3 tabular-nums">{pendencia.vencimento}</td>
                  <td
                    className={`px-4 py-3 font-medium tabular-nums ${
                      pendencia.diasRestantes < 0
                        ? "text-danger"
                        : pendencia.diasRestantes < 7
                          ? "text-warning"
                          : ""
                    }`}
                  >
                    {pendencia.diasRestantes < 0
                      ? `${Math.abs(pendencia.diasRestantes)}d atraso`
                      : `${pendencia.diasRestantes}d`}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={pendencia.status}>
                      {statusLabel(pendencia.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-xs font-medium text-accent hover:underline">
                      Abrir
                    </button>
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
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${toneColor[tone]}`} />
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneColor[tone]}`}>
        {value}
      </div>
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
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          tone === "ok" ? "text-success" : "text-primary"
        }`}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
