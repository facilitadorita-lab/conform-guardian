import { AlertTriangle, LogOut, ShieldHalf, Mail, Phone } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { shouldUseMocks } from "@/lib/runtime-config";

const motivos: Record<string, { titulo: string; texto: string }> = {
  inadimplente: {
    titulo: "Assinatura em atraso",
    texto:
      "Identificamos uma fatura em aberto para a sua empresa. Regularize o pagamento para restabelecer o acesso à plataforma.",
  },
  suspensa: {
    titulo: "Conta suspensa",
    texto:
      "O acesso da sua empresa está temporariamente suspenso. Entre em contato com o time de suporte para regularizar a situação.",
  },
  bloqueada: {
    titulo: "Conta bloqueada",
    texto:
      "O acesso operacional foi bloqueado. Nenhum dado será exibido até que a pendência seja regularizada.",
  },
  cancelada: {
    titulo: "Assinatura cancelada",
    texto:
      "A assinatura da sua empresa foi cancelada. Para reativar, entre em contato com o time comercial.",
  },
};

export function AccessBlocked() {
  const { empresaAtual } = useSession();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const info = motivos[empresaAtual.status] ?? motivos.bloqueada;
  const bypassAuth = shouldUseMocks();

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto flex items-center gap-3 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldHalf className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Conform Flow</div>
            <div className="text-[11px] text-muted-foreground">Acesso restrito</div>
          </div>
          <div className="ml-auto">
            <button
              onClick={async () => {
                if (!bypassAuth) await signOut();
                navigate({ to: "/login", search: { msg: undefined } });
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-start gap-4 border-b border-border bg-danger/5 px-6 py-5">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {info.titulo}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{info.texto}</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <Info k="Empresa" v={empresaAtual.razao_social} />
              <Info k="CNPJ" v={empresaAtual.cnpj} />
              <Info k="Plano" v={empresaAtual.plano} />
              <Info k="Status" v={empresaAtual.status.toUpperCase()} />
            </div>

            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              Enquanto a situação não for regularizada, o acesso ao dashboard, aos módulos
              operacionais e aos dados da empresa permanece bloqueado. Nenhuma informação sensível é
              carregada nesta tela.
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href="mailto:financeiro@conformflow.com"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Mail className="h-4 w-4" /> Falar com o financeiro
              </a>
              <a
                href="tel:+551140000000"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
              >
                <Phone className="h-4 w-4" /> Suporte comercial
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 font-medium">{v}</dd>
    </div>
  );
}
