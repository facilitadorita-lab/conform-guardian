import { Download, Eye, FileClock, Lock, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { useAuditoriaAvancada } from "@/hooks/use-conform-data";
import { AppShell } from "@/layouts/app-layout";
import { formatDateTimeBR } from "@/utils/date";

export function AuditoriaPage() {
  const { data: auditoria } = useAuditoriaAvancada();
  const eventos = auditoria?.eventos ?? [];

  return (
    <AppShell
      title="Auditoria"
      description="Trilha avançada de eventos, acessos, anexos, downloads, substituições e ações críticas."
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
            O backend classifica risco, categoria e mantém antes/depois quando disponível. A empresa
            só enxerga eventos do próprio ambiente.
          </p>
        </div>
      </div>

      {auditoria ? (
        <section className="grid gap-4 md:grid-cols-5">
          <AuditCard label="Eventos 30d" value={auditoria.resumo.eventos_30d} icon={FileClock} />
          <AuditCard
            label="Alto risco"
            value={auditoria.resumo.eventos_alto_risco_30d}
            icon={ShieldAlert}
            tone="danger"
          />
          <AuditCard label="Visualizações" value={auditoria.resumo.visualizacoes_30d} icon={Eye} />
          <AuditCard label="Downloads" value={auditoria.resumo.downloads_30d} icon={Download} />
          <AuditCard label="Substituições" value={auditoria.resumo.substituicoes_30d} icon={Upload} />
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium">Data/Hora</th>
              <th className="px-4 py-2.5 text-left font-medium">Usuário</th>
              <th className="px-4 py-2.5 text-left font-medium">Categoria</th>
              <th className="px-4 py-2.5 text-left font-medium">Ação</th>
              <th className="px-4 py-2.5 text-left font-medium">Módulo</th>
              <th className="px-4 py-2.5 text-left font-medium">Risco</th>
              <th className="px-4 py-2.5 text-left font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {eventos.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 text-xs tabular-nums">{formatDateTimeBR(log.data)}</td>
                <td className="px-4 py-3">{log.usuario}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.categoria ?? "Sistema"}</td>
                <td className="px-4 py-3 text-muted-foreground">{humanizeAction(log.acao)}</td>
                <td className="px-4 py-3">{log.entidade}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${riskClass(log.risco)}`}>
                    {riskLabel(log.risco)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip}</td>
              </tr>
            ))}
            {eventos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Nenhum evento encontrado para a empresa selecionada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function AuditCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof ShieldCheck;
  tone?: "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${tone === "danger" ? "text-danger" : "text-primary"}`} />
      </div>
      <div className={`mt-2 text-3xl font-semibold ${tone === "danger" ? "text-danger" : "text-primary"}`}>
        {value}
      </div>
    </div>
  );
}

function riskClass(risco?: string) {
  if (risco === "alto") return "border-danger/30 bg-danger/10 text-danger";
  if (risco === "medio") return "border-warning/40 bg-warning/10 text-warning";
  return "border-success/30 bg-success/10 text-success";
}

function riskLabel(risco?: string) {
  if (risco === "alto") return "Alto";
  if (risco === "medio") return "Médio";
  return "Baixo";
}

function humanizeAction(acao: string) {
  return acao.replaceAll("_", " ");
}
