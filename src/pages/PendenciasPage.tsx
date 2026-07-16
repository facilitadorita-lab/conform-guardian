import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Search, UserRoundX } from "lucide-react";
import { SectionHeader } from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { useDashboardData, usePendencias } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import type { PendenciaResumo, StatusConformidade } from "@/types";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

type StatusFiltro = StatusConformidade | "todos";

export function PendenciasPage() {
  const { data: pendencias = [], isLoading } = usePendencias();
  const { data: dashboard } = useDashboardData();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");

  const pendenciasFiltradas = useMemo(() => {
    const termo = normalizar(busca);

    return pendencias
      .filter((pendencia) => {
        const texto = normalizar(
          [
            pendencia.item,
            pendencia.tipo,
            pendencia.responsavel,
            statusLabel(pendencia.status),
          ].join(" "),
        );
        return (
          (!termo || texto.includes(termo)) &&
          (statusFiltro === "todos" || pendencia.status === statusFiltro)
        );
      })
      .sort(
        (a, b) =>
          prioridadePeso(b.status) - prioridadePeso(a.status) || a.diasRestantes - b.diasRestantes,
      );
  }, [busca, pendencias, statusFiltro]);

  const resumo = useMemo(() => calcularResumo(pendencias), [pendencias]);

  return (
    <AppShell
      title="Pendências"
      description="Central consolidada com tratativas, evidências, responsáveis e prazos por empresa."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Pendências críticas"
          value={dashboard?.pendenciasCriticas ?? resumo.criticas}
          description="Demandam tratativa imediata"
          icon={AlertTriangle}
          tone={(dashboard?.pendenciasCriticas ?? resumo.criticas) > 0 ? "danger" : "success"}
        />
        <ResumoCard
          title="Vencidas"
          value={resumo.vencidas}
          description="Itens fora do prazo operacional"
          icon={Clock3}
          tone={resumo.vencidas > 0 ? "danger" : "success"}
        />
        <ResumoCard
          title="Sem responsável"
          value={dashboard?.semResponsavel ?? resumo.semResponsavel}
          description="Atribua dono para rastreabilidade"
          icon={UserRoundX}
          tone={(dashboard?.semResponsavel ?? resumo.semResponsavel) > 0 ? "warning" : "success"}
        />
        <ResumoCard
          title="Em dia"
          value={resumo.emDia}
          description="Pendências concluídas ou sem risco"
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <Surface className="space-y-4">
        <SectionHeader
          title="Lista de pendências"
          description="Priorize primeiro vencidos, críticos e itens sem responsável."
        />

        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="relative">
            <span className="sr-only">Buscar pendência</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por item, tipo, responsável ou status..."
              className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </label>
          <select
            value={statusFiltro}
            onChange={(event) => setStatusFiltro(event.target.value as StatusFiltro)}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            aria-label="Filtrar pendências por status"
          >
            <option value="todos">Todos os status</option>
            <option value="vencido">Vencidas</option>
            <option value="critico">Críticas</option>
            <option value="atencao">Em atenção</option>
            <option value="ok">Em dia</option>
            <option value="sem_validade">Sem validade</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : pendenciasFiltradas.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Nenhuma pendência encontrada"
            description="Ajuste os filtros ou revise se a empresa selecionada possui pendências abertas."
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-border lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Item</th>
                    <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold">Responsável</th>
                    <th className="px-4 py-3 text-left font-semibold">Prazo</th>
                    <th className="px-4 py-3 text-left font-semibold">Prioridade</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {pendenciasFiltradas.map((pendencia) => (
                    <PendenciaRow key={pendencia.id} pendencia={pendencia} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:hidden">
              {pendenciasFiltradas.map((pendencia) => (
                <PendenciaCard key={pendencia.id} pendencia={pendencia} />
              ))}
            </div>
          </>
        )}
      </Surface>
    </AppShell>
  );
}

function PendenciaRow({ pendencia }: { pendencia: PendenciaResumo }) {
  return (
    <tr className="cf-transition hover:bg-muted/30">
      <td className="px-5 py-4">
        <div className="font-semibold text-foreground">{pendencia.item}</div>
        <div className="mt-1 text-xs text-muted-foreground">{descricaoPrazo(pendencia)}</div>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{humanize(pendencia.tipo)}</td>
      <td className="px-4 py-4 text-muted-foreground">{humanize(pendencia.responsavel)}</td>
      <td className="px-4 py-4 tabular-nums">{formatDateBR(pendencia.vencimento)}</td>
      <td className="px-4 py-4">
        <PrioridadeBadge status={pendencia.status} />
      </td>
      <td className="px-5 py-4">
        <StatusBadge tone={pendencia.status}>{statusLabel(pendencia.status)}</StatusBadge>
      </td>
    </tr>
  );
}

function PendenciaCard({ pendencia }: { pendencia: PendenciaResumo }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{pendencia.item}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{humanize(pendencia.tipo)}</p>
        </div>
        <PrioridadeBadge status={pendencia.status} />
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <InfoItem label="Responsável" value={humanize(pendencia.responsavel)} />
        <InfoItem label="Prazo" value={formatDateBR(pendencia.vencimento)} />
        <InfoItem label="Situação" value={descricaoPrazo(pendencia)} />
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Status
          </span>
          <div className="mt-1">
            <StatusBadge tone={pendencia.status}>{statusLabel(pendencia.status)}</StatusBadge>
          </div>
        </div>
      </div>
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 text-foreground">{value || "-"}</div>
    </div>
  );
}

function PrioridadeBadge({ status }: { status: StatusConformidade }) {
  const alta = status === "vencido" || status === "critico";
  const media = status === "atencao";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        alta
          ? "border-danger/30 bg-danger/10 text-danger"
          : media
            ? "border-warning/40 bg-warning/10 text-warning"
            : "border-success/30 bg-success/10 text-success",
      )}
    >
      {alta ? "Alta" : media ? "Média" : "Baixa"}
    </span>
  );
}

function ResumoCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof AlertTriangle;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const toneClass = {
    success: "border-success/20 bg-success/5 text-success",
    warning: "border-warning/25 bg-warning/5 text-warning",
    danger: "border-danger/25 bg-danger/5 text-danger",
    info: "border-accent/20 bg-accent/5 text-accent",
    neutral: "border-border bg-muted/30 text-muted-foreground",
  }[tone];

  return (
    <div className="cf-page-card flex min-h-36 flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </div>
        <div
          className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", toneClass)}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <div className="text-4xl font-semibold tracking-[-0.04em] tabular-nums">{value}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function calcularResumo(pendencias: PendenciaResumo[]) {
  return pendencias.reduce(
    (acc, pendencia) => {
      if (pendencia.status === "vencido") acc.vencidas += 1;
      if (pendencia.status === "critico") acc.criticas += 1;
      if (pendencia.status === "ok") acc.emDia += 1;
      if (normalizar(pendencia.responsavel).includes("sem responsavel")) acc.semResponsavel += 1;
      return acc;
    },
    { vencidas: 0, criticas: 0, semResponsavel: 0, emDia: 0 },
  );
}

function descricaoPrazo(pendencia: PendenciaResumo) {
  if (pendencia.diasRestantes < 0) return `${Math.abs(pendencia.diasRestantes)} dia(s) em atraso`;
  if (pendencia.diasRestantes === 0) return "Vence hoje";
  return `Vence em ${pendencia.diasRestantes} dia(s)`;
}

function prioridadePeso(status: StatusConformidade) {
  return { vencido: 5, critico: 4, atencao: 3, sem_validade: 2, ok: 1 }[status] ?? 0;
}

function normalizar(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function humanize(value: string) {
  return value
    .replaceAll("Ãª", "ê")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã¡", "á")
    .replaceAll("Ã£", "ã")
    .replaceAll("Ã§", "ç")
    .replaceAll("Ã³", "ó")
    .replaceAll("Ã­", "í");
}
