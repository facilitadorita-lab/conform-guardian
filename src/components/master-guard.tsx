import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useMfaAssurance } from "@/hooks/use-mfa-assurance";
import { AppShell } from "./app-shell";
import { runtimeConfig } from "@/lib/runtime-config";

export function MasterOnly({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { isMaster, contextoCarregando } = useSession();
  const mfa = useMfaAssurance();

  if (contextoCarregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando contexto…
      </div>
    );
  }

  if (!isMaster) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 text-danger">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Esta área é exclusiva para Admin Master. Se você acredita que deveria ter acesso, entre
            em contato com o administrador da plataforma.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  if (mfa.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Validando autenticação em duas etapas...
      </div>
    );
  }

  if (!runtimeConfig.useMocks && mfa.data?.currentLevel !== "aal2") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
          <h1 className="mt-4 text-lg font-semibold">Confirme sua autenticação em duas etapas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O Admin Master exige MFA antes de abrir dados financeiros ou executar ações
            administrativas.
          </p>
          <Link
            to="/seguranca/mfa"
            className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Ativar ou confirmar MFA
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppShell title={title} description={description}>
      {children}
    </AppShell>
  );
}
