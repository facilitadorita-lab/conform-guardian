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
        "relative overflow-hidden",
        className,
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="mt-1.5 h-8 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#2563EB] to-[#0B2340]"
          />
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent/80">
                {eyebrow}
              </div>
            ) : null}
            <h1 className="truncate text-[1.55rem] font-[650] leading-[1.2] tracking-[-0.02em] text-[#0B2340] md:text-[1.85rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-[42rem] text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function Surface({ className, children, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn("cf-page-card p-5 md:p-6", className)} {...props}>
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
    <div className="relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-[var(--cf-radius-card)] border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/15 bg-accent/8 text-accent shadow-sm">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
