import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MasterOnly } from "@/components/master-guard";
import { masterPlanos } from "@/mocks/conformflow-mocks";

export const Route = createFileRoute("/master/recursos-planos")({
  component: MasterRecursosPlanos,
});

type RecursoKey = "documentos" | "equipamentos" | "manutencoes" | "auditoria" | "alertas" | "usuarios";
const recursos: { key: RecursoKey; label: string; tipo: "bool" | "num" }[] = [
  { key: "documentos", label: "Documentos", tipo: "bool" },
  { key: "equipamentos", label: "Equipamentos", tipo: "bool" },
  { key: "manutencoes", label: "Manutenções", tipo: "bool" },
  { key: "auditoria", label: "Auditoria", tipo: "bool" },
  { key: "alertas", label: "Alertas", tipo: "bool" },
  { key: "usuarios", label: "Usuários incluídos", tipo: "num" },
];

function MasterRecursosPlanos() {
  const [state, setState] = useState<Record<string, Record<RecursoKey, boolean | number>>>(() =>
    Object.fromEntries(masterPlanos.map((p) => [p.id, { ...p.recursos }])),
  );

  return (
    <MasterOnly title="Recursos por plano" description="Configure quais módulos e limites cada plano inclui.">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Recurso</th>
              {masterPlanos.map((p) => (
                <th key={p.id} className="px-4 py-3">{p.nome}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recursos.map((r) => (
              <tr key={r.key} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{r.label}</td>
                {masterPlanos.map((p) => {
                  const val = state[p.id][r.key];
                  return (
                    <td key={p.id} className="px-4 py-3">
                      {r.tipo === "bool" ? (
                        <input
                          type="checkbox"
                          checked={Boolean(val)}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              [p.id]: { ...s[p.id], [r.key]: e.target.checked },
                            }))
                          }
                        />
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={Number(val)}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              [p.id]: { ...s[p.id], [r.key]: Number(e.target.value) },
                            }))
                          }
                          className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        As alterações são apenas visuais neste momento. Ao conectar o backend, esta tela
        persistirá a configuração em <code>planos.recursos</code>.
      </p>
    </MasterOnly>
  );
}