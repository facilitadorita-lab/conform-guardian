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
  SectionTitle,
} from "@/components/public/marketing";

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
      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_15%_-10%,rgba(6,182,212,0.18),transparent_45%),radial-gradient(circle_at_100%_20%,rgba(59,130,246,0.12),transparent_45%),linear-gradient(180deg,#f6faff_0%,#fbfcfe_80%)]">
        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,41,71,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,41,71,0.04)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />

        {/* Institutional watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[42%] flex select-none justify-center overflow-hidden"
        >
          <span className="whitespace-nowrap bg-gradient-to-b from-slate-900/[0.05] to-transparent bg-clip-text text-[18vw] font-black leading-none tracking-[-0.06em] text-transparent md:text-[14vw]">
            conform.
          </span>
        </div>

        <div className="relative mx-auto grid max-w-[86rem] gap-12 px-5 pb-16 pt-16 md:pt-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-24 lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-[0_10px_24px_-20px_rgba(6,182,212,0.6)] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Plataforma enterprise de conformidade
            </div>
            <h1 className="text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950 md:text-[3.75rem]">
              Conformidade sem sobressaltos.{" "}
              <span className="bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">
                Auditorias tranquilas.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Antecipe vencimentos, organize evidências e chegue preparado em cada fiscalização.
              O Conform Flow tira sua operação regulada do improviso e coloca em uma rotina segura,
              rastreável e sob controle.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-xl bg-slate-950 px-6 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)] hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <a href="mailto:comercial@conformflow.com.br?subject=Solicitar demonstração Conform Flow">
                  Solicitar demonstração <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border-slate-200 bg-white px-6 shadow-sm hover:-translate-y-0.5"
              >
                <Link to="/planos">Ver planos e preços</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              {[
                "Redução real de riscos operacionais",
                "Alertas antes do vencimento",
                "Evidências prontas para o fiscal",
                "Histórico completo e rastreável",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Enlarged mockup */}
          <div className="relative lg:-mr-6 xl:-mr-16">
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* BENEFITS — single focused section */}
      <section id="beneficios" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle
            align="center"
            eyebrow="Por que Conform Flow"
            title="Menos risco. Menos retrabalho. Mais tempo para o que importa."
            description="Substitua planilhas, e-mails e lembretes manuais por uma operação de conformidade previsível e auditável."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefitCards.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modulos" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle
            align="center"
            eyebrow="Módulos"
            title="Uma plataforma completa para operações reguladas."
            description="Do dashboard executivo à rastreabilidade de auditoria — tudo integrado, sem trocar de sistema."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {publicModules.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle
            align="center"
            eyebrow="Planos"
            title="Comece pequeno. Escale quando precisar."
            description="Do controle documental à gestão multiunidade — escolha o nível de controle ideal para o momento da sua operação."
          />
          <div className="mt-12" />
          <PricingGrid compact />
          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="rounded-xl bg-white">
              <Link to="/planos">
                Comparar todos os recursos <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <FAQSection />
      <CtaSection />
      <PublicFooter />
    </main>
  );
}
