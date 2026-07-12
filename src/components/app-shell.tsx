import { useEffect, type ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { Bell, LogOut, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { shouldUseMocks } from "@/lib/runtime-config";

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
  const navigate = useNavigate();
  const bypassAuth = shouldUseMocks();

  useEffect(() => {
    if (bypassAuth) return;
    if (!loading && !user) navigate({ to: "/login" });
  }, [bypassAuth, loading, user, navigate]);

  if (!bypassAuth && (loading || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando sessão…
      </div>
    );
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
            <button className="relative h-9 w-9 rounded-md border border-border hover:bg-muted flex items-center justify-center">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-danger text-[10px] font-semibold text-white flex items-center justify-center">7</span>
            </button>
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-xs font-medium">{user?.email ?? "Clínica Vitalis Ltda."}</span>
              <span className="text-[11px] text-muted-foreground">
                {bypassAuth ? "Modo mock" : "Sessão ativa"}
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