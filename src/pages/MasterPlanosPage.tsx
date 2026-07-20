import { CheckCircle2, Save, ShieldAlert, ToggleLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMasterPlanos } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { adminMasterService } from "@/services";
import type { PlanoComercialResumo, PlanoRecurso } from "@/types";
import { centsToInputValue, formatCurrencyFromCents } from "@/utils/money";

const recursoLabels: Record<PlanoRecurso, string> = {
  assistente_ia: "Assistente IA",
  vencimentos: "Vencimentos",
  documentos: "Documentos",
  equipamentos: "Equipamentos",
  calibracoes: "Calibrações",
  qualificacoes: "Qualificações",
  manutencoes: "Manutenções",
  pendencias: "Pendências",
  alertas: "Alertas",
  relatorios: "Relatórios",
  auditoria: "Auditoria",
  usuarios: "Usuários",
  anexos: "Anexos",
  multi_unidades: "Multiunidades",
  suporte_prioritario: "Suporte prioritário",
};

const recursosOrdenados = Object.keys(recursoLabels) as PlanoRecurso[];

export function MasterPlanosPage() {
  const queryClient = useQueryClient();
  const { data: planos = [] } = useMasterPlanos();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PlanoComercialResumo>>({});
  const planoSelecionado = useMemo(
    () =>
      drafts[selectedId ?? planos[0]?.id] ??
      planos.find((plano) => plano.id === selectedId) ??
      planos[0],
    [drafts, planos, selectedId],
  );
  const validationErrors = planoSelecionado ? validatePlano(planoSelecionado) : [];

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const plano of planos) {
        if (!next[plano.id]) next[plano.id] = plano;
      }
      return next;
    });
  }, [planos]);

  const salvarPlano = useMutation({
    mutationFn: (plano: PlanoComercialResumo) => adminMasterService.salvarPlano(plano.id, plano),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", "planos"] }),
  });

  return (
    <AppShell
      title="Planos e Recursos"
      description="Configure valores, limites e quais módulos cada plano libera para as empresas."
      actions={
        <button
          disabled={!planoSelecionado || salvarPlano.isPending || validationErrors.length > 0}
          onClick={() => planoSelecionado && salvarPlano.mutate(planoSelecionado)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> Salvar alterações
        </button>
      }
    >
      {salvarPlano.isSuccess ? (
        <div className="rounded-xl border border-success/25 bg-success/5 px-4 py-3 text-sm text-success">
          Plano atualizado no backend e pronto para refletir no catálogo público.
        </div>
      ) : null}
      {salvarPlano.error ? (
        <div className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
          {salvarPlano.error.message}
        </div>
      ) : null}
      {validationErrors.length > 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <strong>Revise o plano antes de salvar:</strong> {validationErrors.join(" ")}
        </div>
      ) : null}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {planos.map((plano) => (
          <button
            key={plano.id}
            onClick={() => setSelectedId(plano.id)}
            className={`rounded-xl border bg-card p-5 text-left transition-colors hover:border-accent ${
              (selectedId ?? planos[0]?.id) === plano.id ? "border-accent" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{plano.nome}</div>
                <div className="mt-1 text-xs text-muted-foreground">{plano.descricao}</div>
              </div>
              <StatusBadge tone={plano.ativo ? "ok" : "sem_validade"}>
                {plano.ativo ? "Ativo" : "Inativo"}
              </StatusBadge>
            </div>
            <div className="mt-4 text-2xl font-semibold text-primary">
              {formatCurrencyFromCents(plano.valor_mensal_centavos)}
              <span className="text-xs font-normal text-muted-foreground"> / mês</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {plano.limite_usuarios} usuários · {plano.limite_documentos ?? "Ilimitado"} documentos
              · {plano.limite_equipamentos ?? "Ilimitado"} equipamentos
            </div>
          </button>
        ))}
      </section>

      {planoSelecionado ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 xl:col-span-1">
            <h2 className="text-sm font-semibold">Valores e limites</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Campos preparados para salvar no backend via RPC do Admin Master.
            </p>

            <div className="mt-5 space-y-4">
              <Field label="Nome do plano" value={planoSelecionado.nome} />
              <Field label="Código interno" value={planoSelecionado.codigo} />
              <Field
                label="Público recomendado"
                value={planoSelecionado.publico_recomendado ?? ""}
                placeholder="Perfil de cliente ideal"
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "publico_recomendado", value || null)
                }
              />
              <Field
                label="Valor mensal"
                value={centsToInputValue(planoSelecionado.valor_mensal_centavos)}
                prefix="R$"
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "valor_mensal_centavos", moneyToCents(value))
                }
              />
              <Field
                label="Valor anual"
                value={centsToInputValue(planoSelecionado.valor_anual_centavos)}
                prefix="R$"
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "valor_anual_centavos", moneyToCents(value))
                }
              />
              <Field
                label="Limite de usuários"
                value={String(planoSelecionado.limite_usuarios)}
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "limite_usuarios", numberOrZero(value))
                }
              />
              <Field
                label="Limite de unidades"
                value={String(planoSelecionado.limite_unidades ?? "")}
                placeholder="Sem limite"
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "limite_unidades", numberOrNull(value))
                }
              />
              <Field
                label="Limite de documentos"
                value={String(planoSelecionado.limite_documentos ?? "")}
                placeholder="Ilimitado"
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "limite_documentos", numberOrNull(value))
                }
              />
              <Field
                label="Limite de equipamentos"
                value={String(planoSelecionado.limite_equipamentos ?? "")}
                placeholder="Ilimitado"
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "limite_equipamentos", numberOrNull(value))
                }
              />
              <Field
                label="Armazenamento (MB)"
                value={String(planoSelecionado.limite_storage_mb)}
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "limite_storage_mb", numberOrZero(value))
                }
              />
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Nível de suporte</span>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                  value={planoSelecionado.nivel_suporte ?? "padrao"}
                  onChange={(event) =>
                    updatePlano(
                      planoSelecionado.id,
                      "nivel_suporte",
                      event.target.value as PlanoComercialResumo["nivel_suporte"],
                    )
                  }
                >
                  <option value="padrao">Padrão</option>
                  <option value="prioritario">Prioritário</option>
                  <option value="dedicado">Dedicado</option>
                </select>
              </label>
              <Field
                label="Stripe Product ID"
                value={planoSelecionado.stripe_product_id ?? ""}
                placeholder="prod_..."
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "stripe_product_id", value || null)
                }
              />
              <Field
                label="Stripe Price ID mensal"
                value={planoSelecionado.stripe_monthly_price_id ?? ""}
                placeholder="price_..."
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "stripe_monthly_price_id", value || null)
                }
              />
              <Field
                label="Stripe Price ID anual"
                value={planoSelecionado.stripe_yearly_price_id ?? ""}
                placeholder="price_..."
                onChange={(value) =>
                  updatePlano(planoSelecionado.id, "stripe_yearly_price_id", value || null)
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Recursos liberados no plano</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  O frontend mostra/oculta módulos; o backend também bloqueia gravações fora do
                  plano.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                <ShieldAlert className="h-4 w-4" /> Controle real no Supabase
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {recursosOrdenados.map((recurso) => {
                const enabled = Boolean(planoSelecionado.recursos[recurso]);

                return (
                  <div
                    key={recurso}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleRecurso(planoSelecionado.id, recurso)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleRecurso(planoSelecionado.id, recurso);
                      }
                    }}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                      enabled ? "border-success/30 bg-success/5" : "border-border bg-muted/20"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{recursoLabels[recurso]}</div>
                      <div className="text-xs text-muted-foreground">
                        {enabled ? "Disponível para empresas deste plano" : "Bloqueado neste plano"}
                      </div>
                    </div>
                    {enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );

  function updatePlano<K extends keyof PlanoComercialResumo>(
    planoId: string,
    field: K,
    value: PlanoComercialResumo[K],
  ) {
    setDrafts((current) => ({
      ...current,
      [planoId]: {
        ...(current[planoId] ?? planoSelecionado),
        [field]: value,
      },
    }));
  }

  function toggleRecurso(planoId: string, recurso: PlanoRecurso) {
    setDrafts((current) => {
      const plano = current[planoId] ?? planoSelecionado;
      return {
        ...current,
        [planoId]: {
          ...plano,
          recursos: {
            ...plano.recursos,
            [recurso]: !plano.recursos[recurso],
          },
        },
      };
    });
  }
}

function Field({
  label,
  value,
  prefix,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  prefix?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm">
        {prefix ? <span className="mr-2 text-muted-foreground">{prefix}</span> : null}
        <input
          className="w-full bg-transparent outline-none"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
          readOnly={!onChange}
        />
      </div>
    </label>
  );
}

function moneyToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function validatePlano(plano: PlanoComercialResumo): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(plano.valor_mensal_centavos) || plano.valor_mensal_centavos < 0) {
    errors.push("o valor mensal não pode ser negativo.");
  }
  if (
    plano.valor_anual_centavos !== null &&
    plano.valor_anual_centavos !== undefined &&
    (!Number.isFinite(plano.valor_anual_centavos) || plano.valor_anual_centavos < 0)
  ) {
    errors.push("o valor anual não pode ser negativo.");
  }
  if (!Number.isFinite(plano.limite_usuarios) || plano.limite_usuarios < 1) {
    errors.push("o plano precisa permitir pelo menos um usuário.");
  }
  if (!Number.isFinite(plano.limite_storage_mb) || plano.limite_storage_mb < 1) {
    errors.push("defina um armazenamento maior que zero.");
  }
  if (
    plano.limite_unidades !== null &&
    plano.limite_unidades !== undefined &&
    plano.limite_unidades < 1
  ) {
    errors.push("o limite de unidades deve ser maior que zero ou ficar em branco.");
  }
  return errors;
}

function numberOrZero(value: string) {
  const parsed = Number(value.replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrNull(value: string) {
  const cleaned = value.replace(/\D/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
