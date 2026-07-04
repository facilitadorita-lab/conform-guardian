import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { auditoriaLogs } from "@/lib/mock-data";
import { ShieldCheck, Lock } from "lucide-react";

export const Route = createFileRoute("/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Conform Flow" }] }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  return (
    <AppShell
      title="Auditoria"
      description="Logs imutáveis de todas as operações críticas. Trilhas prontas para inspeções."
    >
      <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            Trilha imutável <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success"><Lock className="h-3 w-3" /> Somente leitura</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registros de criação, edição, exclusão lógica, anexos, substituição de arquivos, downloads, login/logout, acesso do Admin Master e alteração de permissões.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-2.5">Data/Hora</th>
              <th className="text-left font-medium px-4 py-2.5">Usuário</th>
              <th className="text-left font-medium px-4 py-2.5">Ação</th>
              <th className="text-left font-medium px-4 py-2.5">Entidade</th>
              <th className="text-left font-medium px-4 py-2.5">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {auditoriaLogs.map((l) => (
              <tr key={l.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 tabular-nums text-xs">{l.data}</td>
                <td className="px-4 py-3">{l.usuario}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.acao}</td>
                <td className="px-4 py-3">{l.entidade}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}