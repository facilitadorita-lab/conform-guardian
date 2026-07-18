import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FileWarning, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  benefitCards,
  CtaSection,
  FAQSection,
  FeatureCard,
  ModuleCard,
  PricingGrid,
  ProcessSteps,
  ProductMockup,
  publicModules,
  PublicFooter,
  PublicHeader,
  SectionTitle,
  SecurityBand,
} from "@/components/public/marketing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conform Flow — Gestão de conformidade operacional" },
      {
        name: "description",
        content:
          "SaaS B2B para centralizar documentos, equipamentos, vencimentos, auditoria e conformidade em empresas reguladas.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="min-h-screen bg-[#fbfcfe] text-slate-950">
      <PublicHeader />

      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_12%_4%,rgba(14,165,233,0.13),transparent_30%),linear-gradient(180deg,#f7faff_0%,#fbfcfe_80%)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,41,71,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,41,71,0.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-24 md:py-28 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-white/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-[0_10px_24px_-20px_rgba(15,41,71,0.65)] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              SaaS para empresas reguladas
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-slate-950 md:text-[4.25rem]">
              Tranquilidade para operar. Evidência para auditar.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              O Conform Flow organiza documentos, prazos, equipamentos e evidências para que sua
              empresa regulada reduza riscos e chegue preparada a cada auditoria.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-xl bg-slate-950 px-6 text-white shadow-[0_18px_35px_-24px_rgba(15,23,42,0.75)] hover:-translate-y-0.5 hover:bg-slate-800"
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
                <Link to="/planos">Conhecer planos</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-12 rounded-xl px-6 text-slate-600 hover:bg-white hover:text-slate-950"
              >
                <Link to="/login" search={{ msg: undefined }}>
                  Entrar
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              {[
                "Dados separados por empresa",
                "Alertas de vencimento",
                "Auditoria e histórico",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <ProductMockup />
        </div>
      </section>

      <section id="recursos" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle
            eyebrow="Problema resolvido"
            title="Saia do controle manual e enxergue o risco antes da auditoria."
            description="O Conform Flow organiza o que costuma ficar espalhado em pastas, planilhas, e-mails e lembretes manuais."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Vencimentos sem controle",
                description:
                  "Veja prazos críticos e próximos vencimentos sem depender de conferência manual.",
                icon: FileWarning,
              },
              {
                title: "Documentos espalhados",
                description:
                  "Centralize evidências, versões e responsáveis no ambiente do cliente correto.",
                icon: ShieldCheck,
              },
              ...benefitCards.slice(0, 2),
            ].map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle
            align="center"
            eyebrow="Benefícios"
            title="Clareza operacional para quem precisa provar conformidade."
            description="Uma plataforma para acompanhar rotinas críticas com menos ruído, mais rastreabilidade e visão executiva."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {benefitCards.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section id="modulos" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle
            eyebrow="Módulos"
            title="Tudo que importa para controlar conformidade operacional."
            description="Cada módulo foi pensado para reduzir falhas, organizar evidências e dar visibilidade ao gestor."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {publicModules.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle
            align="center"
            eyebrow="Como funciona"
            title="Da implantação ao acompanhamento diário em quatro passos."
            description="O fluxo foi desenhado para começar simples e ganhar profundidade conforme a empresa amadurece a operação."
          />
          <div className="mt-10">
            <ProcessSteps />
          </div>
        </div>
      </section>

      <SecurityBand />

      <section id="planos" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <SectionTitle
              eyebrow="Planos"
              title="Escolha o nível de controle ideal para sua operação."
              description="Comece com documentos e evolua para equipamentos, manutenções e visão multiunidade."
            />
            <Button asChild variant="outline" className="rounded-xl bg-white">
              <Link to="/planos">
                Ver detalhes dos planos <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <PricingGrid compact />
        </div>
      </section>

      <FAQSection />
      <CtaSection />
      <PublicFooter />
    </main>
  );
}
