import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Building2, Layers, Tag, Cog, Wrench, BellRing, Users, MailCheck } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Conform Flow" }] }),
  component: ConfiguracoesPage,
});

const cards = [
  { icon: Building2, title: "Dados da empresa", desc: "Razão social, CNPJ, endereço e responsável legal." },
  { icon: Layers, title: "Setores", desc: "Estruture setores para segmentar responsabilidades." },
  { icon: Tag, title: "Categorias", desc: "Regulatório, ambiental, qualidade, contratos e outros." },
  { icon: Tag, title: "Tipos de documentos", desc: "Alvará, licença, certificado, contrato, plano." },
  { icon: Cog, title: "Tipos de equipamentos", desc: "Medição, esterilização, climatização, armazenamento." },
  { icon: Wrench, title: "Tipos de manutenção", desc: "Preventiva, corretiva e recorrente geral." },
  { icon: BellRing, title: "Regras de alerta", desc: "Marcos de 60, 30, 15, 7 dias, no vencimento e após vencido." },
  { icon: Users, title: "Responsáveis", desc: "Padrões de atribuição por setor e categoria." },
  { icon: MailCheck, title: "Preferências de notificação", desc: "Canais, frequência e horários de disparo." },
];

function ConfiguracoesPage() {
  return (
    <AppShell title="Configurações" description="Parametrize o ambiente e as regras operacionais da conformidade.">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <button key={c.title} className="text-left rounded-xl border border-border bg-card p-5 hover:border-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/5 text-primary flex items-center justify-center">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </AppShell>
  );
}