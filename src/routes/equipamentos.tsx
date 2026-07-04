import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { equipamentos, statusLabel } from "@/lib/mock-data";
import { Plus, Download } from "lucide-react";

export const Route = createFileRoute("/equipamentos")({
  head: () => ({ meta: [{ title: "Equipamentos — Conform Flow" }] }),
  component: EquipamentosPage,
});

function EquipamentosPage() {
  return (
    <AppShell
      title="Equipamentos"
      description="Cadastro de ativos com calibrações, qualificações, manutenções e evidências."
      actions={
        <>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted"><Download className="h-4 w-4" /> Exportar</button>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Novo equipamento</button>
        </>
      }
    >
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-2.5">Equipamento</th>
              <th className="text-left font-medium px-4 py-2.5">Código</th>
              <th className="text-left font-medium px-4 py-2.5">Fabricante / Modelo</th>
              <th className="text-left font-medium px-4 py-2.5">Setor</th>
              <th className="text-left font-medium px-4 py-2.5">Criticidade</th>
              <th className="text-left font-medium px-4 py-2.5">Próx. Venc.</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-6 py-2.5">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {equipamentos.map((e) => (
              <tr key={e.id} className="hover:bg-muted/30">
                <td className="px-6 py-3">
                  <div className="font-medium">{e.nome}</div>
                  <div className="text-xs text-muted-foreground">{e.tipo}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{e.codigo}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.fabricante} · {e.modelo}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.setor}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    e.criticidade === "Crítica" ? "border-danger/30 text-danger bg-danger/5"
                      : e.criticidade === "Alta" ? "border-warning/40 text-warning bg-warning/5"
                      : "border-border text-muted-foreground"
                  }`}>{e.criticidade}</span>
                </td>
                <td className="px-4 py-3 tabular-nums">{e.proximoVenc}</td>
                <td className="px-4 py-3"><StatusBadge tone={e.status}>{statusLabel(e.status)}</StatusBadge></td>
                <td className="px-6 py-3 text-right">
                  <Link to="/equipamentos/$id" params={{ id: e.id }} className="text-xs font-medium text-accent hover:underline">Abrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}