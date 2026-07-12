import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CreditCard,
  Users,
} from "lucide-react";
import {
  useMasterAssinaturas,
  useMasterFinanceiroResumo,
} from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { formatCurrencyFromCents } from "@/utils/money";
import type { StatusConformidade } from "@/types";

const statusTone: Record<string, StatusConformidade | "info"> = {
  trial: "info",
  ativa: "ok",
  pagamento_pendente: "atencao",
  inadimplente: "vencido",
  bloqueada: "critico",
  cancelada: "sem_validade",
};

export function MasterFinanceiroPage() {
  const { data: resumo } = useMasterFinanceiroResumo();
  const { data: assinaturas = [] } = useMasterAssinaturas();

  return (
    <AppShell
      title="Financeiro Master"
      description="Visão executiva da receita, assinaturas, inadimplência e próximos pagamentos da plataforma."
      actions={
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Exportar financeiro <ArrowRight className="h-4 w-4" />
        </button>
      }
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MasterKpi
          label="Receita mensal prevista"
          value={formatCurrencyFromCents(resumo?.receita_mensal_prevista_centavos)}
          icon={CreditCard}
          tone="text-success"
        />
        <MasterKpi
          label="Recebido no mês"
          value={formatCurrencyFromCents(resumo?.receita_recebida_mes_centavos)}
          icon={CalendarClock}
          tone="text-primary"
        />
        <MasterKpi
          label="Empresas ativas"
          value={resumo?.empresas_ativas ?? 0}
          icon={Building2}
          tone="text-accent"
        />
        <MasterKpi
          label="Usuários ativos"
          value={resumo?.usuarios_ativos ?? 0}
          icon={Users}
          tone="text-primary"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Próximos pagamentos</h2>
            <p className="text-xs text-muted-foreground">
              Empresas com vencimento próximo para acompanhamento comercial.
            </p>
          </div>
          <div className="divide-y divide-border">
            {(resumo?.proximos_pagamentos ?? []).map((item) => (
              <div key={item.empresa_id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <div className="text-sm font-medium">{item.nome_fantasia}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.cnpj} · venc. {item.proximo_vencimento ?? "sem data"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatCurrencyFromCents(item.valor_centavos)}</div>
                  <StatusBadge tone={statusTone[item.status] ?? "info"}>{item.status}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-danger" /> Pagamentos atrasados
            </h2>
            <p className="text-xs text-muted-foreground">
              Itens para cobrança, bloqueio ou renegociação.
            </p>
          </div>
          <div className="divide-y divide-border">
            {(resumo?.pagamentos_atrasados ?? []).map((item) => (
              <div key={item.fatura_id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <div className="text-sm font-medium">{item.nome_fantasia}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.cnpj} · venc. {item.vencimento}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-danger">
                    {formatCurrencyFromCents(item.valor_centavos)}
                  </div>
                  <StatusBadge tone="vencido">{item.status}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Assinaturas por empresa</h2>
          <p className="text-xs text-muted-foreground">
            Controle de plano, valor contratado, próximo vencimento e bloqueio financeiro.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2.5 text-left font-medium">Empresa</th>
              <th className="px-4 py-2.5 text-left font-medium">Plano</th>
              <th className="px-4 py-2.5 text-left font-medium">Usuários</th>
              <th className="px-4 py-2.5 text-left font-medium">Valor mensal</th>
              <th className="px-4 py-2.5 text-left font-medium">Vencimento</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-5 py-2.5 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assinaturas.map((assinatura) => (
              <tr key={assinatura.empresa_id} className="hover:bg-muted/30">
                <td className="px-5 py-3">
                  <div className="font-medium">{assinatura.nome_fantasia}</div>
                  <div className="text-xs text-muted-foreground">{assinatura.cnpj}</div>
                </td>
                <td className="px-4 py-3">{assinatura.plano_nome ?? "Sem plano"}</td>
                <td className="px-4 py-3 tabular-nums">{assinatura.usuarios_ativos}</td>
                <td className="px-4 py-3 font-medium">
                  {formatCurrencyFromCents(assinatura.valor_mensal_centavos)}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {assinatura.proximo_vencimento ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={statusTone[assinatura.status ?? "trial"] ?? "info"}>
                    {assinatura.status ?? "sem assinatura"}
                  </StatusBadge>
                </td>
                <td className="px-5 py-3 text-right">
                  <button className="text-xs font-medium text-accent hover:underline">
                    Gerenciar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

function MasterKpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof CreditCard;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
