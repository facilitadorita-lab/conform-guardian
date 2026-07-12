import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseClient } from "@/lib/supabaseClient";

export const Route = createFileRoute("/definir-senha")({
  head: () => ({ meta: [{ title: "Definir senha — Conform Flow" }] }),
  component: DefinirSenhaPage,
});

function DefinirSenhaPage() {
  const { user, session, loading, clearPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const supabase = getSupabaseClient();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session || !user) {
      navigate({
        to: "/login",
        search: { msg: "Link expirado ou inválido. Solicite um novo acesso." } as never,
      });
    }
  }, [loading, session, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!senha || senha.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!supabase) {
      setError("Supabase não configurado.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: senha });
      if (updateError) throw updateError;
      setSuccess("Senha criada com sucesso.");
      clearPasswordRecovery();
      setTimeout(() => navigate({ to: "/" }), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a senha.");
    } finally {
      setSubmitting(false);
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
          <h1 className="text-lg font-semibold">Definir senha de acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie sua senha para acessar a plataforma.
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nova senha</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <p className="text-[11px] text-muted-foreground">Mínimo de 8 caracteres.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Confirmar senha</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            {error && (
              <div className="rounded-md border border-danger/30 bg-danger/10 text-danger text-xs px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md border border-success/40 bg-success/10 text-success text-xs px-3 py-2">
                {success}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Salvando…" : "Salvar senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}