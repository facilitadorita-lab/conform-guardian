import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "cf-page-card overflow-hidden px-5 py-5 md:px-6",
        "bg-[radial-gradient(circle_at_top_right,oklch(0.58_0.18_258/0.12),transparent_32%),linear-gradient(180deg,white,oklch(0.99_0.004_248))]",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-[1.7rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function Surface({ className, children, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn("cf-page-card p-5", className)} {...props}>
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
