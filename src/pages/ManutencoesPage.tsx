import { Plus } from "lucide-react";
import { useManutencoes } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { statusLabel } from "@/utils/status";

export function ManutencoesPage() {
  const { data: manutencoes = [] } = useManutencoes();

  return (
    <AppShell
      title="Manutenções"
      description="Preventivas, corretivas e serviços recorrentes gerais com evidências e ordens de serviço."
      actions={
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nova manutencao
        </button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {["Todas", "Preventiva", "Corretiva", "Recorrente Geral"].map((tipo, index) => (
          <button
            key={tipo}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              index === 0
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            {tipo}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium">ID</th>
              <th className="px-4 py-2.5 text-left font-medium">Equipamento</th>
              <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
              <th className="px-4 py-2.5 text-left font-medium">Data</th>
              <th className="px-4 py-2.5 text-left font-medium">Responsavel</th>
              <th className="px-4 py-2.5 text-left font-medium">OS</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {manutencoes.map((manutencao) => (
              <tr key={manutencao.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 font-mono text-xs">{manutencao.id}</td>
                <td className="px-4 py-3 font-medium">{manutencao.equipamento}</td>
                <td className="px-4 py-3 text-muted-foreground">{manutencao.tipo}</td>
                <td className="px-4 py-3 tabular-nums">{manutencao.data}</td>
                <td className="px-4 py-3 text-muted-foreground">{manutencao.responsavel}</td>
                <td className="px-4 py-3 font-mono text-xs">{manutencao.os}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={manutencao.status}>
                    {statusLabel(manutencao.status)}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
