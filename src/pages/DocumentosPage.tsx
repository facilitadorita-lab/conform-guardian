import { Download, Filter, Paperclip, Plus } from "lucide-react";
import { useDocumentos } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { statusLabel } from "@/utils/status";

export function DocumentosPage() {
  const { data: documentos = [] } = useDocumentos();

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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile label="Em dia" value={documentos.filter((item) => item.status === "ok").length} tone="ok" />
        <SummaryTile label="Atenção" value={documentos.filter((item) => item.status === "atencao").length} tone="atencao" />
        <SummaryTile label="Críticos" value={documentos.filter((item) => item.status === "critico").length} tone="critico" />
        <SummaryTile label="Vencidos" value={documentos.filter((item) => item.status === "vencido").length} tone="vencido" />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <input
            placeholder="Buscar por nome, número, órgão..."
            className="h-9 min-w-[240px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option>Todos os status</option>
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option>Todas as categorias</option>
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option>Todos os responsaveis</option>
          </select>
          <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted">
            <Filter className="h-4 w-4" /> Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-2.5 text-left font-medium">Nome</th>
                <th className="px-4 py-2.5 text-left font-medium">Categoria</th>
                <th className="px-4 py-2.5 text-left font-medium">Número / Órgão</th>
                <th className="px-4 py-2.5 text-left font-medium">Responsável</th>
                <th className="px-4 py-2.5 text-left font-medium">Emissão</th>
                <th className="px-4 py-2.5 text-left font-medium">Vencimento</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-6 py-2.5 text-right font-medium">Anexo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documentos.map((documento) => (
                <tr key={documento.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3">
                    <div className="font-medium">{documento.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {documento.tipo} · {documento.setor}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{documento.categoria}</td>
                  <td className="px-4 py-3">
                    <div className="tabular-nums">{documento.numero}</div>
                    <div className="text-xs text-muted-foreground">{documento.orgao}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{documento.responsavel}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{documento.emissao}</td>
                  <td className="px-4 py-3 tabular-nums">{documento.vencimento}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={documento.status}>
                      {statusLabel(documento.status)}
                    </StatusBadge>
                  </td>
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

        <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground">
          <span>
            Mostrando {documentos.length} de {documentos.length} documentos
          </span>
          <div className="flex items-center gap-1">
            <button className="h-7 rounded border border-border px-2 hover:bg-muted">
              Anterior
            </button>
            <button className="h-7 rounded border border-border px-2 hover:bg-muted">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "atencao" | "critico" | "vencido";
}) {
  const toneColor = {
    ok: "text-success",
    atencao: "text-warning",
    critico: "text-danger",
    vencido: "text-danger",
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneColor}`}>
        {value}
      </div>
    </div>
  );
}
