import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  benefitCards,
  CtaSection,
  FAQSection,
  FeatureCard,
  ModuleCard,
  PricingGrid,
  ProductMockup,
  publicModules,
  PublicFooter,
  PublicHeader,
  Reveal,
  SectionTitle,
} from "@/components/public/marketing";

function HeroAtmosphere() {
  return (
    <div aria-hidden className="cf-hero-atmosphere">
      <span className="cf-hero-noise" />
      <span className="cf-hero-glow cf-hero-glow-primary" />
      <span className="cf-hero-glow cf-hero-glow-secondary" />
      <span className="cf-hero-glow cf-hero-glow-accent" />

      <span className="cf-hero-arc cf-hero-arc-one" />
      <span className="cf-hero-arc cf-hero-arc-two" />

      <span className="cf-flow-track cf-flow-track-one"><span className="cf-flow-node cf-flow-node-one" /></span>
      <span className="cf-flow-track cf-flow-track-two"><span className="cf-flow-node cf-flow-node-two" /></span>
      <span className="cf-flow-track cf-flow-track-three"><span className="cf-flow-node cf-flow-node-three" /></span>
      <span className="cf-flow-track cf-flow-track-four"><span className="cf-flow-node cf-flow-node-four" /></span>
      <span className="cf-flow-track cf-flow-track-five"><span className="cf-flow-node cf-flow-node-five" /></span>
      <span className="cf-flow-track cf-flow-track-six"><span className="cf-flow-node cf-flow-node-six" /></span>
      <span className="cf-flow-track cf-flow-track-seven"><span className="cf-flow-node cf-flow-node-seven" /></span>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conform Flow — Conformidade e tranquilidade para empresas reguladas" },
      {
        name: "description",
        content:
          "Plataforma SaaS enterprise para reduzir riscos, organizar documentos e equipamentos e chegar preparado em cada auditoria.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="min-h-screen bg-[#fbfcfe] text-slate-950">
      <PublicHeader />

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[linear-gradient(112deg,#fbfdff_0%,#f7fcff_34%,#ecfbff_64%,#f5f6ff_100%)]">
        {/* Grid overlay */}
        <div aria-hidden className="cf-hero-grid" />
        <HeroAtmosphere />
        <div aria-hidden className="cf-hero-bottom-fade" />

        {/* Institutional watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[42%] z-0 flex select-none justify-center overflow-hidden"
        >
          <span className="whitespace-nowrap bg-gradient-to-b from-slate-900/[0.05] to-transparent bg-clip-text text-[18vw] font-black leading-none tracking-[-0.06em] text-transparent md:text-[14vw]">
            conform.
          </span>
        </div>

        <div className="relative z-10 mx-auto grid max-w-[86rem] gap-12 px-5 pb-16 pt-16 md:pt-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:gap-16 lg:px-8 lg:pb-24 lg:pt-24">
          <Reveal className="cf-hero-sequence lg:pt-14">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-[0_10px_24px_-20px_rgba(6,182,212,0.6)] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              7 dias grátis · sem compromisso
            </div>
            <h1 className="text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950 md:text-[3.75rem]">
              Planos claros para crescer{" "}
              <span className="bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">
                com controle.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Comece gratuitamente por 7 dias e descubra como o Conform Flow simplifica a gestão da
              conformidade, dos documentos, equipamentos e qualificações.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="cf-public-cta group h-12 rounded-xl bg-slate-950 px-6 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)] hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Link
                  to="/cadastro"
                  search={{ plan: "profissional", interval: "monthly", checkout: undefined }}
                >
                  Testar grátis por 7 dias <ArrowRight className="cf-cta-arrow h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="cf-public-cta h-12 rounded-xl border-slate-200 bg-white px-6 shadow-sm hover:-translate-y-0.5"
              >
                <Link to="/planos">Ver planos e preços</Link>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              {[
                "7 dias gratuitos",
                "Cancele quando quiser",
                "Ativação imediata",
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-2">
                  {index > 0 && <span aria-hidden className="text-slate-300">{"\u00B7"}</span>}
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Enlarged mockup */}
          <Reveal delay={120} className="relative lg:pr-5 xl:pr-8">
            <div className="cf-product-stage cf-hero-product-stage">
              <span aria-hidden className="cf-hero-product-halo" />
              <div aria-hidden className="cf-hero-context cf-hero-context-a">
                <div className="cf-hero-context-card">
                  <ShieldCheck className="h-4 w-4 text-cyan-700" />
                  <span>
                    <strong>Pronto para auditoria</strong>
                    <small>Ambiente monitorado</small>
                  </span>
                </div>
              </div>
              <div aria-hidden className="cf-hero-context cf-hero-context-b">
                <div className="cf-hero-context-card">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    <strong>92% de conformidade</strong>
                    <small>Indicador atualizado</small>
                  </span>
                </div>
              </div>
              <div aria-hidden className="cf-hero-context cf-hero-context-c">
                <div className="cf-hero-context-card">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>
                    <strong>{"3 vencimentos pr\u00f3ximos"}</strong>
                    <small>{"A\u00e7\u00e3o recomendada"}</small>
                  </span>
                </div>
              </div>
              <div className="relative z-10"><ProductMockup /></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BENEFITS — single focused section */}
      <section id="beneficios" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <SectionTitle
              align="center"
              eyebrow="Por que Conform Flow"
              title="Menos risco. Menos retrabalho. Mais tempo para o que importa."
              description="Substitua planilhas, e-mails e lembretes manuais por uma operação de conformidade previsível e auditável."
            />
          </Reveal>
          <Reveal delay={60} className="mt-12">
            <div className="cf-stagger-grid grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {benefitCards.map((item) => (
                <FeatureCard key={item.title} {...item} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* MODULES */}
      <section id="modulos" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <SectionTitle
              align="center"
              eyebrow="Módulos"
              title="Uma plataforma completa para operações reguladas."
              description="Do dashboard executivo à rastreabilidade de auditoria — tudo integrado, sem trocar de sistema."
            />
          </Reveal>
          <Reveal delay={60} className="mt-12">
            <div className="cf-stagger-grid grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {publicModules.map((module) => (
                <ModuleCard key={module.title} {...module} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <SectionTitle
              align="center"
              eyebrow="Planos"
              title="Comece grátis. Evolua no seu ritmo."
              description="Experimente todos os recursos por 7 dias, sem compromisso e sem precisar falar com vendas."
            />
          </Reveal>
          <Reveal delay={60} className="mt-12">
            <PricingGrid compact />
          </Reveal>
          <Reveal delay={120} className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="cf-public-cta rounded-xl bg-white">
              <Link to="/planos">
                Comparar todos os recursos <ArrowRight className="cf-cta-arrow h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <FAQSection />
      <CtaSection />
      <PublicFooter />
    </main>
  );
}
