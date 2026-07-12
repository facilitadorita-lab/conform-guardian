import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useEquipamento } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { statusLabel } from "@/utils/status";

const tabs = [
  "Dados gerais",
  "Calibrações",
  "Qualificações",
  "Manutenções",
  "Anexos",
  "Pendências",
  "Histórico",
] as const;

type Tab = (typeof tabs)[number];

export function EquipamentoDetalhePage({ id }: { id: string }) {
  const { data: equipamento } = useEquipamento(id);
  const [tab, setTab] = useState<Tab>("Dados gerais");

  if (!equipamento) {
    return (
      <AppShell
        title="Equipamento não encontrado"
        description="O registro solicitado ainda não foi carregado ou não existe."
        actions={
          <Link to="/equipamentos" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        }
      >
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Nenhum dado de equipamento disponível no momento.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`${equipamento.nome} · ${equipamento.codigo}`}
      description={`${equipamento.fabricante} ${equipamento.modelo} - setor ${equipamento.setor}`}
      actions={
        <Link to="/equipamentos" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        <StatusBadge tone={equipamento.status}>{statusLabel(equipamento.status)}</StatusBadge>
        <span className="text-xs text-muted-foreground">
          Criticidade <strong className="text-foreground">{equipamento.criticidade}</strong>
        </span>
        <span className="text-xs text-muted-foreground">
          Próximo vencimento <strong className="text-foreground">{equipamento.proximoVenc}</strong>
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap gap-1 border-b border-border px-2 pt-2">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm ${
                tab === item
                  ? "border-accent font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "Dados gerais" ? (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm md:grid-cols-2">
              <Field k="Nome" v={equipamento.nome} />
              <Field k="Código interno" v={equipamento.codigo} />
              <Field k="Tipo" v={equipamento.tipo} />
              <Field k="Fabricante" v={equipamento.fabricante} />
              <Field k="Modelo" v={equipamento.modelo} />
              <Field k="Setor" v={equipamento.setor} />
              <Field k="Criticidade" v={equipamento.criticidade} />
              <Field k="Status consolidado" v={statusLabel(equipamento.status)} />
            </dl>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>Nenhum registro exibido nesta pré-visualização.</p>
              <p className="mt-1">
                Este bloco será alimentado pelo backend na próxima fase (RLS + RPCs).
              </p>
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
