import { Bell, Mail, Monitor } from "lucide-react";
import { useAlertas } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { formatDateBR } from "@/utils/date";

const tones: Record<string, "info" | "atencao" | "critico" | "vencido"> = {
  info: "info",
  atencao: "atencao",
  critico: "critico",
  vencido: "vencido",
};

export function AlertasPage() {
  const { data: alertas = [] } = useAlertas();

  return (
    <AppShell
      title="Alertas"
      description="Marcos automáticos de 60, 30, 15, 7 dias, no vencimento e após vencido. Envio processado pelo backend."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ChannelCard
          icon={Monitor}
          title="Dashboard"
          desc="Notificações fixas no painel principal."
        />
        <ChannelCard
          icon={Bell}
          title="Central interna"
          desc="Feed com histórico completo por usuário."
        />
        <ChannelCard
          icon={Mail}
          title="E-mail"
          desc="Envio agendado em batch pela Edge Function."
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium">Marco</th>
              <th className="px-4 py-2.5 text-left font-medium">Item</th>
              <th className="px-4 py-2.5 text-left font-medium">Canal</th>
              <th className="px-4 py-2.5 text-left font-medium">Disparo</th>
              <th className="px-4 py-2.5 text-left font-medium">Nível</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {alertas.map((alerta) => (
              <tr key={alerta.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 font-medium">{alerta.marco}</td>
                <td className="px-4 py-3">{alerta.item}</td>
                <td className="px-4 py-3 text-muted-foreground">{alerta.canal}</td>
                <td className="px-4 py-3 tabular-nums">{formatDateBR(alerta.data)}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={tones[alerta.nivel] ?? "info"}>{alerta.nivel}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Bell;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
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
