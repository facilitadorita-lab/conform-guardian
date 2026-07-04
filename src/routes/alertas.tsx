import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { alertas } from "@/lib/mock-data";
import { Bell, Mail, Monitor } from "lucide-react";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas — Conform Flow" }] }),
  component: AlertasPage,
});

const tones: Record<string, "info" | "atencao" | "critico" | "vencido"> = {
  info: "info",
  atencao: "atencao",
  critico: "critico",
  vencido: "vencido",
};

function AlertasPage() {
  return (
    <AppShell
      title="Alertas"
      description="Marcos automáticos de 60, 30, 15, 7 dias, no vencimento e após vencido. Envio processado pelo backend."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChannelCard icon={Monitor} title="Dashboard" desc="Notificações fixas no painel principal." />
        <ChannelCard icon={Bell} title="Central interna" desc="Feed com histórico completo por usuário." />
        <ChannelCard icon={Mail} title="E-mail" desc="Envio agendado em batch pela Edge Function." />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-2.5">Marco</th>
              <th className="text-left font-medium px-4 py-2.5">Item</th>
              <th className="text-left font-medium px-4 py-2.5">Canal</th>
              <th className="text-left font-medium px-4 py-2.5">Disparo</th>
              <th className="text-left font-medium px-4 py-2.5">Nível</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {alertas.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 font-medium">{a.marco}</td>
                <td className="px-4 py-3">{a.item}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.canal}</td>
                <td className="px-4 py-3 tabular-nums">{a.data}</td>
                <td className="px-4 py-3"><StatusBadge tone={tones[a.nivel] ?? "info"}>{a.nivel}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function ChannelCard({ icon: Icon, title, desc }: { icon: typeof Bell; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-accent/10 text-accent flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
    </div>
  );
}