import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LogoSignature } from "@/components/public/marketing";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { usePublicCatalog } from "@/hooks/use-public-catalog";
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
  head: () => ({ meta: [{ title: "Contratar — Conform Flow" }] }),
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

function CadastroPage() {
  const search = Route.useSearch();
  const catalog = usePublicCatalog();
  const [planCode, setPlanCode] = useState(search.plan ?? "profissional");
  const [interval, setInterval] = useState<BillingInterval>(search.interval as BillingInterval);
  const [cnpj, setCnpj] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("administrador");
  const [establishmentType, setEstablishmentType] = useState("");
  const [segment, setSegment] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [prepared, setPrepared] = useState<PreparedSignup | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumableToken, setResumableToken] = useState<string | null>(null);

  useEffect(() => {
    if (search.checkout === "cancelled") {
      setResumableToken(sessionStorage.getItem("cf_signup_token"));
    }
  }, [search.checkout]);

  const selectedPlan = useMemo(
    () => catalog.data?.plans.find((plan) => plan.codigo === planCode) ?? catalog.data?.plans[0],
    [catalog.data?.plans, planCode],
  );

  async function onPrepare(event: React.FormEvent) {
    event.preventDefault();
    const legal = catalog.data?.legal;
    if (!selectedPlan || !legal?.terms_version || !legal.privacy_version) {
      setError("O catálogo comercial ainda não está pronto. Tente novamente em instantes.");
      return;
    }
    if (!accepted) {
      setError("Você precisa aceitar os termos para continuar.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await signupService.preparar({
        planCode: selectedPlan.codigo,
        billingInterval: interval,
        responsible: { name, email, phone, role, relationship },
        company: { cnpj, establishmentType, segment },
        terms: {
          accepted: true,
          termsVersion: legal.terms_version,
          privacyVersion: legal.privacy_version,
        },
      });
      setPrepared(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível analisar o cadastro.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCheckout() {
    if (!prepared) return;
    setOpeningCheckout(true);
    setError(null);
    try {
      const checkout = await signupService.criarCheckout(prepared.session_token);
      sessionStorage.setItem("cf_signup_token", prepared.session_token);
      sessionStorage.setItem("cf_signup_email", email.trim().toLowerCase());
      sessionStorage.setItem("cf_checkout_session_id", checkout.checkout_session_id);
      window.location.assign(checkout.checkout_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir o pagamento.");
      setOpeningCheckout(false);
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
      setError(caught instanceof Error ? caught.message : "Não foi possível retomar o pagamento.");
      setOpeningCheckout(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 lg:px-8">
          <Link to="/">
            <LogoSignature />
          </Link>
          <Link
            to="/planos"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar aos planos
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Contratação segura</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Antes do pagamento, validamos o CNPJ, a situação cadastral e a disponibilidade do
                ambiente.
              </p>
            </div>
          </div>

          {search.checkout === "cancelled" ? (
            <Notice tone="warning">
              <div>O pagamento foi cancelado. Seus dados não liberaram acesso à plataforma.</div>
              {resumableToken ? (
                <button
                  type="button"
                  onClick={resumeCheckout}
                  disabled={openingCheckout}
                  className="mt-2 font-semibold underline underline-offset-4"
                >
                  Retomar o mesmo checkout
                </button>
              ) : null}
            </Notice>
          ) : null}
          {error ? <Notice tone="error">{error}</Notice> : null}

          {!prepared ? (
            <form onSubmit={onPrepare} className="mt-8 space-y-7">
              <FormSection title="Plano e cobrança">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Plano">
                    <select
                      value={planCode}
                      onChange={(event) => setPlanCode(event.target.value)}
                      className={inputClass}
                      required
                    >
                      {(catalog.data?.plans ?? []).map((plan) => (
                        <option key={plan.id} value={plan.codigo}>
                          {plan.nome}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Periodicidade">
                    <select
                      value={interval}
                      onChange={(event) => setInterval(event.target.value as BillingInterval)}
                      className={inputClass}
                    >
                      <option value="monthly">Mensal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </Field>
                </div>
              </FormSection>

              <FormSection title="Empresa">
                <div className="grid gap-4 sm:grid-cols-2">
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
              </FormSection>

              <FormSection title="Responsável pela contratação">
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <Field label="Relação com a empresa" className="sm:col-span-2">
                    <select
                      value={relationship}
                      onChange={(event) => setRelationship(event.target.value as Relationship)}
                      className={inputClass}
                    >
                      <option value="socio">Sócio</option>
                      <option value="administrador">Administrador</option>
                      <option value="responsavel_tecnico">Responsável técnico</option>
                      <option value="diretor">Diretor</option>
                      <option value="gerente">Gerente</option>
                      <option value="colaborador_autorizado">Colaborador autorizado</option>
                      <option value="consultor">Consultor</option>
                      <option value="outro">Outro</option>
                    </select>
                  </Field>
                </div>
              </FormSection>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(value) => setAccepted(value === true)}
                  className="mt-1"
                />
                <span>
                  Declaro que estou autorizado a contratar em nome da empresa e aceito os termos de
                  uso e a política de privacidade vigentes.
                </span>
              </label>

              <Button
                type="submit"
                disabled={submitting || catalog.isLoading}
                className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Analisando cadastro...
                  </>
                ) : (
                  <>
                    Analisar antes do pagamento <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="mt-8 space-y-6">
              <Notice tone="success">CNPJ ativo, disponível e aprovado na pré-análise.</Notice>
              <div className="grid gap-4 rounded-2xl border border-slate-200 p-5 sm:grid-cols-2">
                <Review label="Razão social" value={prepared.company.legal_name} />
                <Review
                  label="Nome fantasia"
                  value={prepared.company.trade_name ?? prepared.company.legal_name}
                />
                <Review label="CNPJ" value={formatCnpj(prepared.company.cnpj)} />
                <Review
                  label="Situação cadastral"
                  value={prepared.company.registration_status ?? "Ativa"}
                />
                <Review label="Plano" value={prepared.plan.name} />
                <Review
                  label="Valor contratado"
                  value={`${formatCurrencyFromCents(prepared.plan.price_cents, prepared.plan.currency)} / ${prepared.plan.billing_interval === "yearly" ? "ano" : "mês"}`}
                />
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Esta fotografia da contratação será preservada. Mudanças futuras no preço ou no
                plano não alteram este checkout.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrepared(null)}
                  className="h-12 rounded-xl"
                >
                  Revisar dados
                </Button>
                <Button
                  type="button"
                  onClick={onCheckout}
                  disabled={openingCheckout}
                  className="h-12 flex-1 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  {openingCheckout ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Abrindo pagamento...
                    </>
                  ) : (
                    <>
                      Ir para pagamento seguro <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl bg-slate-950 p-6 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-cyan-300" /> Proteção comercial
            </div>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <SecureItem>O preço vem diretamente do backend.</SecureItem>
              <SecureItem>O pagamento é confirmado por webhook assinado.</SecureItem>
              <SecureItem>A página de sucesso nunca libera acesso.</SecureItem>
              <SecureItem>O acesso nasce bloqueado até validar o e-mail.</SecureItem>
            </div>
          </div>
          {selectedPlan ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-semibold text-slate-950">{selectedPlan.nome}</div>
              <div className="mt-3 text-2xl font-semibold">
                {formatCurrencyFromCents(
                  interval === "yearly"
                    ? selectedPlan.valor_anual_centavos
                    : selectedPlan.valor_mensal_centavos,
                  selectedPlan.moeda,
                )}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                por {interval === "yearly" ? "ano" : "mês"}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-4 text-sm font-semibold text-slate-950">{title}</legend>
      {children}
    </fieldset>
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
function Review({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}
function SecureItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      <span>{children}</span>
    </div>
  );
}
function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "warning" | "error";
}) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-700";
  return <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${classes}`}>{children}</div>;
}
