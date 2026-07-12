import { createFileRoute } from "@tanstack/react-router";
import { MasterOnly } from "@/components/master-guard";
import { masterPlanos } from "@/mocks/conformflow-mocks";

export const Route = createFileRoute("/master/planos")({
  component: MasterPlanos,
});

function MasterPlanos() {
  return (
    <MasterOnly title="Planos" description="Planos comerciais oferecidos aos clientes da plataforma.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {masterPlanos.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{p.id}</div>
                <div className="text-lg font-semibold">{p.nome}</div>
              </div>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${p.ativo ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground"}`}>
                {p.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="mt-4 text-2xl font-semibold">
              R$ {p.valor}<span className="text-sm text-muted-foreground font-normal"> /mês</span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{p.empresas} empresas neste plano</div>
            <ul className="mt-4 space-y-1 text-sm">
              <li>Documentos: {p.recursos.documentos ? "✓" : "—"}</li>
              <li>Equipamentos: {p.recursos.equipamentos ? "✓" : "—"}</li>
              <li>Manutenções: {p.recursos.manutencoes ? "✓" : "—"}</li>
              <li>Auditoria: {p.recursos.auditoria ? "✓" : "—"}</li>
              <li>Alertas: {p.recursos.alertas ? "✓" : "—"}</li>
              <li>Usuários incluídos: {p.recursos.usuarios}</li>
            </ul>
          </div>
        ))}
      </div>
    </MasterOnly>
  );
}