import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { documentos, statusLabel } from "@/lib/mock-data";
import { Download, Filter, Plus, Paperclip } from "lucide-react";

export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [{ title: "Documentos — Conform Flow" }] }),
  component: DocumentosPage,
});

function DocumentosPage() {
  return (
    <AppShell
      title="Documentos"
      description="Licenças, alvarás, contratos e evidências regulatórias com versionamento."
      actions={
        <>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Novo documento
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile label="Em dia" value={documentos.filter((d) => d.status === "ok").length} tone="ok" />
        <SummaryTile label="Atenção" value={documentos.filter((d) => d.status === "atencao").length} tone="atencao" />
        <SummaryTile label="Críticos" value={documentos.filter((d) => d.status === "critico").length} tone="critico" />
        <SummaryTile label="Vencidos" value={documentos.filter((d) => d.status === "vencido").length} tone="vencido" />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border">
          <input placeholder="Buscar por nome, número, órgão…" className="h-9 flex-1 min-w-[240px] rounded-md border border-input bg-background px-3 text-sm" />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>Todos os status</option></select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>Todas as categorias</option></select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>Todos os responsáveis</option></select>
          <button className="inline-flex items-center gap-2 h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"><Filter className="h-4 w-4" /> Filtros</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-6 py-2.5">Nome</th>
                <th className="text-left font-medium px-4 py-2.5">Categoria</th>
                <th className="text-left font-medium px-4 py-2.5">Nº / Órgão</th>
                <th className="text-left font-medium px-4 py-2.5">Responsável</th>
                <th className="text-left font-medium px-4 py-2.5">Emissão</th>
                <th className="text-left font-medium px-4 py-2.5">Vencimento</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-right font-medium px-6 py-2.5">Anexo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documentos.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3">
                    <div className="font-medium">{d.nome}</div>
                    <div className="text-xs text-muted-foreground">{d.tipo} · {d.setor}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.categoria}</td>
                  <td className="px-4 py-3">
                    <div className="tabular-nums">{d.numero}</div>
                    <div className="text-xs text-muted-foreground">{d.orgao}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.responsavel}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{d.emissao}</td>
                  <td className="px-4 py-3 tabular-nums">{d.vencimento}</td>
                  <td className="px-4 py-3"><StatusBadge tone={d.status}>{statusLabel(d.status)}</StatusBadge></td>
                  <td className="px-6 py-3 text-right">
                    <button className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                      <Paperclip className="h-3.5 w-3.5" /> Baixar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-border text-xs text-muted-foreground">
          <span>Mostrando {documentos.length} de {documentos.length} documentos</span>
          <div className="flex items-center gap-1">
            <button className="h-7 px-2 rounded border border-border hover:bg-muted">Anterior</button>
            <button className="h-7 px-2 rounded border border-border hover:bg-muted">Próximo</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "ok" | "atencao" | "critico" | "vencido" }) {
  const toneColor = { ok: "text-success", atencao: "text-warning", critico: "text-danger", vencido: "text-danger" }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneColor}`}>{value}</div>
    </div>
  );
}