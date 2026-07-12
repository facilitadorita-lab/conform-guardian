import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MasterOnly } from "@/components/master-guard";
import { masterPlanos } from "@/mocks/conformflow-mocks";
import { Save } from "lucide-react";

export const Route = createFileRoute("/master/valores-planos")({
  component: MasterValoresPlanos,
});

function MasterValoresPlanos() {
  const [valores, setValores] = useState<Record<string, number>>(
    Object.fromEntries(masterPlanos.map((p) => [p.id, p.valor])),
  );
  const [salvo, setSalvo] = useState<string | null>(null);

  return (
    <MasterOnly title="Valores dos planos" description="Ajuste os preços mensais praticados em cada plano.">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Empresas ativas</th>
              <th className="px-4 py-3">Valor atual</th>
              <th className="px-4 py-3">Novo valor (R$/mês)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {masterPlanos.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{p.nome}</td>
                <td className="px-4 py-3">{p.empresas}</td>
                <td className="px-4 py-3 text-muted-foreground">R$ {p.valor}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    value={valores[p.id]}
                    onChange={(e) => setValores((v) => ({ ...v, [p.id]: Number(e.target.value) }))}
                    className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSalvo(p.id)}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Save className="h-3.5 w-3.5" /> Salvar
                  </button>
                  {salvo === p.id && (
                    <span className="ml-2 text-[11px] text-success">Salvo (mock)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MasterOnly>
  );
}