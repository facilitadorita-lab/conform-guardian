import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AddOn,
  CtaSection,
  PricingGrid,
  PublicFooter,
  PublicHeader,
  SectionTitle,
} from "@/components/public/marketing";

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
                Comece com documentos e alertas. Evolua para equipamentos, manutenções,
                qualificações e visão multiunidade quando sua operação precisar.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-12 rounded-xl bg-slate-950 px-6 text-white hover:bg-slate-800"
                >
                  <a href="mailto:comercial@conformflow.com.br?subject=Quero contratar o Conform Flow">
                    Falar com especialista <ArrowRight className="h-4 w-4" />
                  </a>
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
                <AddOn title="Usuário extra" price="R$ 29,90/mês" />
                <AddOn title="Unidade extra" price="R$ 59,90/mês" />
              </div>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Os bloqueios por plano são aplicados no backend para refletir corretamente no
                frontend e proteger o ambiente de cada cliente.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            align="center"
            eyebrow="Comparativo"
            title="Escolha o plano pelo nível de maturidade da operação."
            description="A precificação foi pensada para entrada acessível e crescimento por módulos, usuários e unidades."
          />
          <div className="mt-12">
            <PricingGrid />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="O que cada plano destrava"
            title="Permissões comerciais conectadas ao uso real da plataforma."
            description="A experiência do cliente muda conforme o plano: o que não está contratado fica bloqueado de forma clara."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              ["Essencial", ["Dashboard completo", "IA", "Documentos", "Anexos", "Alertas"]],
              [
                "Completo",
                [
                  "Tudo do Essencial",
                  "Equipamentos",
                  "Calibrações",
                  "Qualificações",
                  "Manutenções",
                ],
              ],
              [
                "Plano Rede",
                [
                  "Tudo do Completo",
                  "Até 3 unidades",
                  "Visão multiunidade",
                  "Relatórios por unidade",
                ],
              ],
            ].map(([name, features]) => (
              <article
                key={name as string}
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <h3 className="text-lg font-semibold text-slate-950">{name}</h3>
                <div className="mt-5 space-y-3">
                  {(features as string[]).map((feature) => (
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

      <CtaSection />
      <PublicFooter />
    </main>
  );
}
