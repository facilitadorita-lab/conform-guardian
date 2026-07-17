import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/layouts/app-layout";
import { useAuthContext } from "@/hooks/use-conform-data";
import type { PlanoRecurso } from "@/types";
import { getPlanName, hasPlanFeature } from "@/utils/plan-features";

type PlanFeatureGateProps = {
  recurso: PlanoRecurso;
  nomeRecurso: string;
  children: ReactNode;
};

export function PlanFeatureGate({ recurso, nomeRecurso, children }: PlanFeatureGateProps) {
  const { data: authContext } = useAuthContext();
  const permitido = hasPlanFeature(authContext, recurso);

  if (permitido) return <>{children}</>;

  return (
    <AppShell
      title="Recurso indisponível no plano"
      description="O acesso a módulos e gravações é validado no backend para proteger a configuração comercial de cada empresa."
    >
      <section className="mx-auto flex max-w-3xl flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">{nomeRecurso} não está liberado</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Esta empresa está no plano{" "}
          <span className="font-medium text-foreground">{getPlanName(authContext)}</span>. Para usar
          este recurso, altere o plano no Admin Master ou libere o recurso no cadastro do plano.
        </p>
        <div className="mt-6 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-left text-sm text-success">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Mesmo que alguém tente acessar pela URL ou pelo navegador, o Supabase também bloqueia
              as operações fora do plano.
            </span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
