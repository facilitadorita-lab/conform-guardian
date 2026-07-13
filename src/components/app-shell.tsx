import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CreditCard, LockKeyhole, LogOut, Search, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useAuthContext } from "@/hooks/use-conform-data";
import { runtimeConfig } from "@/lib/runtime-config";
import { setSelectedCompanyId } from "@/services/authService";
import type { StatusConformidade } from "@/types";
import { AppSidebar } from "./app-sidebar";
import { CompanySwitcher } from "./company-switcher";
import { FloatingAssistant } from "./floating-assistant";

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const { data: authContext } = useAuthContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const empresaNome = authContext?.empresaAtual.nome;
  const empresaCnpj = authContext?.empresaAtual.cnpj;
  const podeTrocarEmpresa = Boolean(authContext && authContext.empresasPermitidas.length > 1);
  const acessoBloqueado = Boolean(
    authContext && !authContext.usuario.isMaster && authContext.empresaAtual.status !== "ativa",
  );

  useEffect(() => {
    if (runtimeConfig.useMocks || loading || user) return;
    navigate({ to: "/login" });
  }, [loading, navigate, user]);

  if (!runtimeConfig.useMocks && (loading || !user)) {
    return <AccessValidationScreen />;
  }

  if (!authContext) {
    return <AccessValidationScreen />;
  }

  if (acessoBloqueado) {
    return (
      <BlockedAccessScreen
        empresaNome={authContext.empresaAtual.nome}
        empresaCnpj={authContext.empresaAtual.cnpj}
        status={authContext.empresaAtual.status}
      />
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card px-6">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar documentos, equipamentos, pendências..."
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                7
              </span>
            </button>
            {podeTrocarEmpresa ? (
              <div className="hidden items-center gap-2 sm:flex">
                <CompanySwitcher
                  empresas={authContext.empresasPermitidas}
                  empresaAtual={authContext.empresaAtual}
                  onSelectEmpresa={async (empresaId) => {
                    setSelectedCompanyId(empresaId);
                    await queryClient.invalidateQueries();
                    await queryClient.refetchQueries({
                      queryKey: ["auth", "contexto"],
                      type: "active",
                    });
                    await router.invalidate();
                    await router.navigate({ to: "/" });
                  }}
                />
                {authContext?.usuario.isMaster ? (
                  <Link
                    to="/master/empresas"
                    className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    Ver empresas
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-xs font-medium">{empresaNome}</span>
                <span className="text-[11px] text-muted-foreground">CNPJ {empresaCnpj}</span>
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                await navigate({ to: "/login" });
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
          {children}
        </main>
      </div>
      <FloatingAssistant />
    </div>
  );
}

function AccessValidationScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <img
          src="/conform-flow-logo-transparent.png"
          alt="Conform Flow"
          className="h-14 w-14 object-contain"
        />
        <div>
          <h1 className="text-base font-semibold">Validando acesso</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conferindo empresa, plano e permissões antes de carregar a plataforma.
          </p>
        </div>
      </section>
    </main>
  );
}

function BlockedAccessScreen({
  empresaNome,
  empresaCnpj,
  status,
}: {
  empresaNome: string;
  empresaCnpj: string;
  status: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white">
            <img
              src="/conform-flow-logo-transparent.png"
              alt="Conform Flow"
              className="h-12 w-12 object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-danger/40 bg-danger/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-100">
              <LockKeyhole className="h-3.5 w-3.5" />
              Plataforma bloqueada
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Regularize a assinatura para continuar
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Por segurança, enquanto a empresa estiver com status{" "}
              <span className="font-semibold text-white">{status}</span>, nenhum dado operacional,
              documento, equipamento, manutenção, pendência ou relatório será exibido.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
              <p className="font-medium text-white">{empresaNome}</p>
              <p className="mt-1 text-slate-300">CNPJ {empresaCnpj}</p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <CreditCard className="mb-3 h-5 w-5 text-cyan-300" />
                <p className="text-sm font-medium">Pagamento recorrente</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  A liberação acontece automaticamente após confirmação do gateway.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
                <p className="text-sm font-medium">Dados protegidos</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  O isolamento por empresa continua ativo mesmo durante o bloqueio.
                </p>
              </div>
            </div>

            <p className="mt-6 text-xs text-slate-400">
              Caso o pagamento já tenha sido realizado, aguarde a confirmação automática ou fale com
              o suporte da Conform Flow.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: StatusConformidade | "info";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    vencido: "bg-danger/10 text-danger border-danger/30",
    critico: "bg-danger/10 text-danger border-danger/30",
    atencao: "bg-warning/10 text-warning border-warning/40",
    ok: "bg-success/10 text-success border-success/40",
    info: "bg-accent/10 text-accent border-accent/30",
    sem_validade: "border-border bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
