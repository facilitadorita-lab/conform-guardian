/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  History,
  type LucideIcon,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal, SectionTitle, useInViewOnce } from "@/components/public/marketing";

/* ------------------------------------------------------------------ *
 * Small demonstrative interface primitives (visual only)
 * ------------------------------------------------------------------ */

function MiniPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-[0_18px_40px_-34px_rgba(15,41,71,0.5)]",
        className,
      )}
    >
      {title ? (
        <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "danger" | "info";
  children: ReactNode;
}) {
  const tones = {
    ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warn: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    info: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  } as const;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold ring-1 tabular-nums",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

function MiniRows({
  rows,
}: {
  rows: Array<{ label: string; meta: string; status: string; tone: "ok" | "warn" | "danger" | "info" }>;
}) {
  return (
    <div className="divide-y divide-slate-100">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <div className="truncate text-[11.5px] font-semibold text-slate-900">{row.label}</div>
            <div className="truncate text-[10px] text-slate-500">{row.meta}</div>
          </div>
          <StatusPill tone={row.tone}>{row.status}</StatusPill>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 4. Benefits — bento grid
 * ------------------------------------------------------------------ */

function BentoCell({
  className,
  eyebrow,
  icon: Icon,
  title,
  description,
  children,
}: {
  className?: string;
  eyebrow?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <article className={cn("cf-bento-cell", className)}>
      <div className="flex items-start gap-3">
        <span className="cf-bento-icon">
          <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden />
        </span>
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
              {eyebrow}
            </div>
          ) : null}
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h3>
          <p className="mt-1.5 text-[13.5px] leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  );
}

export function BenefitsBento() {
  return (
    <div className="cf-bento grid gap-4 lg:grid-cols-6">
      <BentoCell
        className="lg:col-span-4"
        eyebrow="Reduza riscos"
        icon={ShieldCheck}
        title="Pendências resolvidas antes da fiscalização"
        description="Cada item crítico fica visível, priorizado e com responsável definido — nada depende de lembrete manual."
      >
        <div className="grid gap-3 sm:grid-cols-[1.25fr_1fr]">
          <MiniPanel title="Pendências por criticidade">
            <div className="space-y-2.5">
              {[
                { label: "Crítico", value: 7, width: "78%", bar: "bg-rose-500" },
                { label: "Atenção", value: 12, width: "54%", bar: "bg-amber-500" },
                { label: "Em dia", value: 148, width: "92%", bar: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[10.5px] font-medium text-slate-600">
                    <span>{item.label}</span>
                    <span className="tabular-nums">{item.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className={cn("cf-bar block h-full origin-left rounded-full", item.bar)}
                      style={{ width: item.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </MiniPanel>
          <MiniPanel title="Conformidade">
            <div className="flex h-full flex-col justify-center">
              <div className="flex items-baseline gap-1">
                <span className="text-[2.6rem] font-semibold leading-none tracking-[-0.04em] text-slate-950 tabular-nums">
                  92
                </span>
                <span className="text-base font-semibold text-slate-400">%</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Índice consolidado do ambiente monitorado.
              </p>
            </div>
          </MiniPanel>
        </div>
      </BentoCell>

      <BentoCell
        className="lg:col-span-2"
        eyebrow="Alertas"
        icon={BellRing}
        title="Avisos antes do vencimento"
        description="O time certo é notificado no momento certo."
      >
        <MiniPanel>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-slate-900">
                Licença sanitária
              </div>
              <div className="mt-0.5 text-[10.5px] text-slate-500">Vence em 12 dias</div>
            </div>
            <StatusPill tone="warn">Atenção</StatusPill>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <span className="cf-bar block h-full w-[68%] origin-left rounded-full bg-amber-500" />
          </div>
        </MiniPanel>
      </BentoCell>

      <BentoCell
        className="lg:col-span-2"
        eyebrow="Rastreabilidade"
        icon={History}
        title="Histórico completo de cada ação"
        description="Quem alterou, o que mudou e quando."
      >
        <ol className="cf-mini-timeline">
          {[
            ["Documento atualizado", "AVCB — sede"],
            ["Responsável", "Coordenação de qualidade"],
            ["Data e horário", "24/08 · 09:41"],
            ["Histórico registrado", "Versão 4 · evidência anexada"],
          ].map(([label, meta]) => (
            <li key={label}>
              <span className="cf-mini-timeline-dot" aria-hidden />
              <div className="min-w-0">
                <div className="truncate text-[11.5px] font-semibold text-slate-900">{label}</div>
                <div className="truncate text-[10px] text-slate-500">{meta}</div>
              </div>
            </li>
          ))}
        </ol>
      </BentoCell>

      <BentoCell
        className="lg:col-span-2"
        eyebrow="Tempo do time"
        icon={CalendarClock}
        title="Menos planilha, mais operação"
        description="Uma rotina só, centralizada e auditável, no lugar de e-mails e controles paralelos."
      >
        <div className="grid grid-cols-2 gap-3">
          {[
            ["1", "sistema para toda a conformidade"],
            ["0", "planilhas paralelas necessárias"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-slate-50/90 p-3 ring-1 ring-slate-200/70">
              <div className="text-2xl font-semibold leading-none tracking-[-0.03em] text-slate-950 tabular-nums">
                {value}
              </div>
              <p className="mt-1.5 text-[10.5px] leading-4 text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </BentoCell>

      <BentoCell
        className="lg:col-span-2"
        eyebrow="Visão executiva"
        icon={Gauge}
        title="Decisões com dado atualizado"
        description="Indicadores de risco e prioridade em uma leitura só."
      >
        <MiniPanel>
          <div className="flex items-end gap-1.5">
            {[38, 52, 44, 66, 58, 74, 62, 81].map((height, index) => (
              <span
                key={index}
                className="cf-bento-spark w-full rounded-t-sm bg-cyan-600/85"
                style={{ height: `${height * 0.55}px` }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-500">
            <span>Conformidade por mês</span>
            <span className="text-emerald-700">tendência positiva</span>
          </div>
        </MiniPanel>
      </BentoCell>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 5. Modules — product showcase
 * ------------------------------------------------------------------ */

type ShowcaseModule = {
  id: string;
  label: string;
  icon: LucideIcon;
  summary: string;
  screen: ReactNode;
};

function ScreenFrame({
  path,
  title,
  subtitle,
  children,
}: {
  path: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="cf-screen">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-300" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
          </span>
          <span className="ml-1.5 text-[10.5px] font-medium text-slate-500">{path}</span>
        </div>
        <span className="hidden rounded-full border border-slate-200 px-2 py-0.5 text-[9.5px] font-medium text-slate-500 sm:inline">
          empresa ativa
        </span>
      </div>
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h3>
        <p className="mt-0.5 text-[11.5px] text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

const showcaseModules: ShowcaseModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Gauge,
    summary: "Indicadores de conformidade, vencimentos e riscos em uma visão clara.",
    screen: (
      <ScreenFrame
        path="/dashboard"
        title="Dashboard executivo"
        subtitle="Panorama consolidado do ambiente monitorado."
      >
        <div className="grid grid-cols-3 gap-2.5">
          {[
            ["Conformidade", "92%", "text-slate-950"],
            ["Vencidos", "4", "text-rose-600"],
            ["Em atenção", "12", "text-amber-600"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="text-[9.5px] font-medium uppercase tracking-wider text-slate-500">
                {label}
              </div>
              <div className={cn("mt-1 text-xl font-semibold tabular-nums", tone)}>{value}</div>
            </div>
          ))}
        </div>
        <MiniPanel title="Vencimentos nos próximos 90 dias" className="mt-3">
          <div className="flex h-16 items-end gap-1.5">
            {[42, 58, 38, 72, 54, 86, 64, 78, 52, 68, 44, 60].map((height, index) => (
              <span
                key={index}
                className="w-full rounded-t-sm bg-cyan-600/85"
                style={{ height: `${height * 0.62}%` }}
              />
            ))}
          </div>
        </MiniPanel>
      </ScreenFrame>
    ),
  },
  {
    id: "documentos",
    label: "Documentos",
    icon: FileText,
    summary: "Validades, anexos, responsáveis e evidências organizados por empresa.",
    screen: (
      <ScreenFrame
        path="/documentos"
        title="Documentos"
        subtitle="Controle de validade com evidência anexada."
      >
        <MiniPanel>
          <MiniRows
            rows={[
              { label: "AVCB — sede administrativa", meta: "Bombeiros · vence em 12 dias", status: "Atenção", tone: "warn" },
              { label: "Alvará sanitário", meta: "Vigilância · vencido há 3 dias", status: "Crítico", tone: "danger" },
              { label: "Licença ambiental", meta: "Renovada em 02/07", status: "Em dia", tone: "ok" },
              { label: "Contrato de resíduos", meta: "Vence em 64 dias", status: "Em dia", tone: "ok" },
            ]}
          />
        </MiniPanel>
      </ScreenFrame>
    ),
  },
  {
    id: "equipamentos",
    label: "Equipamentos",
    icon: ClipboardCheck,
    summary: "Ficha completa com calibrações, qualificações, anexos e pendências.",
    screen: (
      <ScreenFrame
        path="/equipamentos"
        title="Equipamentos"
        subtitle="Ficha do ativo com histórico e vigência."
      >
        <MiniPanel>
          <MiniRows
            rows={[
              { label: "Geladeira de vacinas 01", meta: "Calibração · vence em 18 dias", status: "A vencer", tone: "warn" },
              { label: "Autoclave Central 01", meta: "Qualificação · válida", status: "Em dia", tone: "ok" },
              { label: "Balança analítica L2", meta: "Calibração · válida", status: "Em dia", tone: "ok" },
            ]}
          />
        </MiniPanel>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {["Dados gerais", "Calibrações", "Qualificações", "Histórico"].map((tab, index) => (
            <span
              key={tab}
              className={cn(
                "truncate rounded-lg border px-2 py-1.5 text-[10px] font-semibold",
                index === 1
                  ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                  : "border-slate-200 bg-white text-slate-500",
              )}
            >
              {tab}
            </span>
          ))}
        </div>
      </ScreenFrame>
    ),
  },
  {
    id: "manutencoes",
    label: "Manutenções",
    icon: Wrench,
    summary: "Preventivas, corretivas e recorrentes conectadas aos equipamentos.",
    screen: (
      <ScreenFrame
        path="/manutencoes"
        title="Manutenções"
        subtitle="Natureza preventiva e corretiva com registro de tratativa."
      >
        <MiniPanel>
          <MiniRows
            rows={[
              { label: "Autoclave Central 01", meta: "Preventiva · agendada 24/08", status: "Planejado", tone: "info" },
              { label: "Compressor sala 3", meta: "Corretiva · parada de 4h", status: "Concluído", tone: "ok" },
              { label: "Chiller principal", meta: "Preventiva · atrasada", status: "Atenção", tone: "warn" },
            ]}
          />
        </MiniPanel>
      </ScreenFrame>
    ),
  },
  {
    id: "alertas",
    label: "Alertas",
    icon: BellRing,
    summary: "Prazos críticos acompanhados antes de virarem não conformidade.",
    screen: (
      <ScreenFrame
        path="/alertas"
        title="Alertas e vencimentos"
        subtitle="Prazos priorizados por criticidade."
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            { label: "Alvará sanitário", meta: "vencido há 3 dias", tone: "danger" as const, status: "Crítico" },
            { label: "Licença sanitária", meta: "vence em 12 dias", tone: "warn" as const, status: "Atenção" },
            { label: "Calibração geladeira 01", meta: "vence em 18 dias", tone: "warn" as const, status: "A vencer" },
            { label: "Treinamento NR-32", meta: "vence em 45 dias", tone: "info" as const, status: "Monitorado" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[11.5px] font-semibold text-slate-900">
                    {item.label}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">{item.meta}</div>
                </div>
                <StatusPill tone={item.tone}>{item.status}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </ScreenFrame>
    ),
  },
  {
    id: "auditoria",
    label: "Auditoria",
    icon: ShieldCheck,
    summary: "Rastreabilidade de ações, alterações, uploads e visualizações.",
    screen: (
      <ScreenFrame
        path="/auditoria"
        title="Auditoria"
        subtitle="Trilha de eventos por usuário, data e recurso."
      >
        <MiniPanel>
          <ul className="space-y-3">
            {[
              { icon: CheckCircle2, text: "Evidência anexada em AVCB", meta: "Coordenação · 09:41", color: "text-emerald-600" },
              { icon: Activity, text: "Documento atualizado para versão 4", meta: "Qualidade · 09:38", color: "text-cyan-600" },
              { icon: AlertTriangle, text: "Alerta gerado: alvará vencido", meta: "Sistema · 08:02", color: "text-rose-600" },
              { icon: History, text: "Visualização registrada", meta: "Auditor externo · ontem", color: "text-slate-500" },
            ].map((event) => (
              <li key={event.text} className="flex items-start gap-2.5">
                <event.icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", event.color)} aria-hidden />
                <div className="min-w-0">
                  <div className="truncate text-[11.5px] font-medium text-slate-800">
                    {event.text}
                  </div>
                  <div className="text-[10px] text-slate-500">{event.meta}</div>
                </div>
              </li>
            ))}
          </ul>
        </MiniPanel>
      </ScreenFrame>
    ),
  },
];

export function ModuleShowcase() {
  const [activeId, setActiveId] = useState(showcaseModules[0].id);
  const active = showcaseModules.find((item) => item.id === activeId) ?? showcaseModules[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10">
      <div
        role="tablist"
        aria-label="Módulos do Conform Flow"
        aria-orientation="vertical"
        className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
      >
        {showcaseModules.map((item) => {
          const isActive = item.id === active.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`cf-module-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`cf-module-panel-${item.id}`}
              onClick={() => setActiveId(item.id)}
              className={cn("cf-module-tab", isActive && "is-active")}
            >
              <span className="cf-module-tab-icon">
                <item.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-[13.5px] font-semibold tracking-[-0.01em]">
                  {item.label}
                </span>
                <span className="cf-module-tab-summary">{item.summary}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="cf-screen-stage">
        <div
          key={active.id}
          role="tabpanel"
          id={`cf-module-panel-${active.id}`}
          aria-labelledby={`cf-module-tab-${active.id}`}
          className="cf-screen-swap"
        >
          {active.screen}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 6. "Como funciona"
 * ------------------------------------------------------------------ */

const flowSteps = [
  ["01", "Centralize", "Documentos, equipamentos, anexos e responsáveis em um ambiente único."],
  ["02", "Acompanhe", "Prazos, pendências e prioridades visíveis para todo o time."],
  ["03", "Antecipe", "Alertas automáticos antes que o prazo se torne não conformidade."],
  ["04", "Comprove", "Evidências, versões e histórico prontos para a auditoria."],
];

export function HowItWorks() {
  const { reference, visible } = useInViewOnce<HTMLDivElement>(0.3);

  return (
    <section id="como-funciona" className="cf-band-white py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <SectionTitle
            align="center"
            eyebrow="Como funciona"
            title="Da pendência à conformidade."
            description="Quatro passos que transformam controles dispersos em uma rotina auditável."
          />
        </Reveal>
        <div
          ref={reference}
          className={cn("cf-flowline mt-14", visible && "is-visible")}
        >
          <span aria-hidden className="cf-flowline-rail" />
          <span aria-hidden className="cf-flowline-pulse" />
          <ol className="cf-flowline-steps">
            {flowSteps.map(([number, title, description]) => (
              <li key={number} className="cf-flowline-step">
                <span className="cf-flowline-marker" aria-hidden>
                  {number}
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-[-0.01em] text-slate-950">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-6 text-slate-600">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Hero animation pause when out of viewport
 * ------------------------------------------------------------------ */

export function useHeroVisibilityFlag<T extends Element>() {
  const reference = useRef<T>(null);

  useEffect(() => {
    const element = reference.current;
    if (!element || !("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    const observer = new IntersectionObserver(
      ([entry]) => {
        root.dataset["cfHero"] = entry.isIntersecting ? "active" : "idle";
      },
      { threshold: 0 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      delete root.dataset["cfHero"];
    };
  }, []);

  return reference;
}
