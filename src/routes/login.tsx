import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoSignature } from "@/components/public/marketing";
import { useAuth } from "@/hooks/use-auth";
import { useAppSession } from "@/hooks/use-app-session";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Conform Flow" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    msg: typeof s.msg === "string" ? s.msg : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading, passwordRecovery } = useAuth();
  const { authContext, contextLoading } = useAppSession();
  const { isMaster, selectedCompanyId, empresasDisponiveis } = useSession();
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (loading || contextLoading) return;
    if (passwordRecovery) {
      navigate({ to: "/definir-senha" });
      return;
    }
    if (!user) return;
    if (!authContext || authContext.usuario.id !== user.id) return;
    if (isMaster && !selectedCompanyId) {
      navigate({ to: "/master/empresas" });
      return;
    }
    if (!isMaster && empresasDisponiveis.length === 0) {
      return;
    }
    navigate({ to: "/dashboard" });
  }, [
    loading,
    contextLoading,
    user,
    authContext,
    passwordRecovery,
    isMaster,
    selectedCompanyId,
    empresasDisponiveis,
    navigate,
  ]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.16),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#eef6fb_100%)] px-5 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-55px_rgba(15,23,42,0.7)] lg:grid-cols-[1.05fr_0.95fr]">
          <BrandPanel />

          <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
            <div className="w-full max-w-md">
              <div className="mb-8 flex items-center justify-between gap-4">
                <LogoSignature className="lg:hidden" />
                <Link
                  to="/"
                  className="ml-auto text-sm font-medium text-slate-500 hover:text-slate-950"
                >
                  Voltar ao site
                </Link>
              </div>

              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Acesso seguro
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Acessar plataforma
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Entre com seu e-mail corporativo para acessar o ambiente da sua empresa.
                </p>
              </div>

              {search.msg ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {search.msg}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="mt-7 space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">E-mail</span>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">Senha</span>
                    <button
                      type="button"
                      onClick={() => setShowForgot((value) => !value)}
                      className="text-xs font-semibold text-cyan-700 hover:text-cyan-900"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative mt-2">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-12 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  {submitting ? "Entrando..." : "Entrar na plataforma"}
                  {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
                </Button>
              </form>

              {showForgot ? (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-sm font-semibold text-slate-950">Recuperar acesso</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Informe seu e-mail para receber um link seguro de definição de senha.
                  </p>
                  <form onSubmit={onForgot} className="mt-4 space-y-3">
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                    {forgotErr ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {forgotErr}
                      </div>
                    ) : null}
                    {forgotMsg ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        {forgotMsg}
                      </div>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      variant="outline"
                      className="h-11 w-full rounded-xl bg-white"
                    >
                      {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
                    </Button>
                  </form>
                </div>
              ) : null}

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Ainda não conhece o Conform Flow?{" "}
                <Link to="/planos" className="font-semibold text-cyan-700 hover:text-cyan-900">
                  Veja os planos
                </Link>{" "}
                ou{" "}
                <a
                  href="mailto:comercial@conformflow.com.br?subject=Solicitar demonstração Conform Flow"
                  className="font-semibold text-cyan-700 hover:text-cyan-900"
                >
                  solicite uma demonstração
                </a>
                .
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandPanel() {
  const benefits = [
    "Centralize documentos e evidências",
    "Acompanhe vencimentos com clareza",
    "Gerencie equipamentos e manutenções",
    "Fortaleça a conformidade da operação",
  ];

  return (
    <aside className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:block">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -bottom-28 left-10 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex min-h-[720px] flex-col justify-between">
        <div>
          <LogoSignature tone="light" />
          <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            SaaS B2B premium
          </div>
          <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight">
            Controle conformidade, prazos e evidências com segurança.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">
            Um ambiente profissional para empresas que precisam reduzir risco operacional, organizar
            documentos e chegar mais preparadas em auditorias.
          </p>

          <div className="mt-10 grid gap-3">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <span className="text-sm font-medium text-slate-100">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Ambientes separados por empresa</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Acesso, permissões e dados operacionais respeitam o ambiente de cada cliente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
