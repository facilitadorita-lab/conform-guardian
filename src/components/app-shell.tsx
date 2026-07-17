import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  LockKeyhole,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useAppSession } from "@/hooks/use-app-session";
import { useAuthContext } from "@/hooks/use-conform-data";
import { runtimeConfig } from "@/lib/runtime-config";
import type { StatusConformidade } from "@/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/conform/surface";
import { AppSidebar } from "./app-sidebar";
import { CompanySwitcher } from "./company-switcher";
import { FloatingAssistant } from "./floating-assistant";
import { hasPlanFeature } from "@/utils/plan-features";

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
  const { selectCompany, selectedCompanyId } = useAppSession();
  const { data: authContext } = useAuthContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const empresaAtual =
    authContext?.empresasPermitidas.find((company) => company.id === selectedCompanyId) ??
    authContext?.empresaAtual;
  const activeAuthContext =
    authContext && empresaAtual ? { ...authContext, empresaAtual } : authContext;
  const podeTrocarEmpresa = Boolean(authContext && authContext.empresasPermitidas.length > 1);
  const acessoBloqueado = Boolean(
    authContext && !authContext.usuario.isMaster && empresaAtual?.status !== "ativa",
  );
  const exibirAssistente = hasPlanFeature(activeAuthContext, "assistente_ia");
  const breadcrumbs = buildBreadcrumbs(pathname, title);
  useEffect(() => {
    if (runtimeConfig.useMocks || loading || user) return;
    navigate({ to: "/login", search: { msg: undefined } });
  }, [loading, navigate, user]);

  if (!runtimeConfig.useMocks && (loading || !user)) {
    return <AccessValidationScreen />;
  }

  if (!authContext || !empresaAtual) {
    return <AccessValidationScreen />;
  }

  if (acessoBloqueado) {
    return (
      <BlockedAccessScreen
        empresaNome={empresaAtual.nome}
        empresaCnpj={empresaAtual.cnpj}
        status={empresaAtual.status}
      />
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-card/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-4 md:px-6">
            <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
              <Breadcrumbs items={breadcrumbs} />
            </div>

            <div className="relative w-full max-w-xl flex-1 lg:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar documentos, equipamentos, pendências..."
                className="h-10 w-full rounded-xl border border-input bg-background/80 pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground cf-transition focus:border-accent focus:bg-card focus:ring-4 focus:ring-accent/10"
                aria-label="Busca global"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              {exibirAssistente ? (
                <div className="hidden items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-2 text-xs font-medium text-accent xl:flex">
                  <Sparkles className="h-3.5 w-3.5" />
                  FlowIA disponível
                </div>
              ) : null}

              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                  7
                </span>
              </div>

              {podeTrocarEmpresa ? (
                <div className="hidden items-center gap-2 md:flex">
                  <CompanySwitcher
                    empresas={authContext.empresasPermitidas}
                    empresaAtual={empresaAtual}
                    onSelectEmpresa={async (empresaId) => {
                      await selectCompany(empresaId);
                      await queryClient.invalidateQueries();
                      await router.invalidate();
                      await router.navigate({ to: "/dashboard" });
                    }}
                  />
                  {authContext.usuario.isMaster ? (
                    <Link
                      to="/master/empresas"
                      className="hidden rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-sm cf-transition hover:border-accent/40 hover:bg-muted xl:inline-flex"
                    >
                      Ver empresas
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="hidden items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm md:flex">
                  <Building2 className="h-4 w-4 text-accent" />
                  <div className="min-w-0 leading-tight">
                    <span className="block max-w-[180px] truncate text-xs font-semibold">
                      {empresaAtual.nome}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      CNPJ {empresaAtual.cnpj}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={async () => {
                  try {
                    await signOut();
                  } finally {
                    queryClient.clear();
                    await navigate({ to: "/login", search: { msg: undefined } });
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm cf-transition hover:border-danger/30 hover:bg-danger/5 hover:text-danger"
                aria-label="Sair da plataforma"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <PageHeader
              eyebrow={authContext.usuario.isMaster ? "Admin Master" : "Ambiente do cliente"}
              title={title}
              description={description}
              actions={actions}
            />
            {children}
          </div>
        </main>
      </div>
      {exibirAssistente ? <FloatingAssistant /> : null}
    </div>
  );
}

function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <nav
      className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
      aria-label="Breadcrumb"
    >
      <span className="font-medium text-foreground">Conform Flow</span>
      {items.map((item) => (
        <span key={item} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{item}</span>
        </span>
      ))}
    </nav>
  );
}

function buildBreadcrumbs(pathname: string, title: string) {
  if (pathname === "/dashboard") return [title];
  const parts = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => humanizePath(part));
  const last = parts.at(-1);
  if (last?.toLowerCase() === title.toLowerCase()) return parts;
  return [...parts.slice(0, -1), title];
}

function humanizePath(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function AccessValidationScreen() {
  return (
    <main className="cf-subtle-grid flex min-h-screen items-center justify-center bg-background p-6">
      <section className="cf-page-card flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <img
          src="/conform-flow-logo-transparent.png"
          alt="Conform Flow"
          className="h-16 w-16 object-contain"
        />
        <div>
          <h1 className="text-base font-semibold">Validando acesso</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
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
  tone: StatusConformidade | "info" | "neutral";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    vencido: "bg-danger/10 text-danger border-danger/30",
    critico: "bg-danger/10 text-danger border-danger/30",
    atencao: "bg-warning/10 text-warning border-warning/40",
    ok: "bg-success/10 text-success border-success/40",
    info: "bg-accent/10 text-accent border-accent/30",
    neutral: "border-border bg-muted text-muted-foreground",
    sem_validade: "border-border bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        "leading-none tracking-[-0.01em]",
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}
