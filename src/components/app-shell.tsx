import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CreditCard,
  LockKeyhole,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useAppSession } from "@/hooks/use-app-session";
import { useAlertas, useAuthContext } from "@/hooks/use-conform-data";
import { runtimeConfig } from "@/lib/runtime-config";
import type { AuthContexto, PlanoRecurso, StatusConformidade } from "@/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/conform/surface";
import { AppSidebar } from "./app-sidebar";
import { CompanySwitcher } from "./company-switcher";
import { FloatingAssistant } from "./floating-assistant";
import { hasPlanFeature } from "@/utils/plan-features";

const mobileNavigationItems: Array<{
  label: string;
  to: string;
  recurso?: PlanoRecurso;
  adminOnly?: boolean;
  masterOnly?: boolean;
}> = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Documentos", to: "/documentos", recurso: "documentos" },
  { label: "Equipamentos", to: "/equipamentos", recurso: "equipamentos" },
  { label: "Manutenções", to: "/manutencoes", recurso: "manutencoes" },
  { label: "Pendências", to: "/pendencias", recurso: "pendencias" },
  { label: "Alertas", to: "/alertas", recurso: "alertas" },
  { label: "Vencimentos", to: "/vencimentos", recurso: "vencimentos" },
  { label: "Relatórios", to: "/relatorios", recurso: "relatorios" },
  { label: "Auditoria", to: "/auditoria", recurso: "auditoria" },
  { label: "Usuários", to: "/usuarios", recurso: "usuarios", adminOnly: true },
  { label: "Configurações", to: "/configuracoes" },
  { label: "Empresas", to: "/master/empresas", masterOnly: true },
  { label: "Financeiro", to: "/master/financeiro", masterOnly: true },
  { label: "Planos", to: "/master/planos", masterOnly: true },
  { label: "Saúde do sistema", to: "/master/saude", masterOnly: true },
  { label: "Histórico comercial", to: "/master/historico-comercial", masterOnly: true },
];

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
  const { selectCompany, selectedCompanyId, permissions } = useAppSession();
  const { data: authContext, error: contextError } = useAuthContext();
  const { data: alertas } = useAlertas();
  const [mobileOpen, setMobileOpen] = useState(false);
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
    authContext &&
    !authContext.usuario.isMaster &&
    (empresaAtual?.status !== "ativa" || permissions?.can_open_operational_modules !== true),
  );
  const exibirAssistente = hasPlanFeature(activeAuthContext, "assistente_ia");
  const alertasCount = alertas?.length ?? 0;
  useEffect(() => {
    if (runtimeConfig.useMocks || loading || user) return;
    navigate({ to: "/login", search: { msg: undefined } });
  }, [loading, navigate, user]);

  if (!runtimeConfig.useMocks && (loading || !user)) {
    return <AccessValidationScreen error={contextError} />;
  }

  if (!authContext || !empresaAtual) {
    return <AccessValidationScreen error={contextError} />;
  }

  if (acessoBloqueado) {
    return (
      <BlockedAccessScreen
        empresaNome={empresaAtual.nome}
        empresaCnpj={empresaAtual.cnpj}
        status={empresaAtual.status}
        reason={permissions?.reason_code}
      />
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/78 backdrop-blur-2xl">
          <div className="flex min-h-[3.75rem] items-center gap-3 px-4 md:gap-4 md:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground cf-transition hover:border-accent/30 hover:text-accent md:hidden"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="relative hidden min-w-0 flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar documentos, equipamentos, pendências..."
                className="cf-focus-ring h-10 w-full max-w-[560px] rounded-xl border border-input bg-card/75 pl-10 pr-3 text-sm placeholder:text-muted-foreground outline-none cf-transition focus:bg-card"
                aria-label="Busca global"
              />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {exibirAssistente ? (
                <button
                  type="button"
                  title="Assistente FlowIA disponível"
                  className="hidden h-10 items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 text-xs font-semibold text-accent cf-transition hover:bg-accent/10 xl:inline-flex"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  FlowIA
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                </button>
              ) : null}

              <div
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground cf-transition hover:border-accent/30 hover:text-accent"
                title={alertasCount > 0 ? `${alertasCount} alertas ativos` : "Sem alertas"}
              >
                <Bell className="h-4 w-4" />
                {alertasCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                    {alertasCount > 99 ? "99+" : alertasCount}
                  </span>
                ) : null}
              </div>

              {podeTrocarEmpresa ? (
                <div className="hidden max-w-[280px] items-center gap-2 md:flex">
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
                </div>
              ) : (
                <div
                  className="hidden h-10 items-center gap-2.5 rounded-xl border border-border bg-card px-3 md:flex"
                  title={`${empresaAtual.nome} — CNPJ ${empresaAtual.cnpj}`}
                >
                  <Building2 className="h-4 w-4 text-accent" />
                  <div className="min-w-0 leading-tight">
                    <span className="block max-w-[200px] truncate text-xs font-semibold">
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
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground cf-transition hover:border-danger/30 hover:bg-danger/5 hover:text-danger"
                aria-label="Sair da plataforma"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          {mobileOpen ? (
            <MobileNavigation
              authContext={authContext}
              pathname={pathname}
              canAdminister={
                authContext.usuario.isMaster || permissions?.can_admin_company === true
              }
              onNavigate={() => setMobileOpen(false)}
            />
          ) : null}
        </header>

        <main className="relative flex-1">
          <div className="cf-watermark cf-watermark-dark" aria-hidden />
          <div className="relative mx-auto flex w-full min-w-0 max-w-[1480px] flex-col gap-5 px-4 py-5 md:gap-6 md:px-8 md:py-7">
            <PageHeader
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

function MobileNavigation({
  authContext,
  pathname,
  canAdminister,
  onNavigate,
}: {
  authContext: AuthContexto;
  pathname: string;
  canAdminister: boolean;
  onNavigate: () => void;
}) {
  const items = mobileNavigationItems.filter(
    (item) =>
      (!item.recurso || hasPlanFeature(authContext, item.recurso)) &&
      (!item.adminOnly || canAdminister) &&
      (!item.masterOnly || authContext.usuario.isMaster),
  );

  return (
    <nav
      className="border-t border-border/70 bg-card/95 px-4 py-3 shadow-[0_18px_30px_-28px_rgba(15,41,71,0.4)] md:hidden"
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to as never}
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm font-semibold cf-transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
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

function AccessValidationScreen({ error }: { error?: Error | null }) {
  const hasConfigurationError = Boolean(error?.message.toLowerCase().includes("supabase"));
  return (
    <main className="cf-subtle-grid flex min-h-screen items-center justify-center bg-background p-6">
      <section className="cf-page-card flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <img
          src="/conform-flow-logo-transparent.png"
          alt="Conform Flow"
          className="h-16 w-16 object-contain"
        />
        <div>
          <h1 className="text-base font-semibold">
            {hasConfigurationError ? "Configuração necessária" : "Validando acesso"}
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {hasConfigurationError
              ? "O ambiente ainda não está conectado ao Supabase. Configure as variáveis do ambiente e publique novamente."
              : "Conferindo empresa, plano e permissões antes de carregar a plataforma."}
          </p>
          {error && !hasConfigurationError ? (
            <p className="mt-2 text-xs text-danger">{error.message}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function BlockedAccessScreen({
  empresaNome,
  empresaCnpj,
  status,
  reason,
}: {
  empresaNome: string;
  empresaCnpj: string;
  status: string;
  reason?: string | null;
}) {
  const paymentIssue = reason === "SUBSCRIPTION_PAST_DUE" || reason === "SUBSCRIPTION_REQUIRED";
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
              {paymentIssue
                ? "Regularize a assinatura para continuar"
                : "Acesso operacional restrito"}
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
