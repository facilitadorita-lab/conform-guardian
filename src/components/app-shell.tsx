import { useEffect, useState, type ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { Bell, Building2, ChevronDown, LogOut, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { shouldUseMocks } from "@/lib/runtime-config";
import { useSession } from "@/hooks/use-session";
import { AccessBlocked } from "./access-blocked";

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
  const { user, loading, signOut, passwordRecovery } = useAuth();
  const navigate = useNavigate();
  const bypassAuth = shouldUseMocks();
  const {
    acessoLiberado,
    isMaster,
    empresaAtual,
    usuarioAtual,
    selectedCompany,
    selectedCompanyId,
    empresasDisponiveis,
    trocarEmpresa,
    setIsMaster,
    setEmpresaStatus,
  } = useSession();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isMasterRoute = pathname.startsWith("/master");
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    if (bypassAuth) return;
    if (!loading && !user) navigate({ to: "/login" });
    if (!loading && user && passwordRecovery) navigate({ to: "/definir-senha" });
  }, [bypassAuth, loading, user, passwordRecovery, navigate]);

  // Redireciona Admin Master sem empresa selecionada para a tela de escolha.
  useEffect(() => {
    if (loading && !bypassAuth) return;
    if (isMaster && !selectedCompanyId && !isMasterRoute && pathname !== "/login") {
      navigate({ to: "/master/empresas" });
    }
  }, [loading, bypassAuth, isMaster, selectedCompanyId, isMasterRoute, pathname, navigate]);

  if (!bypassAuth && (loading || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando sessão…
      </div>
    );
  }

  // Regra de acesso: se a empresa não estiver ativa e o usuário não for Admin Master,
  // nenhum dado operacional é exibido — apenas a tela de bloqueio.
  // Rotas /master são independentes desse gate.
  if (!acessoLiberado && !isMasterRoute) {
    return <AccessBlocked />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card px-6">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar documentos, equipamentos, pendências…"
              className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Seletor de empresa (topbar) */}
            {selectedCompany ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => isMaster && setSwitcherOpen((v) => !v)}
                  disabled={!isMaster}
                  className={`flex items-center gap-2 h-9 rounded-md border border-border px-3 text-xs ${
                    isMaster ? "hover:bg-muted cursor-pointer" : "cursor-default"
                  }`}
                  title={isMaster ? "Trocar empresa" : selectedCompany.razao_social}
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="max-w-[160px] truncate font-medium">
                    {selectedCompany.nome_fantasia}
                  </span>
                  {isMaster && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                {isMaster && switcherOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-md border border-border bg-card shadow-lg z-20 overflow-hidden">
                    <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                      Trocar empresa
                    </div>
                    <ul className="max-h-72 overflow-y-auto">
                      {empresasDisponiveis.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            onClick={() => {
                              trocarEmpresa(e.id);
                              setSwitcherOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted ${
                              e.id === selectedCompanyId ? "bg-muted/60" : ""
                            }`}
                          >
                            <div className="font-medium">{e.nome_fantasia}</div>
                            <div className="text-[11px] text-muted-foreground">{e.cnpj}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/master/empresas"
                      onClick={() => setSwitcherOpen(false)}
                      className="block border-t border-border px-3 py-2 text-xs font-medium text-accent hover:bg-muted"
                    >
                      Ver todas as empresas →
                    </Link>
                  </div>
                )}
              </div>
            ) : isMaster ? (
              <Link
                to="/master/empresas"
                className="flex items-center gap-2 h-9 rounded-md border border-border px-3 text-xs hover:bg-muted"
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Selecionar empresa
              </Link>
            ) : null}

            {/* Simulação (mock) — só aparece em modo mock para testar regras de acesso */}
            {bypassAuth && (
              <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground">
                <select
                  value={empresaAtual.status}
                  onChange={(e) => setEmpresaStatus(e.target.value as typeof empresaAtual.status)}
                  className="h-8 rounded-md border border-border bg-background px-2"
                  title="Simular status da empresa"
                >
                  <option value="ativa">Empresa: ativa</option>
                  <option value="inadimplente">Empresa: inadimplente</option>
                  <option value="suspensa">Empresa: suspensa</option>
                  <option value="bloqueada">Empresa: bloqueada</option>
                  <option value="cancelada">Empresa: cancelada</option>
                </select>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={isMaster}
                    onChange={(e) => setIsMaster(e.target.checked)}
                  />
                  Admin Master
                </label>
              </div>
            )}
            <button className="relative h-9 w-9 rounded-md border border-border hover:bg-muted flex items-center justify-center">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-danger text-[10px] font-semibold text-white flex items-center justify-center">7</span>
            </button>
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-xs font-medium">{user?.email ?? usuarioAtual.email}</span>
              <span className="text-[11px] text-muted-foreground">
                {isMaster ? "Admin Master" : bypassAuth ? "Modo mock" : "Sessão ativa"}
              </span>
            </div>
            {!bypassAuth && (
              <button
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/login" });
                }}
                title="Sair"
                className="h-9 w-9 rounded-md border border-border hover:bg-muted flex items-center justify-center"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "vencido" | "critico" | "atencao" | "ok" | "info";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    vencido: "bg-danger/10 text-danger border-danger/30",
    critico: "bg-danger/10 text-danger border-danger/30",
    atencao: "bg-warning/10 text-warning border-warning/40",
    ok: "bg-success/10 text-success border-success/40",
    info: "bg-accent/10 text-accent border-accent/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[tone]}`}
    >
      {children}
    </span>
  );
}