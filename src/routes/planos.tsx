import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AddOn,
  CtaSection,
  enabledFeatureLabels,
  PricingGrid,
  PublicFooter,
  PublicHeader,
  SectionTitle,
} from "@/components/public/marketing";
import { usePublicCatalog, usePublicPartnerCatalog } from "@/hooks/use-public-catalog";
import { formatCurrencyFromCents } from "@/utils/money";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Conform Flow" },
      {
        name: "description",
        content:
          "Planos do Conform Flow para documentos, equipamentos, manutenções, unidades e conformidade operacional.",
      },
    ],
  }),
  component: PlanosPage,
});

function PlanosPage() {
  const catalog = usePublicCatalog();
  const partnerCatalog = usePublicPartnerCatalog();
  const addOns = catalog.data?.add_ons;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />

      <section className="bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.14),transparent_32%),linear-gradient(180deg,#f8fafc_0%,#fff_72%)] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Planos comerciais
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Planos claros para crescer com controle.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Comece gratuitamente por 7 dias, teste todos os recursos e escolha com calma o plano
                ideal para a sua operação.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-12 rounded-xl bg-slate-950 px-6 text-white hover:bg-slate-800"
                >
                  <Link
                    to="/cadastro"
                    search={{ plan: "profissional", interval: "monthly", checkout: undefined }}
                  >
                    Testar grátis por 7 dias <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-xl bg-white px-6">
                  <Link to="/login" search={{ msg: undefined }}>
                    Entrar na plataforma
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.7)]">
              <h2 className="text-base font-semibold text-slate-950">Adicionais disponíveis</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <AddOn
                  title="Usuário extra"
                  price={formatOptionalPrice(addOns?.usuario_extra_centavos, addOns?.moeda)}
                  description="Adicione novos colaboradores ao ambiente."
                />
                <AddOn
                  title="Unidade extra"
                  price={formatOptionalPrice(addOns?.unidade_extra_centavos, addOns?.moeda)}
                  description="Gerencie mais unidades na mesma conta."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="comparativo" className="scroll-mt-24 bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            align="center"
            eyebrow="Comparativo"
            title="Escolha o plano pelo nível de maturidade da operação."
            description="Compare recursos, usuários e unidades para encontrar a melhor opção para você."
          />
          <div className="mt-12">
            <PricingGrid />
          </div>
        </div>
      </section>

      {catalog.data?.plans.length ? (
        <section className="bg-slate-50 px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionTitle
              eyebrow="O que cada plano destrava"
              title="Tudo o que você precisa, no momento certo."
              description="Veja os recursos incluídos em cada plano e evolua quando sua operação pedir."
            />
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {catalog.data.plans.map((plan) => (
                <article key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h3 className="text-lg font-semibold text-slate-950">{plan.nome}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {plan.publico_recomendado}
                  </p>
                  <div className="mt-5 space-y-3">
                    {enabledFeatureLabels(plan).map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {partnerCatalog.data?.length ? (
        <section className="bg-white px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionTitle
              eyebrow="Programa de parceiros"
              title="Uma única assinatura para cuidar da sua carteira de clientes."
              description="O parceiro paga a mensalidade e os clientes adicionais. Cada empresa cliente permanece em um ambiente independente, com acesso restrito aos próprios dados."
            />
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {partnerCatalog.data.map((plan) => (
                <article
                  key={plan.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-950">{plan.nome}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{plan.descricao}</p>
                  <p className="mt-6 text-3xl font-semibold text-slate-950">
                    {formatCurrencyFromCents(plan.valor_mensal_centavos, plan.moeda)}
                    <span className="text-sm font-normal text-slate-500">/mês</span>
                  </p>
                  <div className="mt-5 space-y-3 text-sm text-slate-700">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      {plan.limite_clientes} clientes incluídos
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      Cliente adicional por{" "}
                      {formatCurrencyFromCents(plan.preco_cliente_extra_centavos, plan.moeda)}/mês
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      Visão consolidada e relatórios por cliente
                    </div>
                  </div>
                  <Button
                    asChild
                    className="mt-7 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                  >
                    <Link
                      to="/cadastro"
                      search={{ plan: plan.codigo, interval: "monthly", checkout: undefined }}
                    >
                      Quero ser parceiro <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <CtaSection />
      <PublicFooter />
    </main>
  );
}

function formatOptionalPrice(value: number | null | undefined, currency = "BRL") {
  if (value === null || value === undefined) return "Consulte condições";
  return `${formatCurrencyFromCents(value, currency)}/mês`;
}
