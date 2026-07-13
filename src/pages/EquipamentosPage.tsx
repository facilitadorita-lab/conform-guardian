import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import { useEquipamentos } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

export function EquipamentosPage() {
  const { data: equipamentos = [] } = useEquipamentos();

  return (
    <AppShell
      title="Equipamentos"
      description="Cadastro de ativos com calibrações, qualificações, manutenções e evidências."
      actions={
        <>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Novo equipamento
          </button>
        </>
      }
    >
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium">Equipamento</th>
              <th className="px-4 py-2.5 text-left font-medium">Código</th>
              <th className="px-4 py-2.5 text-left font-medium">Fabricante / Modelo</th>
              <th className="px-4 py-2.5 text-left font-medium">Setor</th>
              <th className="px-4 py-2.5 text-left font-medium">Criticidade</th>
              <th className="px-4 py-2.5 text-left font-medium">Prox. Venc.</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-6 py-2.5 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {equipamentos.map((equipamento) => (
              <tr key={equipamento.id} className="hover:bg-muted/30">
                <td className="px-6 py-3">
                  <div className="font-medium">{equipamento.nome}</div>
                  <div className="text-xs text-muted-foreground">{equipamento.tipo}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{equipamento.codigo}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {equipamento.fabricante} · {equipamento.modelo}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{equipamento.setor}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      equipamento.criticidade === "Critica"
                        ? "border-danger/30 bg-danger/5 text-danger"
                        : equipamento.criticidade === "Alta"
                          ? "border-warning/40 bg-warning/5 text-warning"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {equipamento.criticidade}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatDateBR(equipamento.proximoVenc)}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={equipamento.status}>
                    {statusLabel(equipamento.status)}
                  </StatusBadge>
                </td>
                <td className="px-6 py-3 text-right">
                  <Link
                    to="/equipamentos/$id"
                    params={{ id: equipamento.id }}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
