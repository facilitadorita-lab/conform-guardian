import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { manutencoes, statusLabel } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/manutencoes")({
  head: () => ({ meta: [{ title: "Manutenções — Conform Flow" }] }),
  component: ManutencoesPage,
});

function ManutencoesPage() {
  return (
    <AppShell
      title="Manutenções"
      description="Preventivas, corretivas e serviços recorrentes gerais com evidências e ordens de serviço."
      actions={
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nova manutenção
        </button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {["Todas", "Preventiva", "Corretiva", "Recorrente Geral"].map((t, i) => (
          <button key={t} className={`rounded-md border px-3 py-1.5 text-sm ${i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>{t}</button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-2.5">ID</th>
              <th className="text-left font-medium px-4 py-2.5">Equipamento</th>
              <th className="text-left font-medium px-4 py-2.5">Tipo</th>
              <th className="text-left font-medium px-4 py-2.5">Data</th>
              <th className="text-left font-medium px-4 py-2.5">Responsável</th>
              <th className="text-left font-medium px-4 py-2.5">OS</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {manutencoes.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 font-mono text-xs">{m.id}</td>
                <td className="px-4 py-3 font-medium">{m.equipamento}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.tipo}</td>
                <td className="px-4 py-3 tabular-nums">{m.data}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.responsavel}</td>
                <td className="px-4 py-3 font-mono text-xs">{m.os}</td>
                <td className="px-4 py-3"><StatusBadge tone={m.status}>{statusLabel(m.status)}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}