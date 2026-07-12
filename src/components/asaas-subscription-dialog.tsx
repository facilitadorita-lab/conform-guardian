import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { edgeFunctionsService } from "@/services";

export function AsaasSubscriptionDialog({ onClose }: { onClose: () => void }) {
  const [empresaId, setEmpresaId] = useState("");
  const [planoId, setPlanoId] = useState("");
  const [ciclo, setCiclo] = useState<"mensal" | "trimestral" | "semestral" | "anual">("mensal");
  const [formaPagamento, setFormaPagamento] = useState<"boleto" | "cartao" | "pix">("boleto");
  const [valor, setValor] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ subscriptionId?: string; invoiceUrl?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const res = await edgeFunctionsService.createAsaasSubscription({
        empresaId,
        planoId,
        ciclo,
        formaPagamento,
        valor: valor ? Number(valor) : undefined,
      });
      setResultado({ subscriptionId: res.subscriptionId, invoiceUrl: res.invoiceUrl });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao criar assinatura.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">Nova assinatura Asaas</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {resultado ? (
          <div className="p-6 space-y-3 text-sm">
            <p>Assinatura criada com sucesso.</p>
            {resultado.subscriptionId && (
              <p className="text-xs text-muted-foreground">ID: <span className="font-mono">{resultado.subscriptionId}</span></p>
            )}
            {resultado.invoiceUrl && (
              <a href={resultado.invoiceUrl} target="_blank" rel="noreferrer"
                className="inline-flex text-accent hover:underline text-xs">
                Abrir fatura
              </a>
            )}
            <button onClick={onClose} className="mt-2 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            <Field label="Empresa (ID)">
              <input required value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </Field>
            <Field label="Plano (ID)">
              <input required value={planoId} onChange={(e) => setPlanoId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciclo">
                <select value={ciclo} onChange={(e) => setCiclo(e.target.value as typeof ciclo)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </Field>
              <Field label="Forma">
                <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as typeof formaPagamento)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="boleto">Boleto</option>
                  <option value="cartao">Cartão</option>
                  <option value="pix">Pix</option>
                </select>
              </Field>
            </div>
            <Field label="Valor (opcional)">
              <input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </Field>
            {erro && <p className="text-xs text-destructive">{erro}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar assinatura
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