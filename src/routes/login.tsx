import { createFileRoute, useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Conform Flow" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    msg: typeof s.msg === "string" ? s.msg : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading, passwordRecovery } = useAuth();
  const navigate = useNavigate();
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });
  const search = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (passwordRecovery) {
      navigate({ to: "/definir-senha" });
      return;
    }
    if (user) navigate({ to: "/" });
  }, [loading, user, passwordRecovery, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr(null);
    setForgotMsg(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setForgotErr("Supabase não configurado.");
      return;
    }
    setForgotLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: "https://conform-guardian.lovable.app/definir-senha",
      });
      if (resetError) throw resetError;
      setForgotMsg("Enviamos um link para o e-mail informado. Verifique sua caixa de entrada.");
    } catch (err) {
      setForgotErr(err instanceof Error ? err.message : "Não foi possível enviar o e-mail.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold">Conform Flow</p>
            <p className="text-xs text-muted-foreground">Gestão de Conformidade</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Entrar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesse com seu e-mail corporativo.
          </p>
          {search.msg && (
            <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 text-warning text-xs px-3 py-2">
              {search.msg}
            </div>
          )}
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Senha</label>
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="text-[11px] font-medium text-accent hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            {error && (
              <div className="rounded-md border border-danger/30 bg-danger/10 text-danger text-xs px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Entrando…" : "Entrar"}
            </button>
          </form>
          {showForgot && (
            <div className="mt-5 border-t border-border pt-5">
              <h2 className="text-sm font-semibold">Recuperar acesso</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Informe seu e-mail para receber um link de definição de senha.
              </p>
              <form onSubmit={onForgot} className="mt-3 space-y-3">
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                {forgotErr && (
                  <div className="rounded-md border border-danger/30 bg-danger/10 text-danger text-xs px-3 py-2">
                    {forgotErr}
                  </div>
                )}
                {forgotMsg && (
                  <div className="rounded-md border border-success/40 bg-success/10 text-success text-xs px-3 py-2">
                    {forgotMsg}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-10 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted disabled:opacity-60"
                >
                  {forgotLoading ? "Enviando…" : "Enviar link de recuperação"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}