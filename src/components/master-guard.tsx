import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { AppShell } from "./app-shell";

export function MasterOnly({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { isMaster } = useSession();

  if (!isMaster) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 text-danger">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Esta área é exclusiva para Admin Master. Se você acredita que deveria ter
            acesso, entre em contato com o administrador da plataforma.
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

  return (
    <AppShell title={title} description={description}>
      {children}
    </AppShell>
  );
}