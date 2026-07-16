/* eslint-disable react-refresh/only-export-components */
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Gauge,
  Layers3,
  LockKeyhole,
  type LucideIcon,
  Network,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export const publicPlans = [
  {
    name: "Essencial",
    price: "R$ 119,90",
    description: "Para operações que precisam organizar documentos, anexos e vencimentos.",
    users: "Até 2 usuários",
    units: "1 unidade",
    highlight: false,
    features: [
      "Dashboard completo",
      "Assistente IA",
      "Documentos e anexos",
      "Vencimentos e alertas",
      "Controle por empresa",
    ],
  },
  {
    name: "Completo",
    price: "R$ 159,90",
    description: "Para empresas que também controlam equipamentos e rotinas operacionais.",
    users: "Até 4 usuários",
    units: "1 unidade",
    highlight: true,
    features: [
      "Tudo do Essencial",
      "Equipamentos",
      "Calibrações e qualificações",
      "Manutenções",
      "Pendências e tratativas",
    ],
  },
  {
    name: "Plano Rede",
    price: "R$ 289,90",
    description: "Para redes, grupos e operações com visão multiunidade.",
    users: "Até 8 usuários",
    units: "Até 3 unidades",
    highlight: false,
    features: [
      "Tudo do Completo",
      "Visão multiunidade",
      "Relatórios por unidade",
      "Visão consolidada",
      "Governança para expansão",
    ],
  },
];

export const benefitCards = [
  {
    title: "Menos planilhas soltas",
    description: "Concentre prazos, anexos, evidências e responsáveis em uma plataforma única.",
    icon: Layers3,
  },
  {
    title: "Mais preparo para auditorias",
    description:
      "Histórico, evidências e status ficam organizados para inspeções e rotinas internas.",
    icon: BadgeCheck,
  },
  {
    title: "Controle por empresa e unidade",
    description: "Cada cliente acessa somente o próprio ambiente, com dados separados.",
    icon: Network,
  },
  {
    title: "Decisão com visibilidade",
    description: "Indicadores ajudam a priorizar o que vence primeiro e o que gera mais risco.",
    icon: ClipboardList,
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
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl p-1.5 shadow-sm ring-1",
          tone === "light" ? "bg-white ring-white/20" : "bg-white ring-slate-200",
        )}
      >
        <img
          src="/conform-flow-logo-transparent.png"
          alt="Conform Flow"
          className="h-full w-full object-contain"
        />
      </div>
      {!compact ? (
        <div className="leading-tight">
          <div
            className={cn(
              "text-base font-bold tracking-tight",
              tone === "light" ? "text-white" : "text-slate-950",
            )}
          >
            Conform Flow
          </div>
          <div className={cn("text-xs", tone === "light" ? "text-slate-300" : "text-slate-500")}>
            Conformidade operacional
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link to="/" aria-label="Página inicial Conform Flow">
          <LogoSignature />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
          <a className="hover:text-slate-950" href="/#recursos">
            Recursos
          </a>
          <a className="hover:text-slate-950" href="/#modulos">
            Módulos
          </a>
          <Link className="hover:text-slate-950" to="/planos">
            Planos
          </Link>
          <a className="hover:text-slate-950" href="/#seguranca">
            Segurança
          </a>
          <a className="hover:text-slate-950" href="/#faq">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden rounded-xl md:inline-flex">
            <Link to="/login" search={{ msg: undefined }}>
              Entrar
            </Link>
          </Button>
          <Button asChild className="rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800">
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
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <LogoSignature />
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
            Plataforma SaaS para gestão de conformidade, documentos, equipamentos e vencimentos em
            empresas reguladas.
          </p>
        </div>
        <FooterGroup title="Produto" links={["Recursos", "Módulos", "Planos", "Segurança"]} />
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Acesso</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
            <Link to="/login" search={{ msg: undefined }} className="hover:text-slate-950">
              Entrar na plataforma
            </Link>
            <a
              href="mailto:comercial@conformflow.com.br?subject=Solicitar demonstração Conform Flow"
              className="hover:text-slate-950"
            >
              Solicitar demonstração
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 px-5 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Conform Flow. Todos os direitos reservados.
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
        {links.map((link) => (
          <a key={link} href={`/#${slug(link)}`} className="hover:text-slate-950">
            {link}
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
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
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
    <article className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
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
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {publicPlans.map((plan) => (
        <article
          key={plan.name}
          className={cn(
            "relative flex rounded-3xl border bg-white p-6 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.5)]",
            plan.highlight ? "border-cyan-400 ring-4 ring-cyan-100" : "border-slate-200",
          )}
        >
          {plan.highlight ? (
            <div className="absolute right-5 top-5 rounded-full bg-cyan-600 px-3 py-1 text-xs font-semibold text-white">
              Recomendado
            </div>
          ) : null}
          <div className="flex w-full flex-col">
            <h3 className="text-lg font-semibold text-slate-950">{plan.name}</h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p>
            <div className="mt-6 flex items-end gap-1">
              <span className="text-3xl font-semibold tracking-tight text-slate-950">
                {plan.price}
              </span>
              <span className="pb-1 text-sm text-slate-500">/mês</span>
            </div>
            <div className="mt-5 grid gap-2 text-sm text-slate-600">
              <PlanMeta icon={Users}>{plan.users}</PlanMeta>
              <PlanMeta icon={Building2}>{plan.units}</PlanMeta>
            </div>
            <div className={cn("mt-6 space-y-3", compact && "mt-5")}>
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <Button
              asChild
              className={cn(
                "mt-7 rounded-xl",
                plan.highlight
                  ? "bg-slate-950 text-white hover:bg-slate-800"
                  : "bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              <a href="mailto:comercial@conformflow.com.br?subject=Quero contratar o Conform Flow">
                Falar com especialista
              </a>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
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
            <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
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
          className="mt-10 rounded-3xl border border-slate-200 px-6"
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
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.75)] md:p-12">
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
  const rows = [
    ["AVCB", "Documentos", "04/08/2026", "Atenção"],
    ["Geladeira de vacinas 01", "Calibração", "09/08/2026", "A vencer"],
    ["Autoclave Central 01", "Manutenção", "24/08/2026", "Planejado"],
  ];

  return (
    <div className="relative rounded-[2rem] border border-white/20 bg-white p-3 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Dashboard
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-950">Índice de conformidade</div>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            87%
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Documentos vencidos", "4"],
            ["Equip. em atenção", "6"],
            ["Pendências críticas", "7"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <div
              key={row.join("-")}
              className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr] gap-3 border-b border-slate-100 px-4 py-3 text-xs last:border-b-0"
            >
              <span className="font-semibold text-slate-950">{row[0]}</span>
              <span className="text-slate-600">{row[1]}</span>
              <span className="text-slate-600">{row[2]}</span>
              <span className="font-semibold text-amber-600">{row[3]}</span>
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
