import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  LockKeyhole,
  Minus,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LogoSignature } from "@/components/public/marketing";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { usePublicCatalog, usePublicPartnerCatalog } from "@/hooks/use-public-catalog";
import { signupService } from "@/services";
import type { BillingInterval, PreparedSignup } from "@/types";
import { formatCnpj } from "@/utils/cnpj";
import { formatCurrencyFromCents } from "@/utils/money";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>) => ({
    plan: typeof search.plan === "string" ? search.plan : undefined,
    interval: search.interval === "yearly" ? "yearly" : "monthly",
    checkout: typeof search.checkout === "string" ? search.checkout : undefined,
  }),
  head: () => ({ meta: [{ title: "Criar conta — Conform Flow" }] }),
  component: CadastroPage,
});

type Relationship =
  | "socio"
  | "administrador"
  | "responsavel_tecnico"
  | "diretor"
  | "gerente"
  | "colaborador_autorizado"
  | "consultor"
  | "outro";

type CommercialMode = "empresa" | "parceiro";

function CadastroPage() {
  const search = Route.useSearch();
  const catalog = usePublicCatalog();
  const partnerCatalog = usePublicPartnerCatalog();
  const [commercialMode, setCommercialMode] = useState<CommercialMode>(
    search.plan?.startsWith("parceiro_") ? "parceiro" : "empresa",
  );
  const [planCode, setPlanCode] = useState(search.plan ?? "profissional");
  const [interval, setInterval] = useState<BillingInterval>(search.interval as BillingInterval);
  const [extraUsers, setExtraUsers] = useState(0);
  const [extraUnits, setExtraUnits] = useState(0);
  const [cnpj, setCnpj] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [relationship] = useState<Relationship>("administrador");
  const [establishmentType, setEstablishmentType] = useState("");
  const [segment, setSegment] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumableToken, setResumableToken] = useState<string | null>(null);

  const planOptions = commercialMode === "parceiro" ? partnerCatalog.data ?? [] : catalog.data?.plans ?? [];
  const selectedPlan = useMemo(
    () => planOptions.find((plan) => plan.codigo === planCode) ?? planOptions[0],
    [planCode, planOptions],
  );
  const hasDirectMonthlyTrial = commercialMode === "empresa" && interval === "monthly";
  const userExtraPrice = catalog.data?.add_ons.usuario_extra_centavos ?? 0;
  const unitExtraPrice = catalog.data?.add_ons.unidade_extra_centavos ?? 0;
  const currency = selectedPlan?.moeda ?? catalog.data?.add_ons.moeda ?? "BRL";
  const planPrice =
    selectedPlan == null
      ? null
      : interval === "yearly"
        ? selectedPlan.valor_anual_centavos
        : selectedPlan.valor_mensal_centavos;
  const addOnsPrice =
    commercialMode === "empresa" ? extraUsers * userExtraPrice + extraUnits * unitExtraPrice : 0;
  const totalPrice = planPrice == null ? null : planPrice + addOnsPrice * (interval === "yearly" ? 12 : 1);
  const includedClients =
    commercialMode === "parceiro"
      ? (selectedPlan as { limite_clientes?: number } | undefined)?.limite_clientes ?? 0
      : 1;

  useEffect(() => {
    if (search.checkout === "cancelled") {
      setResumableToken(sessionStorage.getItem("cf_signup_token"));
    }
  }, [search.checkout]);

  useEffect(() => {
    if (interval === "yearly" && selectedPlan?.valor_anual_centavos == null) {
      setInterval("monthly");
    }
  }, [interval, selectedPlan?.valor_anual_centavos]);

  function chooseCommercialMode(mode: CommercialMode) {
    setCommercialMode(mode);
    setPlanCode(mode === "parceiro" ? "parceiro_start" : "profissional");
    setExtraUsers(0);
    setExtraUnits(0);
    setError(null);
  }

  async function startCheckout(prepared: PreparedSignup) {
    setOpeningCheckout(true);
    setError(null);
    sessionStorage.setItem("cf_signup_token", prepared.session_token);
    sessionStorage.setItem("cf_signup_email", email.trim().toLowerCase());

    try {
      const checkout = await signupService.criarCheckout(prepared.session_token);
      sessionStorage.setItem("cf_checkout_session_id", checkout.checkout_session_id);
      window.location.assign(checkout.checkout_url);
    } catch (caught) {
      setError(friendlyError(caught, "Não foi possível continuar agora. Tente novamente em instantes."));
      setOpeningCheckout(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const legal = catalog.data?.legal;

    if (!selectedPlan || !legal?.terms_version || !legal.privacy_version) {
      setError("Não foi possível carregar as opções agora. Tente novamente em instantes.");
      return;
    }
    if (!accepted) {
      setError("Aceite os termos para continuar.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const prepared = await signupService.preparar({
        planCode: selectedPlan.codigo,
        billingInterval: interval,
        addOns:
          commercialMode === "parceiro"
            ? { users: 0, units: 0 }
            : { users: extraUsers, units: extraUnits },
        responsible: { name, email, phone, role, relationship },
        company: { cnpj, establishmentType, segment },
        terms: {
          accepted: true,
          termsVersion: legal.terms_version,
          privacyVersion: legal.privacy_version,
        },
      });
      await startCheckout(prepared);
    } catch (caught) {
      setError(friendlyError(caught, "Não foi possível continuar agora. Tente novamente em instantes."));
    } finally {
      setSubmitting(false);
    }
  }

  async function resumeCheckout() {
    if (!resumableToken) return;
    setOpeningCheckout(true);
    setError(null);
    try {
      const checkout = await signupService.criarCheckout(resumableToken);
      window.location.assign(checkout.checkout_url);
    } catch (caught) {
      setError(friendlyError(caught, "Não foi possível retomar o pagamento agora. Tente novamente."));
      setOpeningCheckout(false);
    }
  }

  const isLoadingCatalog = commercialMode === "parceiro" ? partnerCatalog.isLoading : catalog.isLoading;
  const primaryLabel = hasDirectMonthlyTrial ? "Começar teste gratuito" : "Continuar para pagamento";

  return (
    <main className="min-h-screen bg-[#fbfcfe] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" aria-label="Ir para a página inicial" className="rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-4">
            <LogoSignature />
          </Link>
          <Link
            to="/planos"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:px-8 lg:py-14 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-14">
        <section className="min-w-0 lg:pr-2 xl:pr-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-[0.16em] text-cyan-700">CONFORM FLOW</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Crie sua conta
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Configure sua conta em menos de 2 minutos e comece a utilizar o Conform Flow imediatamente.
            </p>
          </div>

          {search.checkout === "cancelled" ? (
            <Notice tone="warning">
              <div>
                Você saiu antes de concluir. Nenhuma cobrança foi realizada.
              </div>
              {resumableToken ? (
                <button
                  type="button"
                  onClick={resumeCheckout}
                  disabled={openingCheckout}
                  className="mt-2 font-semibold underline decoration-slate-400 underline-offset-4 transition hover:decoration-slate-950 disabled:cursor-not-allowed"
                >
                  Retomar assinatura
                </button>
              ) : null}
            </Notice>
          ) : null}
          {error ? <Notice tone="error">{error}</Notice> : null}

          <form onSubmit={onSubmit} className="mt-10">
            <CheckoutSection
              eyebrow="01"
              title="Para começar"
              description="Informe quem ficará responsável pelo ambiente da sua empresa."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nome completo">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClass}
                    autoComplete="name"
                    required
                  />
                </Field>
                <Field label="E-mail corporativo">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                    autoComplete="email"
                    required
                  />
                </Field>
                <Field label="Telefone">
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={inputClass}
                    autoComplete="tel"
                    required
                  />
                </Field>
                <Field label="Cargo">
                  <input
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className={inputClass}
                    required
                  />
                </Field>
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <span>Você criará uma senha segura após confirmar seu e-mail.</span>
              </div>
            </CheckoutSection>

            <CheckoutSection
              eyebrow="02"
              title="Sua empresa"
              description="Usaremos estas informações para preparar seu ambiente."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="CNPJ" className="sm:col-span-2">
                  <input
                    value={cnpj}
                    onChange={(event) => setCnpj(formatCnpj(event.target.value))}
                    className={inputClass}
                    placeholder="00.000.000/0000-00"
                    inputMode="numeric"
                    required
                  />
                </Field>
                <Field label="Tipo de estabelecimento">
                  <input
                    value={establishmentType}
                    onChange={(event) => setEstablishmentType(event.target.value)}
                    className={inputClass}
                    placeholder="Ex.: clínica, farmácia"
                  />
                </Field>
                <Field label="Segmento">
                  <input
                    value={segment}
                    onChange={(event) => setSegment(event.target.value)}
                    className={inputClass}
                    placeholder="Ex.: saúde, laboratório"
                  />
                </Field>
              </div>
            </CheckoutSection>

            <CheckoutSection
              eyebrow="03"
              title="Sua assinatura"
              description="Escolha a opção que faz sentido para a sua operação hoje."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <ModeChoice
                  title="Minha empresa"
                  description="Organize a conformidade da sua própria operação."
                  selected={commercialMode === "empresa"}
                  onClick={() => chooseCommercialMode("empresa")}
                />
                <ModeChoice
                  title="Sou parceiro"
                  description="Gerencie empresas clientes em uma única conta."
                  selected={commercialMode === "parceiro"}
                  onClick={() => chooseCommercialMode("parceiro")}
                />
              </div>

              <div className="mt-7">
                <p className="text-sm font-medium text-slate-800">Plano</p>
                <div className="mt-3 grid gap-3">
                  {isLoadingCatalog ? (
                    <PlanChoicesSkeleton />
                  ) : (
                    planOptions.map((plan) => (
                      <PlanChoice
                        key={plan.id}
                        name={plan.nome}
                        description={plan.descricao}
                        price={
                          interval === "yearly"
                            ? plan.valor_anual_centavos
                            : plan.valor_mensal_centavos
                        }
                        currency={plan.moeda}
                        interval={interval}
                        selected={plan.codigo === selectedPlan?.codigo}
                        recommended={"mais_escolhido" in plan && plan.mais_escolhido}
                        onClick={() => {
                          setPlanCode(plan.codigo);
                          setError(null);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="mt-7">
                <p className="text-sm font-medium text-slate-800">Periodicidade</p>
                <div className="mt-3 inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Periodicidade da assinatura">
                  <IntervalButton selected={interval === "monthly"} onClick={() => setInterval("monthly")}>
                    Mensal
                  </IntervalButton>
                  <IntervalButton
                    selected={interval === "yearly"}
                    onClick={() => setInterval("yearly")}
                    disabled={selectedPlan?.valor_anual_centavos == null}
                  >
                    Anual
                  </IntervalButton>
                </div>
              </div>

              {commercialMode === "empresa" ? (
                <div className="mt-8 border-t border-slate-200 pt-7">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Recursos adicionais</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Ajuste sua assinatura sempre que precisar.</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <QuantityControl
                      label="Usuários extras"
                      description={`${formatCurrencyFromCents(userExtraPrice, currency)}/mês por usuário`}
                      value={extraUsers}
                      onChange={setExtraUsers}
                    />
                    <QuantityControl
                      label="Unidades extras"
                      description={`${formatCurrencyFromCents(unitExtraPrice, currency)}/mês por unidade`}
                      value={extraUnits}
                      onChange={setExtraUnits}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-600">
                  Este plano inclui até <strong className="font-semibold text-slate-900">{includedClients} {includedClients === 1 ? "cliente" : "clientes"}</strong> para você acompanhar.
                </div>
              )}
            </CheckoutSection>

            <div className="pt-8">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-600">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(value) => setAccepted(value === true)}
                  className="mt-1 border-slate-300"
                />
                <span>
                  Declaro que estou autorizado a contratar em nome da empresa e aceito os termos de uso e a política de privacidade.
                </span>
              </label>

              <Button
                type="submit"
                disabled={submitting || openingCheckout || isLoadingCatalog}
                className="mt-6 h-[52px] w-full rounded-xl bg-slate-950 text-base font-semibold text-white shadow-[0_16px_32px_-16px_rgba(15,23,42,0.55)] transition hover:bg-slate-800"
              >
                {openingCheckout ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Continuando...
                  </>
                ) : submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Preparando sua conta...
                  </>
                ) : (
                  <>
                    {primaryLabel} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
                <ShieldCheck className="h-4 w-4 text-slate-500" /> Ambiente seguro · Sem burocracia
              </p>
            </div>
          </form>
        </section>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <OrderSummary
            planName={selectedPlan?.nome ?? "Carregando plano"}
            interval={interval}
            includedClients={includedClients}
            extraUsers={commercialMode === "parceiro" ? 0 : extraUsers}
            extraUnits={commercialMode === "parceiro" ? 0 : extraUnits}
            totalCents={totalPrice}
            currency={currency}
            showTrial={hasDirectMonthlyTrial}
            loading={isLoadingCatalog}
          />
        </aside>
      </div>
    </main>
  );
}

const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100";

function CheckoutSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 py-9 first:pt-0 last:border-b-0">
      <div className="flex gap-4">
        <span className="pt-0.5 text-xs font-semibold tracking-[0.14em] text-cyan-700">{eyebrow}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ModeChoice({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative rounded-xl border p-4 text-left transition duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-cyan-100 ${
        selected
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_12px_28px_-20px_rgba(15,23,42,0.8)]"
          : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className={`mt-1 block text-sm leading-5 ${selected ? "text-slate-300" : "text-slate-500"}`}>{description}</span>
      {selected ? <Check className="absolute right-4 top-4 h-4 w-4 text-cyan-300" aria-hidden="true" /> : null}
    </button>
  );
}

function PlanChoice({
  name,
  description,
  price,
  currency,
  interval,
  selected,
  recommended,
  onClick,
}: {
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  interval: BillingInterval;
  selected: boolean;
  recommended: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-4 text-left transition duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-cyan-100 ${
        selected
          ? "border-cyan-500 bg-cyan-50/50 shadow-[0_12px_28px_-24px_rgba(8,145,178,0.65)]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-950">{name}</span>
          {recommended ? <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-800">Mais escolhido</span> : null}
        </span>
        {description ? <span className="mt-1 block truncate text-sm text-slate-500">{description}</span> : null}
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold tabular-nums text-slate-950">
          {price == null ? "Sob consulta" : formatCurrencyFromCents(price, currency)}
        </span>
        {price != null ? <span className="mt-0.5 block text-xs text-slate-500">/{interval === "yearly" ? "ano" : "mês"}</span> : null}
      </span>
    </button>
  );
}

function PlanChoicesSkeleton() {
  return (
    <div className="space-y-3" aria-label="Carregando planos" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex animate-pulse items-center justify-between rounded-xl border border-slate-100 p-4">
          <div className="space-y-2"><div className="h-3 w-24 rounded bg-slate-200" /><div className="h-3 w-44 rounded bg-slate-100" /></div>
          <div className="h-6 w-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function IntervalButton({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-9 rounded-lg px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:text-slate-400 ${
        selected ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  );
}

function QuantityControl({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  function update(next: number) {
    onChange(Math.max(0, Math.min(100, next)));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => update(value - 1)}
          disabled={value === 0}
          aria-label={`Remover ${label.toLowerCase()}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-lg font-semibold tabular-nums text-slate-950" aria-live="polite">{value}</span>
        <button
          type="button"
          onClick={() => update(value + 1)}
          disabled={value >= 100}
          aria-label={`Adicionar ${label.toLowerCase()}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function OrderSummary({
  planName,
  interval,
  includedClients,
  extraUsers,
  extraUnits,
  totalCents,
  currency,
  showTrial,
  loading,
}: {
  planName: string;
  interval: BillingInterval;
  includedClients: number;
  extraUsers: number;
  extraUnits: number;
  totalCents: number | null;
  currency: string;
  showTrial: boolean;
  loading: boolean;
}) {
  const clientLabel = includedClients === 1 ? "1 empresa" : `${includedClients} empresas`;
  const periodLabel = interval === "yearly" ? "ano" : "mês";
  const afterTrialPrice = totalCents == null ? "Sob consulta" : formatCurrencyFromCents(totalCents, currency);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.38)]" aria-busy={loading}>
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Resumo da assinatura</h2>
      <dl className="mt-6 space-y-4 text-sm">
        <SummaryRow label="Plano" value={loading ? "Carregando" : planName} />
        <SummaryRow label="Periodicidade" value={interval === "yearly" ? "Anual" : "Mensal"} />
        <SummaryRow label="Clientes incluídos" value={clientLabel} />
        <SummaryRow label="Usuários extras" value={String(extraUsers)} />
        <SummaryRow label="Unidades extras" value={String(extraUnits)} />
      </dl>

      <div className="mt-6 border-t border-slate-200 pt-6">
        {showTrial ? (
          <>
            <p className="text-sm font-medium text-slate-500">Hoje</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">R$ 0,00</p>
            <p className="mt-1 text-sm text-slate-500">Teste gratuito de 7 dias</p>
            <div className="mt-5 border-t border-dashed border-slate-200 pt-5">
              <p className="text-sm font-medium text-slate-500">Após o período de teste</p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950">
                {afterTrialPrice}<span className="ml-1 text-sm font-medium text-slate-500">/{periodLabel}</span>
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-500">Valor da assinatura</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {afterTrialPrice}<span className="ml-1 text-sm font-medium text-slate-500">/{periodLabel}</span>
            </p>
          </>
        )}
      </div>

      <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-600">
        <SummaryBenefit>{showTrial ? "Acesso completo durante o teste" : "Acesso completo"}</SummaryBenefit>
        <SummaryBenefit>Cancele quando quiser</SummaryBenefit>
        <SummaryBenefit>Ativação imediata</SummaryBenefit>
        <SummaryBenefit>Ambiente seguro</SummaryBenefit>
      </ul>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function SummaryBenefit({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"><Check className="h-3.5 w-3.5" /></span>
      {children}
    </li>
  );
}

function friendlyError(caught: unknown, fallback: string) {
  const message = caught instanceof Error ? caught.message.trim() : "";
  if (!message) return fallback;

  if (/backend|webhook|api|rpc|supabase|stripe|permission|postgres|database|network/i.test(message)) {
    return fallback;
  }

  return message;
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "warning" | "error";
}) {
  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50/60 text-amber-900"
      : "border-red-200 bg-red-50/60 text-red-800";
  return <div className={`mt-8 rounded-xl border px-4 py-3 text-sm leading-6 ${classes}`}>{children}</div>;
}
