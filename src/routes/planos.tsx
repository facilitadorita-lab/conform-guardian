import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AddOn,
  CtaSection,
  PricingGrid,
  ProductMockup,
  PublicFooter,
  PublicHeader,
  Reveal,
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
    <main className="min-h-screen overflow-x-clip bg-white text-slate-950">
      <PublicHeader />

      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_7%_0%,rgba(6,182,212,0.14),transparent_32%),radial-gradient(circle_at_92%_18%,rgba(37,99,235,0.1),transparent_35%),linear-gradient(180deg,#f7fbff_0%,#fff_88%)] px-5 pb-16 pt-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,41,71,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(15,41,71,0.028)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
          <Reveal className="max-w-xl" delay={0}>
            <div className="cf-hero-sequence">
            <div className="mb-5 inline-flex rounded-full border border-cyan-200/90 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-[0_10px_24px_-20px_rgba(6,182,212,0.6)] backdrop-blur">
              Planos comerciais
            </div>
            <h1 className="text-4xl font-semibold leading-[1.03] tracking-[-0.045em] text-slate-950 md:text-6xl">
              Conformidade sob controle. <span className="text-cyan-700">Sem complicação.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Organize documentos, equipamentos e vencimentos em um só lugar. Comece com 7 dias gratuitos e escolha o plano ideal no seu ritmo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="group h-12 rounded-xl bg-slate-950 px-6 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Link
                  to="/cadastro"
                  search={{ plan: "profissional", interval: "monthly", checkout: undefined }}
                >
                  Testar grátis por 7 dias <ArrowRight className="cf-cta-arrow h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-xl border-slate-200 bg-white px-6 transition hover:-translate-y-0.5 hover:bg-slate-50">
                <Link to="/login" search={{ msg: undefined }}>Entrar na plataforma</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-600">
              {[
                "7 dias grátis",
                "Ativação imediata",
                "Cancele quando quiser",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            </div>
          </Reveal>

          <Reveal delay={100} className="relative mx-auto w-full max-w-3xl lg:mr-0">
            <div className="cf-product-stage relative z-10">
              <ProductMockup />
            </div>
            <div className="absolute -left-7 bottom-10 z-20 hidden w-48 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_24px_55px_-34px_rgba(15,41,71,0.52)] backdrop-blur lg:block">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-950">12 documentos em conformidade</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Tudo organizado para a próxima auditoria.</p>
            </div>
            <div className="absolute -right-5 top-10 z-20 hidden w-44 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_24px_55px_-34px_rgba(15,41,71,0.52)] backdrop-blur lg:block">
              <div className="flex items-center gap-2 text-amber-700">
                <CalendarClock className="h-4 w-4" />
                <span className="text-xs font-semibold">3 próximos vencimentos</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Prioridades claras antes de se tornarem urgências.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="comparativo" className="scroll-mt-24 bg-white px-5 py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionTitle
              align="center"
              eyebrow="Planos"
              title="Escolha o nível de controle ideal para sua operação."
              description="Comece com o essencial e evolua conforme sua rotina de conformidade crescer."
            />
          </Reveal>
          <Reveal delay={80} className="mt-12">
            <PricingGrid />
          </Reveal>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionTitle
              eyebrow="Adicionais"
              title="Ajuste o Conform Flow ao tamanho da sua operação."
              description="Inclua colaboradores ou unidades quando precisar, sem mudar a estrutura do seu ambiente."
            />
          </Reveal>
          <Reveal delay={80} className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
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
          </Reveal>
        </div>
      </section>

      {partnerCatalog.data?.length ? (
        <section className="bg-white px-5 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <SectionTitle
                eyebrow="Programa de parceiros"
                title="Uma única assinatura para cuidar da sua carteira de clientes."
                description="Cada empresa cliente permanece em um ambiente independente, com acesso restrito aos próprios dados."
              />
            </Reveal>
            <Reveal delay={80} className="mt-10 grid gap-5 lg:grid-cols-3">
              {partnerCatalog.data.map((plan) => (
                <article
                  key={plan.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,41,71,0.4)] transition-[border-color,box-shadow,transform] duration-[200ms] ease-out hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_24px_58px_-42px_rgba(15,41,71,0.52)]"
                >
                  <h3 className="text-lg font-semibold text-slate-950">{plan.nome}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{plan.descricao}</p>
                  <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
                    {formatCurrencyFromCents(plan.valor_mensal_centavos, plan.moeda)}
                    <span className="text-sm font-normal text-slate-500">/mês</span>
                  </p>
                  <div className="mt-5 space-y-3 text-sm text-slate-700">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {plan.limite_clientes} clientes incluídos
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      Cliente adicional por {formatCurrencyFromCents(plan.preco_cliente_extra_centavos, plan.moeda)}/mês
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                      Visão consolidada e relatórios por cliente
                    </div>
                  </div>
                  <Button asChild className="group mt-7 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                    <Link
                      to="/cadastro"
                      search={{ plan: plan.codigo, interval: "monthly", checkout: undefined }}
                    >
                      Quero ser parceiro <ArrowRight className="cf-cta-arrow h-4 w-4" />
                    </Link>
                  </Button>
                </article>
              ))}
            </Reveal>
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
