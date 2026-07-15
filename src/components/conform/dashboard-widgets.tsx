import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExecutiveTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneStyles: Record<
  ExecutiveTone,
  {
    icon: string;
    value: string;
    bg: string;
    border: string;
    progress: string;
  }
> = {
  success: {
    icon: "bg-success/10 text-success",
    value: "text-success",
    bg: "bg-success/5",
    border: "border-success/20",
    progress: "bg-success",
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    value: "text-warning",
    bg: "bg-warning/5",
    border: "border-warning/25",
    progress: "bg-warning",
  },
  danger: {
    icon: "bg-danger/10 text-danger",
    value: "text-danger",
    bg: "bg-danger/5",
    border: "border-danger/25",
    progress: "bg-danger",
  },
  info: {
    icon: "bg-accent/10 text-accent",
    value: "text-accent",
    bg: "bg-accent/5",
    border: "border-accent/20",
    progress: "bg-accent",
  },
  neutral: {
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground",
    bg: "bg-muted/40",
    border: "border-border",
    progress: "bg-primary",
  },
};

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function ExecutiveMetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone?: ExecutiveTone;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "group flex h-full flex-col justify-between rounded-2xl border bg-card p-4 shadow-sm cf-transition",
        "hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[var(--cf-shadow-soft)]",
        toneStyles[tone].border,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </div>
          <div className={cn("mt-2 text-3xl font-semibold tabular-nums", toneStyles[tone].value)}>
            {value}
          </div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl",
            toneStyles[tone].icon,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="leading-5">{description}</span>
        {href ? (
          <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 cf-transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        ) : null}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={href as any}
      className="block h-full"
    >
      {content}
    </Link>
  );
}

export function ComplianceScore({
  value,
  classification,
  description,
}: {
  value: number;
  classification: string;
  description: string;
}) {
  const tone = value >= 95 ? "success" : value >= 85 ? "warning" : "danger";

  return (
    <section className="cf-page-card relative overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-success via-warning to-danger" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Índice geral de conformidade
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-6xl font-semibold tracking-[-0.06em] text-primary">{value}%</span>
            <span
              className={cn(
                "mb-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                toneStyles[tone].bg,
                toneStyles[tone].border,
                toneStyles[tone].value,
              )}
            >
              {classification}
            </span>
          </div>
        </div>
        <div className="max-w-sm rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
          {description}
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full cf-transition", toneStyles[tone].progress)}
          style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>Calculado no backend com dados operacionais da empresa.</span>
        <span>Histórico comparativo ainda não disponível.</span>
      </div>
    </section>
  );
}

export function RiskBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: ExecutiveTone;
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("text-xs font-semibold tabular-nums", toneStyles[tone].value)}>
          {value} item{value === 1 ? "" : "s"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", value > 0 ? toneStyles[tone].progress : "bg-muted")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function ActionItem({
  title,
  description,
  tone,
  href,
}: {
  title: string;
  description: string;
  tone: ExecutiveTone;
  href: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : CircleAlert;

  return (
    <Link // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={href as any}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 cf-transition hover:border-accent/35 hover:bg-muted/30"
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
          toneStyles[tone].icon,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground opacity-0 cf-transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}
