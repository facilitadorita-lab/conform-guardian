import {
  BarChart3,
  ClipboardList,
  Cog,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useAuthContext, useRelatorios } from "@/hooks/use-conform-data";
import { AppShell } from "@/layouts/app-layout";
import { relatoriosService } from "@/services";
import type { RelatorioExecutivoIA } from "@/types";
import { formatDateBR, formatDateTimeBR } from "@/utils/date";

const iconMap = {
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
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {gerarRelatorio.error instanceof Error
            ? gerarRelatorio.error.message
            : "Não foi possível gerar o relatório."}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {relatorios.map((relatorio) => {
          const Icon = iconMap[relatorio.icon as keyof typeof iconMap];

          return (
            <div key={relatorio.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/5 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{relatorio.title}</div>
                  <div className="text-xs text-muted-foreground">{relatorio.desc}</div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => gerarRelatorio.mutate()}
                  disabled={gerarRelatorio.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-60"
                >
                  <FileDown className="h-3.5 w-3.5" /> PDF IA
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
                  <FileDown className="h-3.5 w-3.5" /> CSV
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function abrirRelatorioPrint(relatorio: RelatorioExecutivoIA) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=1200");
  if (!printWindow) {
    throw new Error("O navegador bloqueou a janela do relatório. Libere pop-ups para exportar PDF.");
  }

  printWindow.document.write(renderRelatorioHtml(relatorio));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}

function renderRelatorioHtml(relatorio: RelatorioExecutivoIA) {
  const resumo = relatorio.resumo;
  const recomendacoes = relatorio.recomendacoes ?? [];
  const analise = relatorio.analise_ia ?? [];
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
  <ul>${analise.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

  <h2>Recomendações prioritárias</h2>
  <ul>${recomendacoes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

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

function kpi(label: string, value: string | number) {
  return `<div class="card"><div class="muted">${escapeHtml(label)}</div><div class="kpi">${escapeHtml(String(value))}</div></div>`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
