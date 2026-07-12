import { createFileRoute } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { masterInadimplentes } from "@/mocks/conformflow-mocks";

export const Route = createFileRoute("/master/inadimplentes")({
  component: MasterInadimplentes,
});

function MasterInadimplentes() {
  const total = masterInadimplentes.reduce((s, i) => s + i.valor, 0);
  return (
    <MasterOnly title="Inadimplentes" description="Empresas com faturas em aberto ou pagamento atrasado.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Kpi label="Empresas" value={String(masterInadimplentes.length)} />
        <Kpi label="Valor em aberto" value={`R$ ${total}`} />
        <Kpi label="Maior atraso" value={`${Math.max(...masterInadimplentes.map((i) => i.diasAtraso))} dias`} />
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Dias em atraso</th>
              <th className="px-4 py-3">Última tentativa</th>
            </tr>
          </thead>
          <tbody>
            {masterInadimplentes.map((i) => (
              <tr key={i.empresa} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{i.empresa}</td>
                <td className="px-4 py-3">{i.plano}</td>
                <td className="px-4 py-3">R$ {i.valor}</td>
                <td className="px-4 py-3 text-danger font-semibold">{i.diasAtraso}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.ultimaTentativa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MasterOnly>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}