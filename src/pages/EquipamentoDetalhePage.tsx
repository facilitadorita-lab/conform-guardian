import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEquipamento } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import type { EquipamentoHistoricoItem } from "@/services/equipamentosService";
import { formatDateBR } from "@/utils/date";
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
  const { data: equipamento, isLoading } = useEquipamento(id);
  const [tab, setTab] = useState<Tab>("Dados gerais");

  if (!equipamento && isLoading) {
    return (
      <AppShell
        title="Carregando equipamento"
        description="Buscando dados gerais, calibrações, qualificações e histórico."
      >
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Carregando informações do equipamento...
        </div>
      </AppShell>
    );
  }

  if (!equipamento) {
    return (
      <AppShell
        title="Equipamento não encontrado"
        description="O registro solicitado ainda não foi carregado ou não existe."
        actions={<BackButton />}
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
      actions={<BackButton />}
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={equipamento.status}>{statusLabel(equipamento.status)}</StatusBadge>
        <span className="text-xs text-muted-foreground">
          Criticidade <strong className="text-foreground">{equipamento.criticidade}</strong>
        </span>
        <span className="text-xs text-muted-foreground">
          Próximo vencimento{" "}
          <strong className="text-foreground">{formatDateBR(equipamento.proximoVenc)}</strong>
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
          {tab === "Dados gerais" && (
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
          )}

          {tab === "Calibrações" && (
            <TimelineList
              items={equipamento.calibracoes}
              empty="Nenhuma calibração cadastrada para este equipamento."
            />
          )}

          {tab === "Qualificações" && (
            <TimelineList
              items={equipamento.qualificacoes}
              empty="Nenhuma qualificação cadastrada para este equipamento."
            />
          )}

          {tab === "Manutenções" && (
            <TimelineList
              items={equipamento.manutencoes}
              empty="Nenhuma manutenção cadastrada para este equipamento."
            />
          )}

          {tab === "Anexos" && (
            <TimelineList
              items={equipamento.anexos}
              empty="Nenhum anexo vinculado a este equipamento."
            />
          )}

          {tab === "Pendências" && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              As pendências específicas do equipamento serão exibidas aqui quando houver tratativas
              vinculadas ao cadastro.
            </div>
          )}

          {tab === "Histórico" && (
            <TimelineList
              items={equipamento.historico}
              empty="Nenhum evento de histórico registrado para este equipamento."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function BackButton() {
  return (
    <Link
      to="/equipamentos"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
    >
      <ArrowLeft className="h-4 w-4" /> Voltar
    </Link>
  );
}

function TimelineList({ items, empty }: { items: EquipamentoHistoricoItem[]; empty: string }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {items.map((item, index) => (
        <div key={item.id ?? index} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{item.descricao}</p>
              {item.status && (
                <StatusBadge tone={item.status}>{statusLabel(item.status)}</StatusBadge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {item.tipo && <span>Tipo: {humanizeTipo(item.tipo)}</span>}
              {item.data && <span>Data: {formatDateBR(item.data)}</span>}
            </div>
          </div>

          {item.documentoUrl && (
            <a
              href={item.documentoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Abrir anexo <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ))}
    </div>
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

function humanizeTipo(value: string) {
  return value.replaceAll("_", " ");
}
