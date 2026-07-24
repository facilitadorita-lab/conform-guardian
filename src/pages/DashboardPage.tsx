import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileWarning,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import {
  ActionItem,
  ComplianceScore,
  ExecutiveMetricCard,
  RiskBar,
  SectionHeader,
  type ExecutiveTone,
} from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { useDashboardData, useOnboardingEmpresa } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import type { PendenciaResumo } from "@/types";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardData();
  const { data: onboarding } = useOnboardingEmpresa();
  if (isLoading && !data) {
    return (
      <AppShell title="Dashboard" description="Carregando os indicadores da empresa selecionada.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Carregando dashboard">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      </AppShell>
    );
  }

  if (isError && !data) {
    return (
      <AppShell
        title="Dashboard indisponível"
        description="Não foi possível atualizar os indicadores agora."
      >
        <Surface className="flex flex-col items-center gap-3 p-10 text-center">
          <FileWarning className="h-10 w-10 text-warning" />
          <h2 className="text-lg font-semibold">Não conseguimos carregar seus dados</h2>
          <p className="max-w-lg text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Tente novamente em instantes."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </button>
        </Surface>
      </AppShell>
    );
  }

  const dashboard = data ?? {
    indiceConformidade: 0,
    documentosVencidos: 0,
    vencendo7: 0,
    vencendo30: 0,
    vencendo60: 0,
    equipamentosAtencao: 0,
    manutencoesVencidas: 0,
    manutencoesProximas: 0,
    pendenciasCriticas: 0,
    semAnexo: 0,
    semResponsavel: 0,
    pendencias: [],
  };

  const classification = getComplianceClassification(dashboard.indiceConformidade);
  const priorities = buildPriorities(dashboard);
  const riskItems = [
    {
      label: "Documentos",
      value: dashboard.documentosVencidos + dashboard.vencendo30,
      tone: dashboard.documentosVencidos > 0 ? "danger" : "warning",
    },
    {
      label: "Equipamentos",
      value: dashboard.equipamentosAtencao,
      tone: "warning",
    },
    {
      label: "Manutenções",
      value: dashboard.manutencoesVencidas + dashboard.manutencoesProximas,
      tone: dashboard.manutencoesVencidas > 0 ? "danger" : "warning",
    },
    {
      label: "Pendências",
      value: dashboard.pendenciasCriticas + dashboard.semResponsavel,
      tone: dashboard.pendenciasCriticas > 0 ? "danger" : "info",
    },
  ] satisfies Array<{ label: string; value: number; tone: ExecutiveTone }>;
  const riskMax = Math.max(...riskItems.map((item) => item.value), 1);

  return (
    <AppShell
      title="Dashboard"
      description="Central executiva para acompanhar conformidade, vencimentos, riscos e ações prioritárias da empresa."
      actions={
        <Link
          to="/relatorios"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm cf-transition hover:bg-primary/90"
        >
          Gerar relatório <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ComplianceScore
          value={dashboard.indiceConformidade}
          classification={classification.label}
          description={classification.description}
        />

        <Surface className="flex flex-col gap-5">
          <SectionHeader
            title="Mapa de risco operacional"
            description="Distribuição dos itens que exigem atenção, calculada com os dados atuais."
          />
          <div className="space-y-5">
            {riskItems.map((item) => (
              <RiskBar
                key={item.label}
                label={item.label}
                value={item.value}
                max={riskMax}
                tone={item.tone}
              />
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ExecutiveMetricCard
          title="Documentos vencidos"
          value={dashboard.documentosVencidos}
          description="Regularize primeiro para reduzir risco imediato."
          tone={dashboard.documentosVencidos > 0 ? "danger" : "success"}
          icon={FileWarning}
          href="/documentos"
        />
        <ExecutiveMetricCard
          title="Vencendo em 7 dias"
          value={dashboard.vencendo7}
          description="Itens que precisam de ação no curto prazo."
          tone={dashboard.vencendo7 > 0 ? "danger" : "success"}
          icon={AlertTriangle}
          href="/vencimentos"
        />
        <ExecutiveMetricCard
          title="Vencendo em 30 dias"
          value={dashboard.vencendo30}
          description="Planejamento operacional do mês."
          tone={dashboard.vencendo30 > 0 ? "warning" : "success"}
          icon={CalendarClock}
          href="/vencimentos"
        />
        <ExecutiveMetricCard
          title="Vencendo em 60 dias"
          value={dashboard.vencendo60}
          description="Janela preventiva para evitar urgências."
          tone={dashboard.vencendo60 > 0 ? "info" : "success"}
          icon={FileCheck2}
          href="/vencimentos"
        />
        <ExecutiveMetricCard
          title="Equipamentos em atenção"
          value={dashboard.equipamentosAtencao}
          description="Equipamentos com calibração, qualificação ou status sensível."
          tone={dashboard.equipamentosAtencao > 0 ? "warning" : "success"}
          icon={ShieldCheck}
          href="/equipamentos"
        />
        <ExecutiveMetricCard
          title="Manutenções vencidas"
          value={dashboard.manutencoesVencidas}
          description="Atrasos com impacto operacional direto."
          tone={dashboard.manutencoesVencidas > 0 ? "danger" : "success"}
          icon={Wrench}
          href="/manutencoes"
        />
        <ExecutiveMetricCard
          title="Manutenções próximas"
          value={dashboard.manutencoesProximas}
          description="Serviços que devem entrar na programação."
          tone={dashboard.manutencoesProximas > 0 ? "warning" : "success"}
          icon={Wrench}
          href="/manutencoes"
        />
        <ExecutiveMetricCard
          title="Pendências críticas"
          value={dashboard.pendenciasCriticas}
          description="Tratativas que exigem resposta rápida."
          tone={dashboard.pendenciasCriticas > 0 ? "danger" : "success"}
          icon={ClipboardList}
          href="/pendencias"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface>
          <SectionHeader
            title="Prioridades de hoje"
            description="Ações sugeridas a partir dos riscos e vencimentos atuais."
          />
          <div className="mt-5 space-y-3">
            {priorities.length > 0 ? (
              priorities.map((item) => (
                <ActionItem
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  tone={item.tone}
                  href={item.href}
                />
              ))
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Nenhuma ação crítica para hoje"
                description="Os dados atuais não indicam itens vencidos ou pendências críticas. Continue acompanhando os próximos vencimentos."
              />
            )}
          </div>
        </Surface>

        <Surface>
          <SectionHeader
            title="Central de implantação"
            description="Acompanhe a preparação do ambiente para operação e auditoria."
          />
          {onboarding ? (
            <>
              <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">Progresso da implantação</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {onboarding.concluidos}/{onboarding.total} etapas concluídas
                    </div>
                  </div>
                  <div className="text-3xl font-semibold text-primary tabular-nums">
                    {onboarding.progresso_percentual}%
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-card">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.max(0, Math.min(onboarding.progresso_percentual, 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {onboarding.itens.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      item.concluido
                        ? "border-success/25 bg-success/5"
                        : "border-warning/25 bg-warning/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 ${
                          item.concluido ? "text-success" : "text-warning"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-medium">{item.titulo}</div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.descricao}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Checklist ainda não disponível"
              description="O progresso será exibido assim que as etapas de implantação forem registradas."
            />
          )}
        </Surface>
      </section>

      <Surface>
        <SectionHeader
          title="Pendências críticas"
          description="Itens que exigem tratativa, responsável e prazo acompanhados de perto."
          action={
            <Link to="/pendencias" className="text-sm font-medium text-accent hover:underline">
              Ver todas
            </Link>
          }
        />
        <div className="mt-5">
          {dashboard.pendencias.length > 0 ? (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Item</th>
                      <th className="px-4 py-3 text-left font-medium">Origem</th>
                      <th className="px-4 py-3 text-left font-medium">Responsável</th>
                      <th className="px-4 py-3 text-left font-medium">Vencimento</th>
                      <th className="px-4 py-3 text-left font-medium">Prazo</th>
                      <th className="px-5 py-3 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {dashboard.pendencias.slice(0, 8).map((pendencia) => (
                      <PendenciaRow key={pendencia.id} pendencia={pendencia} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {dashboard.pendencias.slice(0, 8).map((pendencia) => (
                  <PendenciaMobileCard key={pendencia.id} pendencia={pendencia} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Sem pendências críticas"
              description="Não há pendências críticas cadastradas para a empresa selecionada neste momento."
            />
          )}
        </div>
      </Surface>
    </AppShell>
  );
}

function PendenciaRow({ pendencia }: { pendencia: PendenciaResumo }) {
  return (
    <tr className="cf-transition hover:bg-muted/30">
      <td className="px-5 py-4">
        <div className="font-medium">{pendencia.item}</div>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{pendencia.tipo}</td>
      <td className="px-4 py-4 text-muted-foreground">{pendencia.responsavel}</td>
      <td className="px-4 py-4 tabular-nums">{formatDateBR(pendencia.vencimento)}</td>
      <td className="px-4 py-4">
        <PrazoLabel diasRestantes={pendencia.diasRestantes} />
      </td>
      <td className="px-5 py-4 text-right">
        <StatusBadge tone={pendencia.status}>{statusLabel(pendencia.status)}</StatusBadge>
      </td>
    </tr>
  );
}

function PendenciaMobileCard({ pendencia }: { pendencia: PendenciaResumo }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{pendencia.item}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{pendencia.tipo}</p>
        </div>
        <StatusBadge tone={pendencia.status}>{statusLabel(pendencia.status)}</StatusBadge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Responsável</div>
          <div className="mt-1 font-medium">{pendencia.responsavel}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Vencimento</div>
          <div className="mt-1 font-medium">{formatDateBR(pendencia.vencimento)}</div>
        </div>
      </div>
    </article>
  );
}

function PrazoLabel({ diasRestantes }: { diasRestantes: number }) {
  if (diasRestantes < 0) {
    return (
      <span className="font-semibold text-danger tabular-nums">
        {Math.abs(diasRestantes)}d em atraso
      </span>
    );
  }

  if (diasRestantes <= 7) {
    return (
      <span className="font-semibold text-warning tabular-nums">{diasRestantes}d restantes</span>
    );
  }

  return <span className="text-muted-foreground tabular-nums">{diasRestantes}d restantes</span>;
}

function getComplianceClassification(value: number) {
  if (value >= 95) {
    return {
      label: "Conforme",
      description:
        "A empresa está dentro da meta operacional. Mantenha o acompanhamento de vencimentos e evidências.",
    };
  }

  if (value >= 85) {
    return {
      label: "Atenção",
      description:
        "A empresa está próxima da meta, mas existem itens que podem gerar não conformidade se não forem tratados.",
    };
  }

  return {
    label: "Risco elevado",
    description:
      "A empresa exige plano de ação imediato. Priorize vencidos, pendências críticas e itens sem responsável.",
  };
}

function buildPriorities(dashboard: {
  documentosVencidos: number;
  vencendo7: number;
  equipamentosAtencao: number;
  manutencoesVencidas: number;
  semResponsavel: number;
  pendenciasCriticas: number;
}) {
  const items: Array<{
    title: string;
    description: string;
    tone: ExecutiveTone;
    href: string;
  }> = [];

  if (dashboard.documentosVencidos > 0) {
    items.push({
      title: "Regularizar documentos vencidos",
      description: `${dashboard.documentosVencidos} documento(s) vencido(s) impactando o índice de conformidade.`,
      tone: "danger",
      href: "/documentos",
    });
  }

  if (dashboard.vencendo7 > 0) {
    items.push({
      title: "Resolver vencimentos dos próximos 7 dias",
      description: `${dashboard.vencendo7} item(ns) estão na janela crítica de prazo.`,
      tone: "danger",
      href: "/vencimentos",
    });
  }

  if (dashboard.manutencoesVencidas > 0) {
    items.push({
      title: "Tratar manutenções vencidas",
      description: `${dashboard.manutencoesVencidas} manutenção(ões) vencida(s) precisam de registro ou execução.`,
      tone: "danger",
      href: "/manutencoes",
    });
  }

  if (dashboard.pendenciasCriticas > 0) {
    items.push({
      title: "Acompanhar pendências críticas",
      description: `${dashboard.pendenciasCriticas} pendência(s) exigem tratativa imediata.`,
      tone: "warning",
      href: "/pendencias",
    });
  }

  if (dashboard.semResponsavel > 0) {
    items.push({
      title: "Atribuir responsáveis",
      description: `${dashboard.semResponsavel} registro(s) sem responsável reduzem rastreabilidade operacional.`,
      tone: "warning",
      href: "/pendencias",
    });
  }

  if (dashboard.equipamentosAtencao > 0) {
    items.push({
      title: "Revisar equipamentos em atenção",
      description: `${dashboard.equipamentosAtencao} equipamento(s) devem ser revisados no módulo de equipamentos.`,
      tone: "info",
      href: "/equipamentos",
    });
  }

  return items.slice(0, 5);
}
