/* eslint-disable react-refresh/only-export-components */
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BellRing,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  LineChart,
  LockKeyhole,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
  Wrench,
  ScrollText,
  Activity,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicCatalog } from "@/hooks/use-public-catalog";
import { cn } from "@/lib/utils";
import { formatCurrencyFromCents } from "@/utils/money";
import type { BillingInterval, PublicPlanCatalogItem } from "@/types";

export const publicModules = [
  {
    title: "Dashboard executivo",
    description: "Indicadores de conformidade, vencimentos e riscos em uma visão clara.",
    icon: Gauge,
  },
  {
    title: "Documentos",
    description: "Controle de validades, anexos, responsáveis e evidências por empresa.",
    icon: FileText,
  },
  {
    title: "Equipamentos",
    description: "Histórico completo com calibrações, qualificações, anexos e pendências.",
    icon: ClipboardCheck,
  },
  {
    title: "Manutenções",
    description: "Preventivas, corretivas e recorrentes conectadas aos equipamentos.",
    icon: Wrench,
  },
  {
    title: "Alertas e vencimentos",
    description: "Acompanhamento de prazos críticos antes que virem não conformidade.",
    icon: BellRing,
  },
  {
    title: "Auditoria",
    description: "Rastreabilidade de ações, alterações, uploads e visualizações.",
    icon: ShieldCheck,
  },
];

export const benefitCards = [
  {
    title: "Reduza riscos operacionais",
    description:
      "Antecipe vencimentos, corrija pendências antes da fiscalização e evite multas ou interdições.",
    icon: ShieldAlert,
  },
  {
    title: "Chegue pronto na auditoria",
    description:
      "Evidências, versões e responsáveis organizados e prontos para apresentar quando o fiscal pedir.",
    icon: ScrollText,
  },
  {
    title: "Economize horas por semana",
    description:
      "Substitua planilhas, e-mails e lembretes manuais por uma rotina automática e centralizada.",
    icon: Timer,
  },
  {
    title: "Alertas antes do vencimento",
    description:
      "Notificações automáticas de prazos críticos para o time certo, no momento certo.",
    icon: BellRing,
  },
  {
    title: "Rastreabilidade completa",
    description:
      "Histórico de quem alterou, o que mudou e quando — pronto para auditoria interna ou externa.",
    icon: LineChart,
  },
  {
    title: "Visão executiva em tempo real",
    description:
      "Indicadores de conformidade, riscos e prioridades para decidir com base em dados.",
    icon: TrendingUp,
  },
];

export function LogoSignature({
  tone = "dark",
  compact = false,
  className,
}: {
  tone?: "dark" | "light";
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl p-2 ring-1",
          tone === "light"
            ? "bg-white shadow-[0_10px_28px_-16px_rgba(0,0,0,0.55)] ring-white/25"
            : "bg-white shadow-[0_12px_28px_-18px_rgba(15,41,71,0.55)] ring-slate-200/80",
        )}
      >
        <img
          src="/conform-flow-logo-transparent.png"
          alt="Conform Flow"
          className="h-full w-full object-contain"
        />
      </div>
      {!compact ? (
        <div className="leading-[1.1]">
          <div
            className={cn(
              "text-[1.15rem] font-bold tracking-[-0.02em]",
              tone === "light" ? "text-white" : "text-slate-950",
            )}
          >
            Conform Flow
          </div>
          <div
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.14em]",
              tone === "light" ? "text-cyan-200" : "text-cyan-700",
            )}
          >
            Conformidade operacional
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-[5.25rem] w-full max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link to="/" aria-label="Página inicial Conform Flow">
          <LogoSignature />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
          <a className="transition-colors hover:text-slate-950" href="/#beneficios">
            Benefícios
          </a>
          <a className="transition-colors hover:text-slate-950" href="/#modulos">
            Módulos
          </a>
          <Link className="transition-colors hover:text-slate-950" to="/planos">
            Planos
          </Link>
          <a className="transition-colors hover:text-slate-950" href="/#faq">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="hidden rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950 md:inline-flex"
          >
            <Link to="/login" search={{ msg: undefined }}>
              Entrar
            </Link>
          </Button>
          <Button
            asChild
            className="rounded-xl bg-slate-950 px-4 text-white shadow-[0_12px_28px_-20px_rgba(15,23,42,0.72)] hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <a href="mailto:comercial@conformflow.com.br?subject=Solicitar demonstração Conform Flow">
              Solicitar demo
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
          <div>
            <LogoSignature tone="light" />
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              Plataforma SaaS para gestão de conformidade operacional em empresas reguladas.
              Documentos, equipamentos e vencimentos sob controle.
            </p>
            <div className="mt-6 flex flex-col gap-3 text-sm text-slate-400">
              <a
                href="mailto:comercial@conformflow.com.br"
                className="flex items-center gap-2.5 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 text-cyan-400" />
                comercial@conformflow.com.br
              </a>
              <a
                href="tel:+5511999999999"
                className="flex items-center gap-2.5 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4 text-cyan-400" />
                +55 (11) 9 9999-9999
              </a>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-cyan-400" />
                São Paulo, Brasil
              </div>
            </div>
          </div>
          <FooterGroup
            title="Produto"
            links={[
              { label: "Benefícios", href: "/#beneficios" },
              { label: "Módulos", href: "/#modulos" },
              { label: "Planos", href: "/planos" },
              { label: "FAQ", href: "/#faq" },
            ]}
          />
          <FooterGroup
            title="Empresa"
            links={[
              { label: "Sobre", href: "/#beneficios" },
              { label: "Contato", href: "mailto:comercial@conformflow.com.br" },
              { label: "Suporte", href: "mailto:suporte@conformflow.com.br" },
            ]}
          />
          <FooterGroup
            title="Acesso"
            links={[
              { label: "Entrar na plataforma", href: "/login" },
              { label: "Solicitar demonstração", href: "mailto:comercial@conformflow.com.br" },
              { label: "Definir nova senha", href: "/definir-senha" },
            ]}
          />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-slate-500 md:flex-row lg:px-8">
          <span>© {new Date().getFullYear()} Conform Flow. Todos os direitos reservados.</span>
          <span className="flex items-center gap-4">
            <a href="/#faq" className="transition-colors hover:text-slate-300">
              Termos de uso
            </a>
            <a href="/#faq" className="transition-colors hover:text-slate-300">
              Privacidade
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white">{title}</h3>
      <div className="mt-5 flex flex-col gap-3 text-sm text-slate-400">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="transition-colors hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <div className="mb-3 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  wide,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  wide?: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-38px_rgba(15,41,71,0.45)] transition-[border-color,box-shadow,transform] duration-[200ms] ease-out hover:-translate-y-1 hover:border-cyan-300/70 hover:shadow-[0_28px_60px_-38px_rgba(15,41,71,0.55)]",
        wide && "md:col-span-2",
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/[0.06] blur-2xl transition-opacity duration-[200ms] group-hover:bg-cyan-500/[0.11]" />
      <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-white text-cyan-700 ring-1 ring-cyan-100 transition-transform duration-[200ms] group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="relative text-base font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="relative mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

export function ModuleCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_16px_42px_-38px_rgba(15,23,42,0.35)] transition-[border-color,box-shadow,transform] duration-[180ms] ease-out hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition-transform duration-[180ms] group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </article>
  );
}

export function PricingGrid({ compact = false }: { compact?: boolean }) {
  const catalog = usePublicCatalog();
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  if (catalog.isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-3" aria-label="Carregando planos">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-[430px] rounded-3xl" />
        ))}
      </div>
    );
  }

  if (catalog.error || !catalog.data?.plans.length) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h3 className="font-semibold text-slate-950">Planos temporariamente indisponíveis</h3>
        <p className="mt-2 text-sm text-slate-600">
          Não exibimos valores desatualizados. Tente novamente ou fale com nosso time comercial.
        </p>
        <Button type="button" variant="outline" className="mt-5" onClick={() => catalog.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div>
      {!compact ? (
        <div className="mb-8 flex justify-center" aria-label="Periodicidade da cobrança">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["monthly", "yearly"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                className={cn(
                  "rounded-lg px-5 py-2 text-sm font-semibold transition",
                  interval === value
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-950",
                )}
              >
                {value === "monthly" ? "Mensal" : "Anual"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-3">
        {catalog.data.plans.map((plan) => (
          <article
            key={plan.id}
            className={cn(
              "relative flex rounded-2xl border bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,41,71,0.4)] transition-[border-color,box-shadow,transform] duration-[200ms] ease-out hover:-translate-y-1 hover:shadow-[0_24px_58px_-42px_rgba(15,41,71,0.5)]",
              plan.mais_escolhido
                ? "border-cyan-500 ring-2 ring-cyan-200/60 shadow-[0_26px_60px_-38px_rgba(6,182,212,0.55)] lg:-translate-y-2 lg:scale-[1.02]"
                : "border-slate-200",
            )}
          >
            {plan.mais_escolhido ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg">
                Recomendado
              </div>
            ) : null}
            <div className="flex w-full flex-col">
              <h3 className="text-lg font-semibold text-slate-950">{plan.nome}</h3>
              <p className="mt-1.5 min-h-10 text-[13px] leading-5 text-slate-600">{plan.descricao}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-3xl font-semibold tracking-tight text-slate-950">
                  {formatPlanPrice(plan, interval)}
                </span>
                <span className="pb-1 text-sm text-slate-500">
                  /{interval === "monthly" ? "mês" : "ano"}
                </span>
              </div>
              {interval === "yearly" ? <AnnualSavings plan={plan} /> : null}
              <div className="mt-4 grid gap-1.5 text-[13px] text-slate-600">
                <PlanMeta icon={Users}>
                  {limitLabel(plan.limites.usuarios, "usuário", "usuários")}
                </PlanMeta>
                <PlanMeta icon={Building2}>
                  {limitLabel(plan.limites.unidades, "unidade", "unidades")}
                </PlanMeta>
              </div>
              <div className={cn("mt-4 space-y-2", compact && "mt-4")}>
                {enabledFeatureLabels(plan)
                  .slice(0, compact ? 4 : 6)
                  .map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
              </div>
              <Button
                asChild
                className={cn(
                  "mt-5 h-10 rounded-xl text-sm",
                  plan.mais_escolhido
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500"
                    : "bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50",
                )}
              >
                <a href={`/cadastro?plan=${encodeURIComponent(plan.codigo)}&interval=${interval}`}>
                  Assinar {plan.nome}
                </a>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function enabledFeatureLabels(plan: PublicPlanCatalogItem) {
  const labels: Record<string, string> = {
    assistente_ia: "Assistente IA",
    documentos: "Documentos e anexos",
    vencimentos: "Vencimentos e alertas",
    equipamentos: "Equipamentos",
    calibracoes: "Calibrações",
    qualificacoes: "Qualificações",
    manutencoes: "Manutenções",
    pendencias: "Pendências e tratativas",
    relatorios: "Relatórios",
    auditoria: "Auditoria avançada",
    multi_unidades: "Visão multiunidade",
    suporte_prioritario: "Suporte prioritário",
  };
  return Object.entries(labels)
    .filter(([key]) => plan.recursos[key])
    .map(([, label]) => label);
}

function formatPlanPrice(plan: PublicPlanCatalogItem, interval: BillingInterval) {
  const cents = interval === "yearly" ? plan.valor_anual_centavos : plan.valor_mensal_centavos;
  return cents === null ? "Sob consulta" : formatCurrencyFromCents(cents);
}

function AnnualSavings({ plan }: { plan: PublicPlanCatalogItem }) {
  if (!plan.valor_anual_centavos) return null;
  const savings = plan.valor_mensal_centavos * 12 - plan.valor_anual_centavos;
  if (savings <= 0) return null;
  return (
    <p className="mt-2 text-xs font-medium text-emerald-700">
      Economia anual de {formatCurrencyFromCents(savings)}
    </p>
  );
}

function limitLabel(value: number | null, singular: string, plural: string) {
  if (value === null) return "Sem limite definido";
  return `Até ${value} ${value === 1 ? singular : plural}`;
}

function PlanMeta({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-cyan-700" />
      <span>{children}</span>
    </div>
  );
}

export function SecurityBand() {
  const items = [
    "Ambientes separados por empresa",
    "Controle de perfis e permissões",
    "Logs de auditoria",
    "Anexos com rastreabilidade",
  ];

  return (
    <section id="seguranca" className="bg-slate-950 py-20 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            <LockKeyhole className="h-3.5 w-3.5" />
            Segurança e governança
          </div>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Segurança operacional sem misturar dados entre empresas.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            O Conform Flow foi pensado para ambientes multiempresa, com controle de acesso,
            rastreabilidade e visão organizada por unidade.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.8)] transition-colors duration-[180ms] hover:bg-white/[0.09]"
            >
              <ShieldCheck className="mb-4 h-5 w-5 text-cyan-300" />
              <div className="text-sm font-semibold">{item}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FAQSection() {
  const faqs = [
    {
      q: "Para quais empresas o sistema é indicado?",
      a: "Clínicas, laboratórios, casas de repouso, distribuidoras, empresas da saúde e operações reguladas que precisam controlar documentos, vencimentos e evidências.",
    },
    {
      q: "Posso controlar documentos e equipamentos?",
      a: "Sim. O plano Essencial cobre documentos e anexos; os planos superiores incluem equipamentos, calibrações, qualificações e manutenções.",
    },
    {
      q: "O sistema possui alertas?",
      a: "Sim. A plataforma acompanha vencimentos e destaca itens vencidos, próximos do prazo e em atenção.",
    },
    {
      q: "É possível gerenciar várias unidades?",
      a: "Sim. O Plano Rede inclui visão multiunidade, relatórios por unidade e visão consolidada.",
    },
    {
      q: "Existe controle de acesso por usuário?",
      a: "Sim. A plataforma trabalha com perfis, permissões e isolamento por empresa no backend.",
    },
  ];

  return (
    <section id="faq" className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-5 lg:px-8">
        <SectionTitle
          align="center"
          eyebrow="FAQ"
          title="Perguntas frequentes"
          description="Respostas rápidas para entender se o Conform Flow faz sentido para sua operação."
        />
        <Accordion
          type="single"
          collapsible
          className="mt-10 rounded-2xl border border-slate-200 bg-slate-50/55 px-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)]"
        >
          {faqs.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger className="text-left text-base text-slate-950 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-6 text-slate-600">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="bg-slate-50 px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.25rem] bg-slate-950 p-8 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.75)] md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Pronto para vender e operar
            </div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Transforme conformidade em uma rotina controlada.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Organize documentos, equipamentos, vencimentos e pendências em um ambiente
              profissional, rastreável e preparado para auditorias.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button asChild className="rounded-xl bg-white text-slate-950 hover:bg-slate-100">
              <a href="mailto:comercial@conformflow.com.br?subject=Solicitar demonstração Conform Flow">
                Solicitar demonstração
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/planos">
                Conhecer planos <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductMockup() {
  const rows: Array<{ nome: string; tipo: string; prazo: string; status: string; tone: "warn" | "danger" | "ok" }> = [
    { nome: "AVCB — sede administrativa", tipo: "Documento", prazo: "vence em 12 dias", status: "Atenção", tone: "warn" },
    { nome: "Geladeira de vacinas 01", tipo: "Calibração", prazo: "vence em 18 dias", status: "A vencer", tone: "warn" },
    { nome: "Autoclave Central 01", tipo: "Manutenção preventiva", prazo: "agendada 24/08", status: "Planejado", tone: "ok" },
    { nome: "Alvará sanitário", tipo: "Documento", prazo: "vencido há 3 dias", status: "Crítico", tone: "danger" },
  ];
  const toneClasses = {
    warn: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  } as const;

  const activity: Array<{ icon: LucideIcon; text: string; time: string; color: string }> = [
    { icon: CheckCircle2, text: "Marina anexou evidência em AVCB", time: "há 8 min", color: "text-emerald-600" },
    { icon: AlertTriangle, text: "Novo alerta: Alvará vencido", time: "há 32 min", color: "text-rose-600" },
    { icon: Activity, text: "Manutenção preventiva concluída", time: "há 2h", color: "text-cyan-600" },
  ];

  return (
    <div className="relative isolate rounded-[1.4rem] border border-white/70 bg-white/80 p-3 shadow-[0_40px_100px_-50px_rgba(15,41,71,0.7)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-br from-cyan-400/15 via-white/0 to-blue-500/15 blur-3xl" />
      <div className="rounded-[1rem] border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-5 shadow-inner">
        {/* Chrome */}
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </div>
            <div className="ml-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <LockKeyhole className="h-3 w-3" />
              app.conformflow.com.br / dashboard
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online — atualizado agora
          </div>
        </div>

        {/* Header row */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Dashboard executivo
            </div>
            <div className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">
              Índice de conformidade
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-[-0.03em] text-slate-950 tabular-nums">
                92
              </span>
              <span className="text-lg font-semibold text-slate-500">%</span>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <TrendingUp className="h-3 w-3" /> +4,2 pts
              </span>
            </div>
          </div>
          <div className="hidden rounded-xl border border-slate-200 bg-white p-3 text-right shadow-sm sm:block">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Próx. auditoria
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-950">14 dias</div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Documentos vencidos", value: "4", tone: "text-rose-600", bar: "w-1/4 bg-rose-500" },
            { label: "Equip. em atenção", value: "6", tone: "text-amber-600", bar: "w-2/5 bg-amber-500" },
            { label: "Pendências críticas", value: "7", tone: "text-cyan-700", bar: "w-1/2 bg-cyan-600" },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_10px_24px_-22px_rgba(15,41,71,0.5)]"
            >
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {k.label}
              </div>
              <div className={cn("mt-1 text-2xl font-semibold tabular-nums", k.tone)}>
                {k.value}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full", k.bar)} />
              </div>
            </div>
          ))}
        </div>

        {/* Chart + activity */}
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Vencimentos nos próximos 90 dias
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-950">
                  Distribuição por semana
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-cyan-600" /> Docs
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-amber-500" /> Equip.
                </span>
              </div>
            </div>
            <div className="mt-4 flex h-20 items-end gap-2">
              {[
                [42, 22], [58, 30], [38, 48], [72, 34], [54, 60],
                [86, 40], [64, 72], [78, 50], [52, 66], [68, 42],
                [44, 58], [60, 74],
              ].map(([a, b], i) => (
                <div key={i} className="flex flex-1 flex-col-reverse gap-0.5">
                  <span
                    className="rounded-t-sm bg-cyan-600/85"
                    style={{ height: `${a * 0.55}%` }}
                  />
                  <span
                    className="rounded-t-sm bg-amber-500/80"
                    style={{ height: `${b * 0.4}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] font-medium text-slate-400">
              <span>Sem 1</span>
              <span>Sem 6</span>
              <span>Sem 12</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Atividade recente
              </div>
              <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-semibold text-cyan-700">
                ao vivo
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <a.icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", a.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium text-slate-800">{a.text}</div>
                    <div className="text-[9px] text-slate-400">{a.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Próximos vencimentos
            </div>
            <span className="text-[10px] font-medium text-cyan-700">Ver todos →</span>
          </div>
          {rows.map((r) => (
            <div
              key={r.nome}
              className="grid grid-cols-[1.4fr_0.9fr_1fr_auto] items-center gap-3 border-b border-slate-50 px-4 py-2.5 text-[11px] last:border-b-0"
            >
              <span className="truncate font-semibold text-slate-900">{r.nome}</span>
              <span className="text-slate-500">{r.tipo}</span>
              <span className="text-slate-500">{r.prazo}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1",
                  toneClasses[r.tone],
                )}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProcessSteps() {
  const steps = [
    ["1", "Cadastre empresa e unidades", "Estruture o ambiente por operação, filial ou cliente."],
    [
      "2",
      "Centralize dados críticos",
      "Documentos, equipamentos, anexos e responsáveis em um só lugar.",
    ],
    ["3", "Acompanhe vencimentos", "Veja prioridades, prazos e pendências antes da auditoria."],
    ["4", "Atue com rastreabilidade", "Registre tratativas, evidências e histórico de alterações."],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {steps.map(([number, title, description]) => (
        <article key={number} className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
            {number}
          </div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </article>
      ))}
    </div>
  );
}

export function AddOn({ title, price }: { title: string; price: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <PlusCircle className="mb-3 h-5 w-5 text-cyan-700" />
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{price}</div>
    </div>
  );
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
