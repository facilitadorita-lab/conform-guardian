import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MasterOnly } from "@/components/master-guard";
import { masterAssinaturas } from "@/mocks/conformflow-mocks";
import { AsaasSubscriptionDialog } from "@/components/asaas-subscription-dialog";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/master/assinaturas")({
  component: MasterAssinaturas,
});

function MasterAssinaturas() {
  const [open, setOpen] = useState(false);
  return (
    <MasterOnly title="Assinaturas" description="Assinaturas ativas, suspensas e em atraso.">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova assinatura Asaas
        </button>
      </div>
      {open && <AsaasSubscriptionDialog onClose={() => setOpen(false)} />}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Início</th>
              <th className="px-4 py-3">Próxima cobrança</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {masterAssinaturas.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{a.id}</td>
                <td className="px-4 py-3 font-medium">{a.empresa}</td>
                <td className="px-4 py-3">{a.plano}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.inicio}</td>
                <td className="px-4 py-3">{a.proximaCobranca}</td>
                <td className="px-4 py-3">R$ {a.valor}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] capitalize">
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MasterOnly>
  );
}