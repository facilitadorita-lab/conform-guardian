import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { edgeFunctionsService } from "@/services";

type Perfil = "administrador" | "responsavel_tecnico" | "colaborador" | "somente_leitura";

export function InviteUserDialog({
  empresaId,
  onClose,
}: {
  empresaId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("colaborador");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await edgeFunctionsService.inviteCompanyUser({
        empresaId,
        email,
        nome,
        perfil,
        setor: setor || undefined,
      });
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao enviar convite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">Convidar usuário</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {ok ? (
          <div className="p-6 space-y-4">
            <p className="text-sm">
              Convite enviado para <strong>{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            <Field label="Nome">
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="E-mail">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Setor (opcional)">
              <input
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Perfil">
              <select
                value={perfil}
                onChange={(e) => setPerfil(e.target.value as Perfil)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="administrador">Administrador</option>
                <option value="responsavel_tecnico">Responsável técnico</option>
                <option value="colaborador">Colaborador</option>
                <option value="somente_leitura">Somente leitura</option>
              </select>
            </Field>
            {erro && <p className="text-xs text-destructive">{erro}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar convite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
