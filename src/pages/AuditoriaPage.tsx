import { Lock, ShieldCheck } from "lucide-react";
import { useAuditoria } from "@/hooks/use-conform-data";
import { AppShell } from "@/layouts/app-layout";

export function AuditoriaPage() {
  const { data: auditoria = [] } = useAuditoria();

  return (
    <AppShell
      title="Auditoria"
      description="Logs imutáveis de todas as operações críticas. Trilhas prontas para inspeções."
    >
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            Trilha imutável
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
              <Lock className="h-3 w-3" /> Somente leitura
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Registros de criação, edição, exclusão lógica, anexos, substituição de
            arquivos, downloads, login/logout, acesso do Admin Master e alteração de
            permissões.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium">Data/Hora</th>
              <th className="px-4 py-2.5 text-left font-medium">Usuário</th>
              <th className="px-4 py-2.5 text-left font-medium">Ação</th>
              <th className="px-4 py-2.5 text-left font-medium">Entidade</th>
              <th className="px-4 py-2.5 text-left font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {auditoria.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 text-xs tabular-nums">{log.data}</td>
                <td className="px-4 py-3">{log.usuario}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.acao}</td>
                <td className="px-4 py-3">{log.entidade}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
