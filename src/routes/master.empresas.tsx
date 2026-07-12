import { createFileRoute } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { masterEmpresas } from "@/mocks/conformflow-mocks";

export const Route = createFileRoute("/master/empresas")({
  component: MasterEmpresas,
});

const statusStyle: Record<string, string> = {
  ativa: "border-success/40 bg-success/10 text-success",
  inadimplente: "border-warning/40 bg-warning/10 text-warning",
  suspensa: "border-danger/40 bg-danger/10 text-danger",
  bloqueada: "border-danger/40 bg-danger/10 text-danger",
  cancelada: "border-border bg-muted text-muted-foreground",
};

function MasterEmpresas() {
  return (
    <MasterOnly title="Empresas" description="Todas as empresas cadastradas na plataforma.">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Razão social</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Usuários</th>
              <th className="px-4 py-3">Cliente desde</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {masterEmpresas.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{e.razao}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.cnpj}</td>
                <td className="px-4 py-3">{e.plano}</td>
                <td className="px-4 py-3">{e.usuarios}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.desde}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${statusStyle[e.status]}`}>
                    {e.status}
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