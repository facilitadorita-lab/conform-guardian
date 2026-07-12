import { createFileRoute } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { masterUsuariosAtivos } from "@/mocks/conformflow-mocks";

export const Route = createFileRoute("/master/usuarios-ativos")({
  component: MasterUsuariosAtivos,
});

function MasterUsuariosAtivos() {
  const total = masterUsuariosAtivos.reduce((s, u) => s + u.ativos, 0);
  return (
    <MasterOnly title="Usuários ativos" description="Usuários com acesso ativo nas empresas clientes.">
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total consolidado</div>
        <div className="text-2xl font-semibold mt-1">{total} usuários ativos</div>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Usuários ativos</th>
              <th className="px-4 py-3">Último login</th>
            </tr>
          </thead>
          <tbody>
            {masterUsuariosAtivos.map((u) => (
              <tr key={u.empresa} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{u.empresa}</td>
                <td className="px-4 py-3">{u.ativos}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.ultimosLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MasterOnly>
  );
}