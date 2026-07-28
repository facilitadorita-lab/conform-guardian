import { useState } from "react";
import { CheckCircle2, Loader2, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useAppSession } from "@/hooks/use-app-session";

/**
 * O Supabase não expõe a lista de dispositivos ao client por segurança, mas
 * permite revogar todas as outras sessões. Esta ação cobre o caso operacional
 * mais importante sem manter tokens ou sessões no banco da aplicação.
 */
export function SessionSecurityCard() {
  const { user } = useAppSession();
  const queryClient = useQueryClient();
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revokeOtherSessions() {
    setWorking(true);
    setDone(false);
    setError(null);
    try {
      const { error: signOutError } = await getSupabaseClient().auth.signOut({ scope: "others" });
      if (signOutError) throw signOutError;
      setDone(true);
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível encerrar as outras sessões.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (!user) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <MonitorSmartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Sessões e dispositivos</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Encerre acessos antigos caso você tenha usado a conta em outro computador ou suspeite de
            um acesso não reconhecido.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" />
          Sessão atual protegida pelo Supabase Auth
        </div>
        <Button type="button" variant="outline" onClick={revokeOtherSessions} disabled={working}>
          {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Encerrar outras sessões
        </Button>
      </div>
      {done ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="h-4 w-4" /> Os outros acessos foram encerrados.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
    </section>
  );
}
