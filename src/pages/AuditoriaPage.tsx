import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileClock,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { useAuditoriaAvancada } from "@/hooks/use-conform-data";
import { AppShell } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import type { LogAuditoriaResumo } from "@/types";
import { formatDateTimeBR } from "@/utils/date";

type RiscoFiltro = "todos" | "baixo" | "medio" | "alto";

export function AuditoriaPage() {
  const { data: auditoria, isLoading } = useAuditoriaAvancada();
  const [busca, setBusca] = useState("");
  const [riscoFiltro, setRiscoFiltro] = useState<RiscoFiltro>("todos");
  const eventos = useMemo(() => auditoria?.eventos ?? [], [auditoria?.eventos]);

  const eventosFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    return eventos.filter((log) => {
      const texto = normalizar(
        [log.usuario, log.acao, log.entidade, log.categoria, log.ip].join(" "),
      );
      const atendeBusca = !termo || texto.includes(termo);
      const atendeRisco = riscoFiltro === "todos" || (log.risco ?? "baixo") === riscoFiltro;
      return atendeBusca && atendeRisco;
    });
  }, [busca, eventos, riscoFiltro]);

  return (
    <AppShell
      title="Auditoria"
      description="Trilha avançada de eventos, acessos, anexos, downloads, substituições e ações críticas."
    >
      <div className="cf-page-card flex items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Trilha imutável
            <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
              <Lock className="h-3 w-3" /> Somente leitura
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            O backend classifica risco, categoria e mantém antes/depois quando disponível. Cada
            empresa enxerga apenas os eventos do próprio ambiente.
          </p>
        </div>
      </div>

      {auditoria ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AuditCard label="Eventos 30d" value={auditoria.resumo.eventos_30d} icon={FileClock} />
          <AuditCard
            label="Alto risco"
            value={auditoria.resumo.eventos_alto_risco_30d}
            icon={ShieldAlert}
            tone="danger"
          />
          <AuditCard label="Visualizações" value={auditoria.resumo.visualizacoes_30d} icon={Eye} />
          <AuditCard label="Downloads" value={auditoria.resumo.downloads_30d} icon={Download} />
          <AuditCard
            label="Substituições"
            value={auditoria.resumo.substituicoes_30d}
            icon={Upload}
          />
        </section>
      ) : null}

      <Surface className="space-y-4">
        <SectionHeader
          title="Eventos registrados"
          description="Pesquise eventos, filtre por risco e acompanhe a trilha de segurança operacional."
          action={
            <button
              type="button"
              onClick={() => exportarAuditoriaCsv(eventosFiltrados)}
              disabled={eventosFiltrados.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold cf-transition hover:border-accent/30 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </button>
          }
        />

        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="relative">
            <span className="sr-only">Buscar evento</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por usuário, ação, módulo, categoria ou IP..."
              className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </label>
          <select
            value={riscoFiltro}
            onChange={(event) => setRiscoFiltro(event.target.value as RiscoFiltro)}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            aria-label="Filtrar eventos por risco"
          >
            <option value="todos">Todos os riscos</option>
            <option value="alto">Alto risco</option>
            <option value="medio">Médio risco</option>
            <option value="baixo">Baixo risco</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum evento encontrado"
            description="Ajuste a busca ou o filtro de risco para visualizar a trilha de auditoria."
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-border lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Data/Hora</th>
                    <th className="px-4 py-3 text-left font-semibold">Usuário</th>
                    <th className="px-4 py-3 text-left font-semibold">Categoria</th>
                    <th className="px-4 py-3 text-left font-semibold">Ação</th>
                    <th className="px-4 py-3 text-left font-semibold">Módulo</th>
                    <th className="px-4 py-3 text-left font-semibold">Risco</th>
                    <th className="px-5 py-3 text-left font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {eventosFiltrados.map((log) => (
                    <AuditRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:hidden">
              {eventosFiltrados.map((log) => (
                <AuditMobileCard key={log.id} log={log} />
              ))}
            </div>
          </>
        )}
      </Surface>
    </AppShell>
  );
}

function AuditRow({ log }: { log: LogAuditoriaResumo }) {
  return (
    <tr className="cf-transition hover:bg-muted/30">
      <td className="px-5 py-4 text-xs tabular-nums">{formatDateTimeBR(log.data)}</td>
      <td className="px-4 py-4 font-medium">{log.usuario}</td>
      <td className="px-4 py-4 text-muted-foreground">{humanize(log.categoria ?? "Sistema")}</td>
      <td className="px-4 py-4 text-muted-foreground">{humanizeAction(log.acao)}</td>
      <td className="px-4 py-4">{humanize(log.entidade)}</td>
      <td className="px-4 py-4">
        <RiskBadge risco={log.risco} />
      </td>
      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{log.ip}</td>
    </tr>
  );
}

function AuditMobileCard({ log }: { log: LogAuditoriaResumo }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{humanizeAction(log.acao)}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeBR(log.data)}</p>
        </div>
        <RiskBadge risco={log.risco} />
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <InfoItem label="Usuário" value={log.usuario} />
        <InfoItem label="Módulo" value={humanize(log.entidade)} />
        <InfoItem label="Categoria" value={humanize(log.categoria ?? "Sistema")} />
        <InfoItem label="IP" value={log.ip} />
      </div>
    </article>
  );
}

function AuditCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "danger" | "neutral";
}) {
  return (
    <div className="cf-page-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-2xl",
            tone === "danger" ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div
        className={cn(
          "mt-3 text-3xl font-semibold tabular-nums",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function RiskBadge({ risco }: { risco?: string }) {
  return (
    <span
      className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", riskClass(risco))}
    >
      {riskLabel(risco)}
    </span>
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

function exportarAuditoriaCsv(eventos: LogAuditoriaResumo[]) {
  const rows = [
    ["Data/Hora", "Usuário", "Categoria", "Ação", "Módulo", "Risco", "IP"],
    ...eventos.map((log) => [
      formatDateTimeBR(log.data),
      log.usuario,
      log.categoria ?? "Sistema",
      humanizeAction(log.acao),
      log.entidade,
      riskLabel(log.risco),
      log.ip,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "auditoria-conform-flow.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function riskClass(risco?: string) {
  if (risco === "alto") return "border-danger/30 bg-danger/10 text-danger";
  if (risco === "medio") return "border-warning/40 bg-warning/10 text-warning";
  return "border-success/30 bg-success/10 text-success";
}

function riskLabel(risco?: string) {
  if (risco === "alto") return "Alto";
  if (risco === "medio") return "Médio";
  return "Baixo";
}

function humanizeAction(acao: string) {
  return humanize(acao.replaceAll("_", " "));
}

function humanize(value: string) {
  return value
    .replaceAll("Ã§", "ç")
    .replaceAll("Ã£", "ã")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã­", "í")
    .replaceAll("Ã³", "ó")
    .replaceAll("Ãº", "ú")
    .replaceAll("Ãª", "ê")
    .replaceAll("OperaÃ§Ã£o crÃ­tica", "Operação crítica");
}

function normalizar(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}
