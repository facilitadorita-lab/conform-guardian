import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Cog,
  FileDown,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { useAuthContext, useRelatorios } from "@/hooks/use-conform-data";
import { AppShell } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import { relatoriosService } from "@/services";
import type { RelatorioCatalogoItem, RelatorioExecutivoIA } from "@/types";
import { formatDateBR, formatDateTimeBR } from "@/utils/date";

const iconMap: Record<string, LucideIcon> = {
  "bar-chart-3": BarChart3,
  "clipboard-list": ClipboardList,
  cog: Cog,
  "file-text": FileText,
  "shield-check": ShieldCheck,
  wrench: Wrench,
};

export function RelatoriosPage() {
  const { data: relatorios = [] } = useRelatorios();
  const { data: authContext } = useAuthContext();
  const [busca, setBusca] = useState("");
  const relatoriosFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return relatorios;
    return relatorios.filter((relatorio) =>
      normalizar(`${relatorio.title} ${relatorio.desc}`).includes(termo),
    );
  }, [busca, relatorios]);

  const gerarRelatorio = useMutation({
    mutationFn: () => relatoriosService.gerarExecutivoIA(authContext!.empresaAtual.id),
    onSuccess: (relatorio) => abrirRelatorioPrint(relatorio),
  });

  return (
    <AppShell
      title="Relatórios"
      description="Geração de relatórios executivos com IA segura, sem leitura de anexos confidenciais."
      actions={
        <button
          type="button"
          onClick={() => gerarRelatorio.mutate()}
          disabled={!authContext?.empresaAtual.id || gerarRelatorio.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm cf-transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {gerarRelatorio.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Gerar PDF executivo com IA
        </button>
      }
    >
      {gerarRelatorio.error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {gerarRelatorio.error instanceof Error
            ? gerarRelatorio.error.message
            : "Não foi possível gerar o relatório."}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Modelos disponíveis"
          value={relatorios.length}
          description="Catálogo preparado para operação"
          icon={FileText}
          tone="info"
        />
        <ResumoCard
          title="IA segura"
          value="Sem anexos"
          description="A IA usa apenas dados estruturados"
          icon={ShieldCheck}
          tone="success"
        />
        <ResumoCard
          title="Exportação"
          value="PDF"
          description="Saída pronta para salvar ou imprimir"
          icon={FileDown}
          tone="neutral"
        />
        <ResumoCard
          title="Atenção"
          value="Pop-up"
          description="Libere pop-ups para gerar o PDF"
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <Surface className="space-y-4">
        <SectionHeader
          title="Catálogo de relatórios"
          description="Escolha o relatório e gere uma saída executiva com rastreabilidade."
          action={
            <button
              type="button"
              onClick={() => exportarCatalogoCsv(relatoriosFiltrados)}
              disabled={relatoriosFiltrados.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold cf-transition hover:border-accent/30 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" /> Exportar catálogo CSV
            </button>
          }
        />

        <label className="relative block">
          <span className="sr-only">Buscar relatório</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por relatório, módulo ou finalidade..."
            className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
        </label>

        {relatoriosFiltrados.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum relatório encontrado"
            description="Ajuste a busca para voltar ao catálogo completo de relatórios."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {relatoriosFiltrados.map((relatorio) => (
              <RelatorioCard
                key={relatorio.id}
                relatorio={relatorio}
                isGenerating={gerarRelatorio.isPending}
                onGenerate={() => gerarRelatorio.mutate()}
              />
            ))}
          </div>
        )}
      </Surface>
    </AppShell>
  );
}

function RelatorioCard({
  relatorio,
  isGenerating,
  onGenerate,
}: {
  relatorio: RelatorioCatalogoItem;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const Icon = iconMap[relatorio.icon] ?? FileText;

  return (
    <article className="flex min-h-52 flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm cf-transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[var(--cf-shadow-soft)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{relatorio.title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{relatorio.desc}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground cf-transition hover:bg-primary/90 disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          PDF IA
        </button>
        <button
          type="button"
          onClick={() => exportarCatalogoCsv([relatorio])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold cf-transition hover:border-accent/30 hover:bg-muted/40"
        >
          <FileDown className="h-3.5 w-3.5" /> CSV
        </button>
      </div>
    </article>
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
  value: number | string;
  description: string;
  icon: LucideIcon;
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
        <div className="text-3xl font-semibold tracking-[-0.04em] tabular-nums">{value}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function abrirRelatorioPrint(relatorio: RelatorioExecutivoIA) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=1200");
  if (!printWindow) {
    throw new Error(
      "O navegador bloqueou a janela do relatório. Libere pop-ups para exportar PDF.",
    );
  }

  printWindow.document.write(renderRelatorioHtml(relatorio));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}

function renderRelatorioHtml(relatorio: RelatorioExecutivoIA) {
  const resumo = relatorio.resumo;
  const matriz = relatorio.matriz_documental;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório Executivo - ${escapeHtml(relatorio.empresa.nome_fantasia)}</title>
  <style>
    @page { margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #0f172a; line-height: 1.45; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #0f766e; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-weight: 800; font-size: 22px; color: #0f766e; }
    .muted { color: #64748b; font-size: 12px; }
    h1 { font-size: 24px; margin: 4px 0 0; }
    h2 { font-size: 16px; margin: 26px 0 10px; color: #0f766e; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; }
    .kpi { font-size: 24px; font-weight: 800; }
    ul { padding-left: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; color: #475569; }
    .pill { display: inline-block; border-radius: 999px; padding: 2px 8px; background: #ccfbf1; color: #115e59; font-size: 11px; font-weight: 700; }
    .notice { border: 1px solid #fbbf24; background: #fffbeb; padding: 10px 12px; border-radius: 10px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Conform Flow</div>
      <h1>Relatório Executivo com IA</h1>
      <div class="muted">Gerado em ${formatDateTimeBR(relatorio.gerado_em)}</div>
    </div>
    <div>
      <strong>${escapeHtml(relatorio.empresa.razao_social)}</strong><br />
      <span class="muted">CNPJ ${escapeHtml(relatorio.empresa.cnpj)}</span><br />
      <span class="pill">Risco ${escapeHtml(resumo.risco_operacional)}</span>
    </div>
  </div>

  <div class="notice">
    IA segura: ${escapeHtml(relatorio.politica_ia.fonte)}. Nenhum anexo, PDF ou imagem confidencial foi lido.
  </div>

  <h2>Resumo executivo</h2>
  <div class="grid">
    ${kpi("Conformidade", `${resumo.indice_conformidade}%`)}
    ${kpi("Docs vencidos", resumo.documentos_vencidos)}
    ${kpi("Vencendo 30d", resumo.vencendo_30_dias)}
    ${kpi("Onboarding", `${resumo.onboarding_percentual}%`)}
  </div>

  <h2>Análise da IA</h2>
  <ul>${(relatorio.analise_ia ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

  <h2>Recomendações prioritárias</h2>
  <ul>${(relatorio.recomendacoes ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

  <h2>Matriz documental</h2>
  <p class="muted">Exigidos: ${matriz.resumo.exigidos} · cadastrados: ${matriz.resumo.cadastrados}</p>
  <table>
    <thead><tr><th>Documento</th><th>Segmento</th><th>Status</th></tr></thead>
    <tbody>
      ${matriz.itens
        .slice(0, 30)
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.nome)}</td><td>${escapeHtml(item.segmento_chave)}</td><td>${escapeHtml(String(item.status))}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>

  <h2>Itens críticos</h2>
  <table>
    <thead><tr><th>Item</th><th>Módulo</th><th>Prazo</th><th>Status</th></tr></thead>
    <tbody>
      ${(relatorio.itens_criticos ?? [])
        .slice(0, 12)
        .map(
          (item) =>
            `<tr><td>${escapeHtml(String(item.titulo ?? "Item"))}</td><td>${escapeHtml(String(item.modulo ?? "—"))}</td><td>${escapeHtml(formatDateBR(String(item.prazo ?? "")))}</td><td>${escapeHtml(String(item.status ?? "—"))}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;
}

function exportarCatalogoCsv(relatorios: RelatorioCatalogoItem[]) {
  const rows = [
    ["Relatório", "Descrição"],
    ...relatorios.map((relatorio) => [relatorio.title, relatorio.desc]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "catalogo-relatorios-conform-flow.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function kpi(label: string, value: string | number) {
  return `<div class="card"><div class="muted">${escapeHtml(label)}</div><div class="kpi">${escapeHtml(String(value))}</div></div>`;
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizar(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
