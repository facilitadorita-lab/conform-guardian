import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Clock3,
  Mail,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { SectionHeader } from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { useAlertas } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import type { AlertaResumo } from "@/types";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

const tones: Record<string, "info" | "atencao" | "critico" | "vencido"> = {
  info: "info",
  atencao: "atencao",
  critico: "critico",
  vencido: "vencido",
};

export function AlertasPage() {
  const { data: alertas = [], isLoading, isError, error, refetch } = useAlertas();
  const [busca, setBusca] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState("todos");
  const resumo = useMemo(() => calcularResumo(alertas), [alertas]);

  const alertasFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    return alertas
      .filter((alerta) => {
        const texto = normalizar([alerta.marco, alerta.item, alerta.canal, alerta.nivel].join(" "));
        return (
          (!termo || texto.includes(termo)) &&
          (nivelFiltro === "todos" || alerta.nivel === nivelFiltro)
        );
      })
      .sort(
        (a, b) => nivelPeso(b.nivel) - nivelPeso(a.nivel) || dataPeso(a.data) - dataPeso(b.data),
      );
  }, [alertas, busca, nivelFiltro]);

  return (
    <AppShell
      title="Alertas"
      description="Marcos automáticos de 60, 30, 15, 7 dias, vencimento e pós-vencimento processados pelo backend."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Alertas ativos"
          value={alertas.length}
          description="Notificações geradas para a empresa atual"
          icon={Bell}
          tone="info"
        />
        <ResumoCard
          title="Críticos"
          value={resumo.criticos}
          description="Exigem acompanhamento rápido"
          icon={AlertTriangle}
          tone={resumo.criticos > 0 ? "danger" : "success"}
        />
        <ResumoCard
          title="Vencidos"
          value={resumo.vencidos}
          description="Itens que passaram do prazo"
          icon={Clock3}
          tone={resumo.vencidos > 0 ? "danger" : "success"}
        />
        <ResumoCard
          title="Informativos"
          value={resumo.info}
          description="Acompanhamento sem urgência"
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ChannelCard
          icon={Monitor}
          title="Dashboard"
          desc="Notificações fixas no painel principal."
        />
        <ChannelCard
          icon={Bell}
          title="Central interna"
          desc="Feed com histórico por usuário e empresa."
        />
        <ChannelCard
          icon={Mail}
          title="E-mail"
          desc="Envio agendado em lote pela rotina do backend."
        />
      </div>

      <Surface className="space-y-4">
        <SectionHeader
          title="Agenda de alertas"
          description="Use esta visão para conferir o que o backend disparou e quais itens merecem atenção."
        />

        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="relative">
            <span className="sr-only">Buscar alerta</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por marco, item, canal ou nível..."
              className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </label>
          <select
            value={nivelFiltro}
            onChange={(event) => setNivelFiltro(event.target.value)}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            aria-label="Filtrar alertas por nível"
          >
            <option value="todos">Todos os níveis</option>
            <option value="vencido">Vencidos</option>
            <option value="critico">Críticos</option>
            <option value="atencao">Em atenção</option>
            <option value="info">Informativos</option>
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
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Não foi possível carregar os alertas"
            description={error instanceof Error ? error.message : "Tente novamente em instantes."}
            action={
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-accent hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" /> Tentar novamente
              </button>
            }
          />
        ) : alertasFiltrados.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhum alerta encontrado"
            description="Ajuste os filtros ou aguarde novos alertas gerados pela rotina do backend."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="hidden w-full text-sm lg:table">
              <thead className="bg-muted/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Marco</th>
                  <th className="px-4 py-3 text-left font-semibold">Item</th>
                  <th className="px-4 py-3 text-left font-semibold">Canal</th>
                  <th className="px-4 py-3 text-left font-semibold">Disparo</th>
                  <th className="px-5 py-3 text-left font-semibold">Nível</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alertasFiltrados.map((alerta) => (
                  <AlertaRow key={alerta.id} alerta={alerta} />
                ))}
              </tbody>
            </table>

            <div className="grid gap-0 divide-y divide-border lg:hidden">
              {alertasFiltrados.map((alerta) => (
                <AlertaMobileCard key={alerta.id} alerta={alerta} />
              ))}
            </div>
          </div>
        )}
      </Surface>
    </AppShell>
  );
}

function AlertaRow({ alerta }: { alerta: AlertaResumo }) {
  return (
    <tr className="cf-transition hover:bg-muted/30">
      <td className="px-5 py-4 font-semibold">{alerta.marco}</td>
      <td className="px-4 py-4">{alerta.item}</td>
      <td className="px-4 py-4 text-muted-foreground">{alerta.canal}</td>
      <td className="px-4 py-4 tabular-nums">{formatDateBR(alerta.data)}</td>
      <td className="px-5 py-4">
        <StatusBadge tone={tones[alerta.nivel] ?? "info"}>{labelNivel(alerta.nivel)}</StatusBadge>
      </td>
    </tr>
  );
}

function AlertaMobileCard({ alerta }: { alerta: AlertaResumo }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{alerta.item}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{alerta.marco}</p>
        </div>
        <StatusBadge tone={tones[alerta.nivel] ?? "info"}>{labelNivel(alerta.nivel)}</StatusBadge>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <InfoItem label="Canal" value={alerta.canal} />
        <InfoItem label="Disparo" value={formatDateBR(alerta.data)} />
      </div>
    </article>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Bell;
  title: string;
  desc: string;
}) {
  return (
    <div className="cf-page-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</div>
        </div>
      </div>
    </div>
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
  icon: typeof Bell;
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

function calcularResumo(alertas: AlertaResumo[]) {
  return alertas.reduce(
    (acc, alerta) => {
      if (alerta.nivel === "vencido") acc.vencidos += 1;
      if (alerta.nivel === "critico") acc.criticos += 1;
      if (alerta.nivel === "atencao") acc.atencao += 1;
      if (alerta.nivel === "info") acc.info += 1;
      return acc;
    },
    { vencidos: 0, criticos: 0, atencao: 0, info: 0 },
  );
}

function labelNivel(nivel: string) {
  if (nivel === "info") return "Informativo";
  return statusLabel((tones[nivel] ?? "info") as "info");
}

function nivelPeso(nivel: string) {
  return { vencido: 5, critico: 4, atencao: 3, info: 1 }[nivel] ?? 0;
}

function dataPeso(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function normalizar(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
