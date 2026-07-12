import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { useSession } from "@/hooks/use-session";
import { ArrowRight, Building2, Check } from "lucide-react";

export const Route = createFileRoute("/master/empresas")({
  head: () => ({ meta: [{ title: "Empresas cadastradas — Conform Flow" }] }),
  component: MasterEmpresas,
});

const statusStyle: Record<string, string> = {
  ativa: "border-success/40 bg-success/10 text-success",
  inadimplente: "border-warning/40 bg-warning/10 text-warning",
  suspensa: "border-danger/40 bg-danger/10 text-danger",
  bloqueada: "border-danger/40 bg-danger/10 text-danger",
  cancelada: "border-border bg-muted text-muted-foreground",
};

const assinaturaStyle: Record<string, string> = {
  ativa: "text-success",
  atrasada: "text-warning",
  suspensa: "text-danger",
  cancelada: "text-muted-foreground",
};

function MasterEmpresas() {
  const { empresasDisponiveis, selectedCompanyId, trocarEmpresa } = useSession();
  const navigate = useNavigate();

  const entrar = (id: string) => {
    if (trocarEmpresa(id)) {
      navigate({ to: "/" });
    }
  };

  return (
    <MasterOnly
      title="Empresas cadastradas"
      description="Selecione a empresa para entrar no ambiente correspondente. Todos os módulos passarão a consultar os dados dessa empresa."
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Usuários</th>
              <th className="px-4 py-3 text-right">Documentos</th>
              <th className="px-4 py-3 text-right">Equipamentos</th>
              <th className="px-4 py-3">Assinatura</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {empresasDisponiveis.map((e) => {
              const ativa = e.id === selectedCompanyId;
              return (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="leading-tight">
                        <div className="font-medium">{e.nome_fantasia}</div>
                        <div className="text-xs text-muted-foreground">{e.razao_social}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{e.cnpj}</td>
                  <td className="px-4 py-3">{e.plano}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] capitalize ${statusStyle[e.status]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{e.usuarios}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{e.documentos}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{e.equipamentos}</td>
                  <td className={`px-4 py-3 text-xs capitalize ${assinaturaStyle[e.assinatura] ?? "text-muted-foreground"}`}>
                    {e.assinatura}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => entrar(e.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        ativa
                          ? "border border-success/40 bg-success/10 text-success"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {ativa ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Selecionada
                        </>
                      ) : (
                        <>
                          Entrar <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
            {empresasDisponiveis.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma empresa ativa vinculada ao usuário.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </MasterOnly>
  );
}