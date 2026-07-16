import { createFileRoute } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { useMasterAssinaturas } from "@/hooks/use-conform-data";
export const Route = createFileRoute("/master/usuarios-ativos")({
  component: MasterUsuariosAtivos,
});
function MasterUsuariosAtivos() {
  const query = useMasterAssinaturas();
  const items = query.data ?? [];
  const total = items.reduce((sum, item) => sum + item.usuarios_ativos, 0);
  return (
    <MasterOnly
      title="Usuários ativos"
      description="Contagem consolidada por empresa, sem dados simulados."
    >
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Total consolidado
        </div>
        <div className="mt-1 text-2xl font-semibold">{total} usuários ativos</div>
      </div>
      {query.error ? <div className="text-sm text-danger">{query.error.message}</div> : null}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Usuários ativos</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.empresa_id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{item.nome_fantasia}</td>
                <td className="px-4 py-3">{item.cnpj}</td>
                <td className="px-4 py-3">{item.plano_nome ?? "Sem plano"}</td>
                <td className="px-4 py-3">{item.usuarios_ativos}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!query.isLoading && items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma empresa retornada pelo backend.
          </div>
        ) : null}
      </div>
    </MasterOnly>
  );
}
