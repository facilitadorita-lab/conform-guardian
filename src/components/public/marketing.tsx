/* eslint-disable react-refresh/only-export-components */
import { Link } from "@tanstack/react-router";
import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
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

const publicBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function withPublicBasePath(href: string) {
  return href.startsWith("/") ? `${publicBasePath}${href}` : href;
}

const publicNavigationItems = [
  { label: "Benefícios", href: withPublicBasePath("/#beneficios"), section: "beneficios" },
  { label: "Módulos", href: withPublicBasePath("/#modulos"), section: "modulos" },
  { label: "Como funciona", href: withPublicBasePath("/#como-funciona"), section: "como-funciona" },
  { label: "Planos", href: withPublicBasePath("/#planos"), section: "planos" },
  { label: "FAQ", href: withPublicBasePath("/#faq"), section: "faq" },
];

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
          src={withPublicBasePath("/conform-flow-logo-transparent.png")}
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
  const [isCompact, setIsCompact] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const compactReference = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const nextValue = window.scrollY > 24;
      if (nextValue === compactReference.current) return;
      compactReference.current = nextValue;
      setIsCompact(nextValue);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = publicNavigationItems
      .map((item) => ({ item, element: document.getElementById(item.section) }))
      .filter((entry): entry is { item: (typeof publicNavigationItems)[number]; element: HTMLElement } => entry.element !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-22% 0px -64% 0px", threshold: [0.1, 0.35, 0.6] },
    );
    sections.forEach(({ element }) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <header className={cn("cf-public-header sticky top-0 z-40", isCompact && "is-compact")}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 transition-[height] duration-200 ease-out lg:px-8",
          isCompact ? "h-16" : "h-[5.25rem]",
        )}
      >
        <Link to="/" aria-label="Página inicial Conform Flow">
          <LogoSignature />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex" aria-label="Navegação principal">
          {publicNavigationItems.map((item) => (
            <a
              key={item.section}
              href={item.href}
              aria-current={activeSection === item.section ? "page" : undefined}
              className={cn(
                "relative rounded-md py-2 transition-colors hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-4",
                activeSection === item.section && "text-slate-950 after:absolute after:inset-x-1 after:-bottom-0.5 after:h-px after:bg-cyan-600",
              )}
            >
              {item.label}
            </a>
          ))}
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
            className="cf-public-cta rounded-xl bg-slate-950 px-4 text-white shadow-[0_12px_28px_-20px_rgba(15,23,42,0.72)] hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <Link
              to="/cadastro"
              search={{ plan: "profissional", interval: "monthly", checkout: undefined }}
            >
              Testar grátis por 7 dias
            </Link>
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
        <div className="grid gap-12 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div>
            <LogoSignature tone="light" />
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              Plataforma SaaS para gestão de conformidade operacional em empresas reguladas.
              Documentos, equipamentos e vencimentos sob controle.
            </p>
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
              { label: "Entrar na plataforma", href: "/login" },
              { label: "Começar teste gratuito", href: "/cadastro?plan=profissional&interval=monthly" },
            ]}
          />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-slate-500 md:flex-row lg:px-8">
          <span>© {new Date().getFullYear()} Conform Flow. Todos os direitos reservados.</span>
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
            href={withPublicBasePath(link.href)}
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

function useInViewOnce<T extends Element>(threshold = 0.12) {
  const reference = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = reference.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { reference, visible };
}

const AnimatedNumber = memo(function AnimatedNumber({
  value,
  active,
  duration = 2100,
  delay = 760,
}: {
  value: number;
  active: boolean;
  duration?: number;
  delay?: number;
}) {
  const [current, setCurrent] = useState(0);
  const didAnimate = useRef(false);

  useEffect(() => {
    if (!active || didAnimate.current) return;
    didAnimate.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(value);
      return;
    }

    const startedAt = performance.now() + delay;
    let frame = 0;
    const tick = (now: number) => {
      if (now < startedAt) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 4;
      const next = Math.round(value * eased);
      setCurrent((previous) => (previous === next ? previous : next));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, delay, duration, value]);

  return <>{current}</>;
});

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { reference, visible } = useInViewOnce<HTMLDivElement>();

  return (
    <div
      ref={reference}
      className={cn("cf-reveal", visible && "is-visible", className)}
      style={{ "--cf-reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
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

export function BenefitsBento() {
  return (
    <div className="cf-benefits-bento" aria-label="Benefícios do Conform Flow">
      <article className="cf-bento-card cf-bento-card-risk">
        <div className="cf-bento-icon"><ShieldAlert className="h-5 w-5" /></div>
        <div className="mt-auto max-w-sm">
          <p className="cf-bento-kicker">Risco sob controle</p>
          <h3 className="cf-bento-title">Antecipe o que pode interromper sua operação.</h3>
          <p className="cf-bento-copy">Veja os prazos críticos com contexto e priorize cada ação antes de uma não conformidade.</p>
        </div>
        <div className="cf-bento-compliance" aria-label="Exemplo demonstrativo de risco operacional">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>Mapa de risco</span><span className="text-emerald-700">92% em dia</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-[92%] rounded-full bg-emerald-500" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
            <span className="rounded-lg bg-rose-50 px-2 py-1.5 text-rose-700">1 crítico</span>
            <span className="rounded-lg bg-amber-50 px-2 py-1.5 text-amber-700">3 atenção</span>
            <span className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-700">24 em dia</span>
          </div>
        </div>
      </article>

      <article className="cf-bento-card cf-bento-card-audit">
        <div className="flex items-start justify-between gap-4">
          <div className="cf-bento-icon"><ScrollText className="h-5 w-5" /></div>
          <span className="cf-bento-mini-label">Histórico</span>
        </div>
        <div className="mt-auto">
          <p className="cf-bento-kicker">Auditoria sem caça ao arquivo</p>
          <h3 className="cf-bento-title">Cada mudança fica registrada.</h3>
        </div>
        <div className="cf-bento-timeline" aria-label="Exemplo demonstrativo de rastreabilidade">
          <span className="cf-bento-timeline-dot" />
          <div><strong>Documento atualizado</strong><small>Hoje, 14:32</small></div>
          <span className="cf-bento-timeline-line" />
          <div><strong>Versão anterior preservada</strong><small>Histórico disponível</small></div>
        </div>
      </article>

      <article className="cf-bento-card cf-bento-card-alert">
        <div className="flex items-start justify-between gap-4">
          <div className="cf-bento-icon"><BellRing className="h-5 w-5" /></div>
          <span className="cf-bento-mini-status">Atenção</span>
        </div>
        <div className="mt-auto">
          <p className="cf-bento-kicker">Prazos que não passam despercebidos</p>
          <h3 className="cf-bento-title">Alertas antes do vencimento.</h3>
        </div>
        <div className="cf-bento-alert-preview" aria-label="Exemplo demonstrativo de alerta">
          <span className="font-semibold">Licença sanitária</span>
          <span>Vence em 12 dias</span>
        </div>
      </article>

      <article className="cf-bento-card cf-bento-card-trace">
        <div className="cf-bento-icon"><Activity className="h-5 w-5" /></div>
        <div className="mt-auto">
          <p className="cf-bento-kicker">Uma fonte de verdade</p>
          <h3 className="cf-bento-title">Dados e evidências no mesmo fluxo.</h3>
        </div>
        <div className="cf-bento-flow" aria-label="Fluxo demonstrativo de registro">
          <span>Registro</span><i /><span>Responsável</span><i /><span>Evidência</span>
        </div>
      </article>

      <article className="cf-bento-card cf-bento-card-executive">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="cf-bento-kicker">Visão executiva</p>
            <h3 className="cf-bento-title">Decida pela prioridade, não pelo ruído.</h3>
          </div>
          <div className="cf-bento-score"><strong>92%</strong><span>conformidade</span></div>
        </div>
        <div className="cf-bento-bars" aria-label="Exemplo demonstrativo de visão executiva">
          <span style={{ height: "38%" }} /><span style={{ height: "58%" }} /><span style={{ height: "44%" }} />
          <span style={{ height: "75%" }} /><span style={{ height: "61%" }} /><span style={{ height: "88%" }} />
          <span style={{ height: "70%" }} /><span style={{ height: "92%" }} />
        </div>
      </article>
    </div>
  );
}

const showcaseModules = [
  { id: "dashboard", label: "Dashboard", icon: Gauge, description: "Prioridades, indicadores e riscos em uma leitura executiva." },
  { id: "documentos", label: "Documentos", icon: FileText, description: "Validades, evidências e responsáveis em um só lugar." },
  { id: "equipamentos", label: "Equipamentos", icon: ClipboardCheck, description: "Histórico técnico com todas as rotinas conectadas." },
  { id: "manutencoes", label: "Manutenções", icon: Wrench, description: "Preventivas e corretivas com contexto operacional." },
  { id: "alertas", label: "Alertas", icon: BellRing, description: "O que merece ação antes de virar atraso." },
  { id: "auditoria", label: "Auditoria", icon: ShieldCheck, description: "Trilha completa de movimentações e evidências." },
] as const;

type ShowcaseModuleId = (typeof showcaseModules)[number]["id"];

export function ProductShowcase() {
  const [activeId, setActiveId] = useState<ShowcaseModuleId>("dashboard");
  const activeModule = showcaseModules.find((item) => item.id === activeId) ?? showcaseModules[0];
  const ActiveIcon = activeModule.icon;

  return (
    <div className="cf-showcase-shell">
      <div className="cf-showcase-navigation" role="tablist" aria-label="Módulos do Conform Flow">
        <div className="mb-6 max-w-sm">
          <p className="cf-showcase-eyebrow">Na prática</p>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Uma rotina inteira, conectada.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">Navegue pela visão que organiza cada parte da operação.</p>
        </div>
        <div className="grid gap-1">
          {showcaseModules.map((module) => {
            const Icon = module.icon;
            const isActive = activeId === module.id;
            return (
              <button
                key={module.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`showcase-${module.id}`}
                id={`tab-${module.id}`}
                onClick={() => setActiveId(module.id)}
                className={cn("cf-showcase-tab", isActive && "is-active")}
              >
                <Icon className="h-4 w-4" />
                <span>{module.label}</span>
                <ArrowRight className="cf-showcase-tab-arrow h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="cf-showcase-view" role="tabpanel" id={`showcase-${activeModule.id}`} aria-labelledby={`tab-${activeModule.id}`}>
        <div key={activeModule.id} className="cf-showcase-visual">
          <div className="cf-showcase-browser">
            <div className="cf-showcase-browser-bar"><span /><span /><span /><div>conform flow / {activeModule.label.toLowerCase()}</div></div>
            <ShowcaseScreen id={activeModule.id} />
          </div>
          <div className="cf-showcase-caption">
            <div className="cf-showcase-caption-icon"><ActiveIcon className="h-4 w-4" /></div>
            <div><strong>{activeModule.label}</strong><p>{activeModule.description}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowcaseScreen({ id }: { id: ShowcaseModuleId }) {
  if (id === "documentos") return <DocumentsShowcase />;
  if (id === "equipamentos") return <EquipmentShowcase />;
  if (id === "manutencoes") return <MaintenanceShowcase />;
  if (id === "alertas") return <AlertsShowcase />;
  if (id === "auditoria") return <AuditShowcase />;
  return <DashboardShowcase />;
}

function ShowcaseLabel({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" | "ok" | "danger" }) {
  return <span className={cn("cf-showcase-label", `is-${tone}`)}>{children}</span>;
}

function DashboardShowcase() {
  return <div className="cf-showcase-screen"><div className="cf-showcase-screen-heading"><div><span>Visão geral</span><strong>Índice de conformidade</strong></div><ShowcaseLabel tone="ok">Em dia</ShowcaseLabel></div><div className="cf-showcase-metric-row"><div><small>Conformidade</small><strong>92%</strong><em>+4,2 pts</em></div><div><small>Vencem em 30 dias</small><strong className="text-amber-600">11</strong><em>acompanhar</em></div><div><small>Pendências críticas</small><strong className="text-rose-600">2</strong><em>priorizar</em></div></div><div className="cf-showcase-chart"><div className="cf-showcase-chart-title"><span>Risco operacional</span><small>últimos 90 dias</small></div><div className="cf-showcase-chart-bars">{[35, 50, 42, 68, 55, 81, 63, 90, 72, 84].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div></div>;
}

function DocumentsShowcase() {
  const rows = [["Alvará sanitário", "18/09/2026", "Atenção", "warn"], ["AVCB", "04/10/2026", "Em dia", "ok"], ["PGRSS", "12/10/2026", "Em dia", "ok"]] as const;
  return <div className="cf-showcase-screen"><div className="cf-showcase-screen-heading"><div><span>Documentos</span><strong>Validades e evidências</strong></div><button type="button">Novo documento</button></div><div className="cf-showcase-table"><div className="cf-showcase-table-head"><span>Documento</span><span>Vencimento</span><span>Status</span></div>{rows.map(([name, due, status, tone]) => <div key={name} className="cf-showcase-table-row"><strong>{name}</strong><span>{due}</span><ShowcaseLabel tone={tone}>{status}</ShowcaseLabel></div>)}</div><div className="cf-showcase-document-footer"><FileText className="h-4 w-4" /><span>Versões e anexos preservados no histórico</span></div></div>;
}

function EquipmentShowcase() {
  return <div className="cf-showcase-screen"><div className="cf-showcase-screen-heading"><div><span>Equipamentos</span><strong>Autoclave Central 01</strong></div><ShowcaseLabel tone="ok">Em dia</ShowcaseLabel></div><div className="cf-showcase-equipment-grid"><div className="cf-showcase-equipment-card"><small>Próxima calibração</small><strong>08/09/2026</strong><span>Laboratório metrológico</span></div><div className="cf-showcase-equipment-card"><small>Qualificação</small><strong>Válida</strong><span>Revisão em 90 dias</span></div></div><div className="cf-showcase-tab-strip"><span className="is-active">Dados gerais</span><span>Calibrações</span><span>Qualificações</span><span>Histórico</span></div><div className="cf-showcase-history-line"><span /><div><strong>Manutenção preventiva registrada</strong><small>Ordem de serviço anexada</small></div></div></div>;
}

function MaintenanceShowcase() {
  return <div className="cf-showcase-screen"><div className="cf-showcase-screen-heading"><div><span>Manutenções</span><strong>Planejamento operacional</strong></div><button type="button">Nova manutenção</button></div><div className="cf-showcase-calendar"><div className="cf-showcase-calendar-heading"><span>Agosto</span><small>2026</small></div><div className="cf-showcase-calendar-days">{Array.from({ length: 21 }, (_, index) => <span key={index} className={index === 9 || index === 14 || index === 17 ? "is-event" : ""}>{index + 1}</span>)}</div></div><div className="cf-showcase-maintenance-row"><Wrench className="h-4 w-4" /><div><strong>Preventiva · Autoclave Central 01</strong><span>24/08/2026 · responsável definido</span></div><ShowcaseLabel tone="warn">Agendada</ShowcaseLabel></div></div>;
}

function AlertsShowcase() {
  const items = [["Licença sanitária", "vence em 12 dias", "warn"], ["Certificado de calibração", "vence em 18 dias", "warn"], ["Plano de manutenção", "vencido há 2 dias", "danger"]] as const;
  return <div className="cf-showcase-screen"><div className="cf-showcase-screen-heading"><div><span>Alertas</span><strong>O que pede atenção</strong></div><span className="cf-showcase-counter">3</span></div><div className="cf-showcase-alert-list">{items.map(([title, detail, tone]) => <div key={title}><span className={cn("cf-showcase-alert-dot", `is-${tone}`)} /><div><strong>{title}</strong><small>{detail}</small></div><ShowcaseLabel tone={tone}>Ver</ShowcaseLabel></div>)}</div></div>;
}

function AuditShowcase() {
  return <div className="cf-showcase-screen"><div className="cf-showcase-screen-heading"><div><span>Auditoria</span><strong>Rastreabilidade completa</strong></div><ShowcaseLabel tone="ok">Íntegro</ShowcaseLabel></div><div className="cf-showcase-audit-list"><div><span className="is-cyan" /><div><strong>Anexo incluído</strong><small>Documento · hoje, 14:32</small></div></div><div><span className="is-blue" /><div><strong>Responsável atribuído</strong><small>Equipamento · hoje, 11:08</small></div></div><div><span className="is-emerald" /><div><strong>Tratativa concluída</strong><small>Pendência · ontem, 16:42</small></div></div></div><div className="cf-showcase-audit-footer"><ShieldCheck className="h-4 w-4" /><span>Histórico disponível para consulta</span></div></div>;
}

const publicPlanFallbacks = [
  {
    name: "Essencial",
    audience: "Para centralizar documentos, anexos e vencimentos.",
    price: "R$ 159,90",
    features: ["Documentos e anexos", "Vencimentos e alertas", "Dashboard e assistente IA"],
  },
  {
    name: "Profissional",
    audience: "Para controlar toda a rotina de conformidade.",
    price: "R$ 249,90",
    features: ["Tudo do Essencial", "Equipamentos e manutenções", "Calibrações e qualificações"],
  },
  {
    name: "Plano Rede",
    audience: "Para operações com mais unidades e visão consolidada.",
    price: "R$ 399,90",
    features: ["Tudo do Profissional", "Visão multiunidade", "Relatórios por unidade"],
  },
];

export function PricingGrid({ compact = false }: { compact?: boolean }) {
  const catalog = usePublicCatalog();
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  if (catalog.isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-3" aria-label="Carregando planos">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="cf-skeleton-shimmer h-[430px] rounded-3xl" />
        ))}
      </div>
    );
  }

  if (catalog.error || !catalog.data?.plans.length) {
    return (
      <div>
        <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-slate-600">
            Estamos atualizando as opções de assinatura. Confira os planos abaixo ou tente novamente.
          </p>
          <Button type="button" variant="outline" className="shrink-0 rounded-lg" onClick={() => catalog.refetch()}>
            Atualizar
          </Button>
        </div>
        <div className="cf-stagger-grid grid gap-5 lg:grid-cols-3">
          {publicPlanFallbacks.map((plan) => (
            <article key={plan.name} className="cf-plan-card flex rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,41,71,0.4)]">
              <div className="flex w-full flex-col">
                <h3 className="text-lg font-semibold text-slate-950">{plan.name}</h3>
                <p className="mt-1.5 min-h-10 text-[13px] leading-5 text-slate-600">{plan.audience}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-slate-950">{plan.price}</span>
                  <span className="pb-1 text-sm text-slate-500">/mês</span>
                </div>
                <div className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" disabled className="mt-5 h-10 rounded-xl text-sm">
                  Consulte as opções
                </Button>
              </div>
            </article>
          ))}
        </div>
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
      <div className="cf-stagger-grid grid gap-5 lg:grid-cols-3">
        {catalog.data.plans.map((plan) => (
          <article
            key={plan.id}
            className={cn(
              "cf-plan-card relative flex rounded-2xl border bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,41,71,0.4)] transition-[border-color,box-shadow,transform] duration-[200ms] ease-out hover:-translate-y-1 hover:shadow-[0_24px_58px_-42px_rgba(15,41,71,0.5)]",
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
              {interval === "monthly" ? (
                <p className="mt-2 text-xs font-medium leading-5 text-emerald-700">
                  7 dias grátis. Sem cobrança hoje. Cancele quando quiser.
                </p>
              ) : null}
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
                <a
                  href={withPublicBasePath(
                    `/cadastro?plan=${encodeURIComponent(plan.codigo)}&interval=${interval}`,
                  )}
                >
                  {interval === "monthly" ? "Testar grátis por 7 dias" : `Assinar ${plan.nome}`}
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
    "Dados organizados por empresa",
    "Acesso personalizado por usuário",
    "Histórico completo de atividades",
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
            Segurança para trabalhar com tranquilidade.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Informações organizadas, histórico completo e uma visão clara para cada operação.
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

function LegacyFAQSection() {
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
      a: "Sim. Cada pessoa acessa apenas o que precisa para trabalhar na sua operação.",
    },
  ];

  return (
    <section id="faq" className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-5 lg:px-8">
        <Reveal>
          <SectionTitle
            align="center"
            eyebrow="FAQ"
            title="Perguntas frequentes"
            description="Respostas rápidas para entender se o Conform Flow faz sentido para sua operação."
          />
        </Reveal>
        <Reveal delay={80}>
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
        </Reveal>
      </div>
    </section>
  );
}

export function FAQSection() {
  const faqs = [
    { q: "Para quais empresas o sistema é indicado?", a: "Para clínicas, laboratórios, casas de repouso, distribuidoras, empresas da saúde e demais operações reguladas que precisam organizar documentos, prazos e evidências." },
    { q: "Posso controlar documentos e equipamentos?", a: "Sim. O Essencial é focado em documentos, anexos e vencimentos. Os planos superiores adicionam equipamentos, calibrações, qualificações e manutenções." },
    { q: "Como funcionam os alertas?", a: "A plataforma acompanha as datas cadastradas e deixa em destaque os itens vencidos, próximos do prazo e que merecem atenção." },
    { q: "É possível gerenciar várias unidades?", a: "Sim. O Plano Rede foi pensado para operações com mais de uma unidade, visão consolidada e acompanhamento por filial." },
    { q: "Cada usuário tem um acesso próprio?", a: "Sim. Os acessos são organizados por perfil para que cada pessoa trabalhe apenas no escopo necessário para sua rotina." },
  ];

  return (
    <section id="faq" className="cf-faq-section py-28 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-16 lg:px-8">
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <SectionTitle
              eyebrow="Perguntas frequentes"
              title="Clareza antes de começar."
              description="O essencial para entender como o Conform Flow se encaixa na sua operação."
            />
            <div className="cf-faq-aside">
              <p>Ainda está avaliando o melhor plano?</p>
              <Link to="/planos" className="group">
                Comparar planos <ArrowRight className="cf-cta-arrow h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <Accordion type="single" collapsible className="cf-faq-accordion">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left text-[1rem] font-semibold text-slate-950 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="max-w-2xl text-sm leading-7 text-slate-600">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="cf-final-cta-section px-5 py-24 lg:px-8">
      <Reveal>
        <div className="cf-final-cta mx-auto max-w-7xl overflow-hidden rounded-[1.25rem] p-8 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.75)] md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="cf-cta-sequence">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Comece agora
            </div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Teste o Conform Flow sem compromisso.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Experimente todos os recursos por 7 dias. A ativação é rápida, você pode cancelar
              quando quiser e não precisa falar com vendas.
            </p>
          </div>
            <div className="cf-cta-actions flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild className="cf-public-cta rounded-xl bg-white text-slate-950 hover:bg-slate-100">
              <Link
                to="/cadastro"
                search={{ plan: "profissional", interval: "monthly", checkout: undefined }}
              >
                Testar grátis por 7 dias <ArrowRight className="cf-cta-arrow h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="cf-public-cta rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/planos">
                Conhecer planos <ArrowRight className="cf-cta-arrow h-4 w-4" />
              </Link>
            </Button>
          </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function ProductMockup() {
  const { reference, visible } = useInViewOnce<HTMLDivElement>(0.2);
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
    <div
      ref={reference}
      className={cn(
        "relative isolate rounded-[1.4rem] border border-white/70 bg-white/80 p-3 shadow-[0_40px_100px_-50px_rgba(15,41,71,0.7)] backdrop-blur-xl",
        visible && "cf-mockup-active",
      )}
    >
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-br from-cyan-400/15 via-white/0 to-blue-500/15 blur-3xl" />
      <div className="cf-mockup-shell rounded-[1rem] border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-5 shadow-inner">
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
        <div className="cf-mockup-header mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Dashboard executivo
            </div>
            <div className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">
              Índice de conformidade
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="cf-mockup-score inline-block min-w-[2.2ch] text-4xl font-semibold tracking-[-0.03em] text-slate-950 tabular-nums">
                <AnimatedNumber value={92} active={visible} />
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
              className="cf-mockup-kpi rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_10px_24px_-22px_rgba(15,41,71,0.5)]"
            >
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {k.label}
              </div>
              <div className={cn("mt-1 text-2xl font-semibold tabular-nums", k.tone)}>
                {k.value}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("cf-mockup-progress h-full origin-left rounded-full", k.bar)} />
              </div>
            </div>
          ))}
        </div>

        {/* Chart + activity */}
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="cf-mockup-chart rounded-xl border border-slate-200 bg-white p-4">
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

          <div className="cf-mockup-activity-panel rounded-xl border border-slate-200 bg-white p-4">
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
                <li key={i} className="cf-mockup-activity flex items-start gap-2.5">
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
        <div className="cf-mockup-table mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
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

function LegacyProcessSteps() {
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

export function ProcessSteps() {
  const steps = [
    ["01", "Centralize", "Organize os registros e as evidências que fazem parte da operação."],
    ["02", "Acompanhe", "Transforme datas, status e responsáveis em uma rotina clara."],
    ["03", "Antecipe", "Receba contexto para agir antes que um prazo se torne um risco."],
    ["04", "Comprove", "Mantenha a trilha de decisões e evidências pronta para consultar."],
  ];
  const { reference, visible } = useInViewOnce<HTMLDivElement>(0.28);

  return (
    <div ref={reference} className={cn("cf-process-steps", visible && "is-active")}>
      <div aria-hidden className="cf-process-rail"><span /></div>
      {steps.map(([number, title, description], index) => (
        <article key={number} className="cf-process-step">
          <div className="cf-process-marker"><span>{number}</span></div>
          <div>
            <p className="cf-process-kicker">Etapa {index + 1}</p>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function AddOn({
  title,
  price,
  description,
}: {
  title: string;
  price: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <PlusCircle className="mb-3 h-5 w-5 text-cyan-700" />
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{price}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
