import {
  BellRing,
  Building2,
  Cog,
  Layers,
  MailCheck,
  Tag,
  Users,
  Wrench,
} from "lucide-react";
import { useConfiguracoes } from "@/hooks/use-conform-data";
import { AppShell } from "@/layouts/app-layout";

const iconMap = {
  "bell-ring": BellRing,
  "building-2": Building2,
  cog: Cog,
  layers: Layers,
  "mail-check": MailCheck,
  tag: Tag,
  users: Users,
  wrench: Wrench,
};

export function ConfiguracoesPage() {
  const { data: configuracoes = [] } = useConfiguracoes();

  return (
    <AppShell
      title="Configurações"
      description="Parametrize o ambiente e as regras operacionais da conformidade."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {configuracoes.map((card) => {
          const Icon = iconMap[card.icon as keyof typeof iconMap];

          return (
            <button
              key={card.id}
              className="rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-accent"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/5 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{card.title}</div>
                  <div className="text-xs text-muted-foreground">{card.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
