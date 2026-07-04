import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { equipamentos, statusLabel } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/equipamentos/$id")({
  component: EquipamentoDetalhe,
});

const tabs = ["Dados gerais", "Calibrações", "Qualificações", "Manutenções", "Anexos", "Pendências", "Histórico"] as const;
type Tab = (typeof tabs)[number];

function EquipamentoDetalhe() {
  const { id } = Route.useParams();
  const eq = equipamentos.find((e) => e.id === id) ?? equipamentos[0];
  const [tab, setTab] = useState<Tab>("Dados gerais");

  return (
    <AppShell
      title={`${eq.nome} · ${eq.codigo}`}
      description={`${eq.fabricante} ${eq.modelo} — setor ${eq.setor}`}
      actions={
        <Link to="/equipamentos" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        <StatusBadge tone={eq.status}>{statusLabel(eq.status)}</StatusBadge>
        <span className="text-xs text-muted-foreground">Criticidade <strong className="text-foreground">{eq.criticidade}</strong></span>
        <span className="text-xs text-muted-foreground">Próximo vencimento <strong className="text-foreground">{eq.proximoVenc}</strong></span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap gap-1 border-b border-border px-2 pt-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px ${
                tab === t ? "border-accent text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "Dados gerais" ? (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <Field k="Nome" v={eq.nome} />
              <Field k="Código interno" v={eq.codigo} />
              <Field k="Tipo" v={eq.tipo} />
              <Field k="Fabricante" v={eq.fabricante} />
              <Field k="Modelo" v={eq.modelo} />
              <Field k="Setor" v={eq.setor} />
              <Field k="Criticidade" v={eq.criticidade} />
              <Field k="Status consolidado" v={statusLabel(eq.status)} />
            </dl>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>Nenhum registro exibido nesta pré-visualização.</p>
              <p className="mt-1">Este bloco será alimentado pelo backend na próxima fase (RLS + RPCs).</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 font-medium">{v}</dd>
    </div>
  );
}