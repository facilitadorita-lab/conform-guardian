import {
  AlertTriangle,
  BellRing,
  Building2,
  CheckCircle2,
  Cog,
  Layers,
  LockKeyhole,
  MailCheck,
  ShieldCheck,
  Tag,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { SectionHeader } from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { useAuthContext, useConfiguracoes, useMatrizDocumental } from "@/hooks/use-conform-data";
import { useSession } from "@/hooks/use-session";
import { useAppSession } from "@/hooks/use-app-session";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import type { ConfiguracaoCatalogoItem, PlanoRecurso } from "@/types";
import { statusLabel } from "@/utils/status";
import { GovernanceSettings } from "@/components/governance-settings";
import { ProfessionalGovernancePanel } from "@/components/professional-governance-panel";
import { stripeService } from "@/services";

const iconMap: Record<string, LucideIcon> = {
  "bell-ring": BellRing,
  "building-2": Building2,
  cog: Cog,
  layers: Layers,
  "mail-check": MailCheck,
  tag: Tag,
  users: Users,
  wrench: Wrench,
};

const recursosPrincipais: Array<{ key: PlanoRecurso; label: string }> = [
  { key: "documentos", label: "Documentos" },
  { key: "anexos", label: "Anexos" },
  { key: "assistente_ia", label: "IA" },
  { key: "equipamentos", label: "Equipamentos" },
  { key: "calibracoes", label: "Calibrações" },
  { key: "qualificacoes", label: "Qualificações" },
  { key: "manutencoes", label: "Manutenções" },
  { key: "pendencias", label: "Pendências" },
  { key: "relatorios", label: "Relatórios" },
  { key: "auditoria", label: "Auditoria" },
  { key: "usuarios", label: "Usuários" },
  { key: "multi_unidades", label: "Multiunidade" },
];

export function ConfiguracoesPage() {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const { data: configuracoes = [] } = useConfiguracoes();
  const { data: matriz } = useMatrizDocumental();
  const { data: authContext } = useAuthContext();
  const { selectedCompanyId } = useSession();
  const { permissions } = useAppSession();
  const empresaAtual =
    authContext?.empresasPermitidas.find((company) => company.id === selectedCompanyId) ??
    authContext?.empresaAtual;
  const plano = empresaAtual?.plano;
  const canAdmin = Boolean(
    authContext?.usuario.isMaster ||
    ["administrador", "administrador_provisorio"].includes(authContext?.perfilAtual ?? ""),
  );
  const recursos = plano?.recursos ?? {};
  const recursosLiberados = recursosPrincipais.filter((recurso) => Boolean(recursos[recurso.key]));

  async function openBillingPortal() {
    if (!empresaAtual?.id) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const url = await stripeService.abrirPortal(empresaAtual.id);
      window.location.assign(url);
    } catch (error) {
      setPortalError(
        error instanceof Error ? error.message : "Não foi possível abrir o portal financeiro.",
      );
      setPortalLoading(false);
    }
  }

  return (
    <AppShell
      title="Configurações"
      description="Parametrize o ambiente, acompanhe plano contratado e revise regras operacionais da empresa."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Empresa atual"
          value={empresaAtual?.nome ?? "-"}
          description={empresaAtual?.cnpj ?? "CNPJ não informado"}
          icon={Building2}
          tone="info"
        />
        <ResumoCard
          title="Plano"
          value={plano?.nome ?? "Não identificado"}
          description={plano?.codigo ? `Código: ${plano.codigo}` : "Plano em validação"}
          icon={Tag}
          tone="success"
        />
        <ResumoCard
          title="Usuários"
          value={plano?.limite_usuarios ? `Até ${plano.limite_usuarios}` : "Sem limite"}
          description="Limite do plano contratado"
          icon={Users}
          tone="neutral"
        />
        <ResumoCard
          title="Recursos liberados"
          value={recursosLiberados.length || "Legado"}
          description="Permissões comerciais do plano"
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      <Surface className="flex flex-wrap items-center justify-between gap-4 border-primary/20 bg-primary/5">
        <div>
          <h2 className="text-sm font-semibold">Assinatura e cobrança</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atualize o cartão, consulte faturas ou altere o plano pelo portal seguro da Stripe.
          </p>
          {portalError ? <p className="mt-2 text-xs text-danger">{portalError}</p> : null}
        </div>
        <button
          type="button"
          onClick={openBillingPortal}
          disabled={portalLoading || !empresaAtual?.id}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {portalLoading ? "Abrindo portal..." : "Gerenciar assinatura"}
        </button>
      </Surface>

      {permissions?.limits ? <UsageMeters limits={permissions.limits} /> : null}

      <Surface className="space-y-4">
        <SectionHeader
          title="Módulos de configuração"
          description="Acesso rápido às áreas operacionais que definem o comportamento da plataforma."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {configuracoes.map((card) => (
            <ConfiguracaoCard key={card.id} card={card} />
          ))}
        </div>
      </Surface>

      <Surface className="space-y-4">
        <SectionHeader
          title="Permissões do plano"
          description="Permissões efetivas do seu perfil neste ambiente."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recursosPrincipais.map((recurso) => {
            const liberado = Object.keys(recursos).length === 0 || Boolean(recursos[recurso.key]);
            return (
              <div
                key={recurso.key}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3",
                  liberado
                    ? "border-success/25 bg-success/5 text-success"
                    : "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                {liberado ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                <span className="text-sm font-semibold">{recurso.label}</span>
              </div>
            );
          })}
        </div>
      </Surface>

      {matriz ? (
        <Surface className="overflow-hidden p-0">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-muted/25 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold">Matriz documental inteligente</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Documentos exigidos conforme tipo de estabelecimento e segmento da empresa. Itens
                adicionais continuam restritos ao ambiente desta empresa.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-right">
              <div className="text-3xl font-semibold text-primary">
                {matriz.resumo.cadastrados}/{matriz.resumo.exigidos}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                documentos cadastrados
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[300px_1fr]">
            <aside className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Perfil documental
              </div>
              <dl className="mt-4 space-y-4 text-sm">
                <Info label="Tipo" value={matriz.empresa.tipo_estabelecimento ?? "Não informado"} />
                <Info label="Segmento" value={matriz.empresa.segmento ?? "Não informado"} />
                <div>
                  <dt className="text-xs text-muted-foreground">Chaves aplicadas</dt>
                  <dd className="mt-2 flex flex-wrap gap-1">
                    {matriz.chaves.map((chave) => (
                      <span
                        key={chave}
                        className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold"
                      >
                        {chave}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </aside>

            {matriz.itens.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="Nenhum item na matriz"
                description="Cadastre o tipo de estabelecimento e segmento para carregar documentos exigidos."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Documento exigido</th>
                      <th className="px-4 py-3 text-left font-semibold">Segmento</th>
                      <th className="px-4 py-3 text-left font-semibold">Setor</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {matriz.itens.map((item) => (
                      <tr key={item.id} className="cf-transition hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            {item.documento_id ? (
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            ) : (
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                            )}
                            <div>
                              <div className="font-semibold">{item.nome}</div>
                              <div className="text-xs leading-5 text-muted-foreground">
                                {item.observacoes}
                              </div>
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
                              {item.status === "cadastrado"
                                ? "Cadastrado"
                                : statusLabel(item.status)}
                            </StatusBadge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Surface>
      ) : null}
      {empresaAtual?.id && authContext?.usuario.id ? (
        <>
          <ProfessionalGovernancePanel
            companyId={empresaAtual.id}
            canAdmin={canAdmin}
            currentUserId={authContext.usuario.id}
          />
          <GovernanceSettings
            companyId={empresaAtual.id}
            canAdmin={canAdmin}
            userId={authContext.usuario.id}
          />
        </>
      ) : null}
    </AppShell>
  );
}

function UsageMeters({
  limits,
}: {
  limits: {
    max_users: number | null;
    max_units: number | null;
    max_documents: number | null;
    max_equipment: number | null;
    max_storage_mb: number | null;
    usage: {
      users: number;
      units: number;
      documents: number;
      equipment: number;
      storage_bytes: number;
    };
  };
}) {
  const meters = [
    { label: "Usuários", value: limits.usage.users, max: limits.max_users },
    { label: "Unidades", value: limits.usage.units, max: limits.max_units },
    { label: "Documentos", value: limits.usage.documents, max: limits.max_documents },
    { label: "Equipamentos", value: limits.usage.equipment, max: limits.max_equipment },
    {
      label: "Armazenamento",
      value: Math.round(limits.usage.storage_bytes / (1024 * 1024)),
      max: limits.max_storage_mb,
      suffix: " MB",
    },
  ];
  return (
    <Surface className="space-y-4">
      <SectionHeader
        title="Uso do plano"
        description="Acompanhe o consumo antes de atingir os limites contratados. O bloqueio é validado no backend."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {meters.map((meter) => {
          const ratio = meter.max ? Math.min(100, Math.round((meter.value / meter.max) * 100)) : 0;
          const warning = ratio >= 80;
          return (
            <div key={meter.label} className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-muted-foreground">{meter.label}</span>
                <span className={cn("font-semibold", warning ? "text-warning" : "text-foreground")}>
                  {meter.value}
                  {meter.suffix ?? ""}
                  {meter.max ? ` / ${meter.max}${meter.suffix ?? ""}` : ""}
                </span>
              </div>
              {meter.max ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/70">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      warning ? "bg-warning" : "bg-accent",
                    )}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-muted-foreground">Sem limite definido</p>
              )}
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function ConfiguracaoCard({ card }: { card: ConfiguracaoCatalogoItem }) {
  const Icon = iconMap[card.icon] ?? Cog;
  return (
    <button
      type="button"
      className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm cf-transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[var(--cf-shadow-soft)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">{card.title}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{card.desc}</div>
        </div>
      </div>
    </button>
  );
}

function ResumoCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const toneClass = {
    success: "border-success/20 bg-success/5 text-success",
    warning: "border-warning/25 bg-warning/5 text-warning",
    danger: "border-danger/25 bg-danger/5 text-danger",
    info: "border-accent/20 bg-accent/5 text-accent",
    neutral: "border-border bg-muted/30 text-muted-foreground",
  }[tone];

  return (
    <div className="cf-page-card flex min-h-36 flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </div>
        <div
          className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", toneClass)}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <div className="truncate text-2xl font-semibold tracking-[-0.04em]">{value}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
