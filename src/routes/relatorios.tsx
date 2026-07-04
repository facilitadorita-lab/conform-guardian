import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { FileText, FileSpreadsheet, FileDown, BarChart3, ClipboardList, Wrench, Cog, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Conform Flow" }] }),
  component: RelatoriosPage,
});

const relatorios = [
  { title: "Conformidade Geral", desc: "Índice consolidado por setor e período.", icon: BarChart3 },
  { title: "Documentos", desc: "Vencimentos, versões e responsáveis.", icon: FileText },
  { title: "Equipamentos", desc: "Calibrações, qualificações e criticidade.", icon: Cog },
  { title: "Manutenções", desc: "Preventivas, corretivas e MTBF/MTTR.", icon: Wrench },
  { title: "Pendências", desc: "Tratativas, prazos e evidências.", icon: ClipboardList },
  { title: "Histórico de Auditoria", desc: "Logs imutáveis para compliance.", icon: ShieldCheck },
];

function RelatoriosPage() {
  return (
    <AppShell
      title="Relatórios"
      description="Geração de relatórios via backend com exportação em PDF, Excel e CSV."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatorios.map((r) => (
          <div key={r.title} className="rounded-xl border border-border bg-card p-5 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/5 text-primary flex items-center justify-center">
                <r.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"><FileDown className="h-3.5 w-3.5" /> PDF</button>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"><FileDown className="h-3.5 w-3.5" /> CSV</button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}