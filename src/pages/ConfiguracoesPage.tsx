import {
  BellRing,
  Building2,
  Cog,
  Layers,
  MailCheck,
  Tag,
  Users,
  Wrench,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useConfiguracoes, useMatrizDocumental } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { statusLabel } from "@/utils/status";

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
  const { data: matriz } = useMatrizDocumental();

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

      {matriz ? (
        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <h2 className="text-base font-semibold">Matriz documental inteligente</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Documentos exigidos conforme tipo de estabelecimento e segmento da empresa. Itens
                adicionais continuam restritos ao ambiente desta empresa.
              </p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-right">
              <div className="text-2xl font-semibold text-primary">
                {matriz.resumo.cadastrados}/{matriz.resumo.exigidos}
              </div>
              <div className="text-[11px] text-muted-foreground">documentos cadastrados</div>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Perfil documental
              </div>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Tipo</dt>
                  <dd className="font-medium">{matriz.empresa.tipo_estabelecimento ?? "Não informado"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Segmento</dt>
                  <dd className="font-medium">{matriz.empresa.segmento ?? "Não informado"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Chaves aplicadas</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {matriz.chaves.map((chave) => (
                      <span
                        key={chave}
                        className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px]"
                      >
                        {chave}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </aside>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Documento exigido</th>
                    <th className="px-4 py-2.5 text-left font-medium">Segmento</th>
                    <th className="px-4 py-2.5 text-left font-medium">Setor</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matriz.itens.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {item.documento_id ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                          )}
                          <div>
                            <div className="font-medium">{item.nome}</div>
                            <div className="text-xs text-muted-foreground">{item.observacoes}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.segmento_chave}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.setor ?? "—"}</td>
                      <td className="px-4 py-3">
                        {item.status === "pendente_cadastro" ? (
                          <StatusBadge tone="atencao">Pendente cadastro</StatusBadge>
                        ) : (
                          <StatusBadge tone={item.status === "cadastrado" ? "ok" : item.status}>
                            {item.status === "cadastrado" ? "Cadastrado" : statusLabel(item.status)}
                          </StatusBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
