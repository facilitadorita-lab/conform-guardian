import {
  BarChart3,
  ClipboardList,
  Cog,
  FileDown,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useRelatorios } from "@/hooks/use-conform-data";
import { AppShell } from "@/layouts/app-layout";

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

  return (
    <AppShell
      title="Relatórios"
      description="Geração de relatórios via backend com exportação em PDF, Excel e CSV."
    >
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
                <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
                  <FileDown className="h-3.5 w-3.5" /> PDF
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
