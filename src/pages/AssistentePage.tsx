import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Building2, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuthContext } from "@/hooks/use-conform-data";
import { assistantService } from "@/services";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sourcesCount?: number;
};

const sugestoes = [
  "Quantos equipamentos estão para calibrar?",
  "Quando vence meu AVCB?",
  "Quais manutenções estão vencidas?",
  "Quais qualificações vencem nos próximos 30 dias?",
];

export function AssistentePage() {
  const { data: authContext } = useAuthContext();
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const empresa = authContext?.empresaAtual;
  const podeEnviar = Boolean(empresa?.id && pergunta.trim() && !enviando);

  const placeholder = useMemo(() => {
    if (!empresa) return "Carregando empresa...";
    return `Pergunte sobre ${empresa.nome}: documentos, equipamentos, manutenções, qualificações...`;
  }, [empresa]);

  async function enviarPergunta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texto = pergunta.trim();

    if (!empresa?.id || !texto) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: texto,
    };

    setPergunta("");
    setErro(null);
    setEnviando(true);
    setMensagens((atuais) => [...atuais, userMessage]);

    try {
      const resposta = await assistantService.perguntar(empresa.id, texto);
      const content =
        resposta.resposta ||
        resposta.answer ||
        "Não encontrei dados estruturados suficientes para responder essa pergunta.";
      const sourcesCount = resposta.fontes?.length ?? resposta.sources?.length ?? 0;

      setMensagens((atuais) => [
        ...atuais,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content,
          sourcesCount,
        },
      ]);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível consultar o Assistente IA agora.";
      setErro(mensagem);
      setMensagens((atuais) => [
        ...atuais,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Não consegui consultar os dados agora. Verifique a conexão com o Supabase e tente novamente.",
        },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell
      title="Assistente IA"
      description="Perguntas em linguagem natural sobre seus dados operacionais. Consulte vencimentos, pendências e status."
    >
      <section className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span>Consultando dados de</span>
          <strong>{empresa?.nome ?? "empresa selecionada"}</strong>
          {empresa?.cnpj ? <span className="text-blue-800">({empresa.cnpj})</span> : null}
        </div>
      </section>

      <section className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Este assistente responde <strong>apenas sobre dados estruturados do sistema</strong>.
            Ele não lê arquivos, PDFs, imagens ou documentos anexados.
          </p>
        </div>
      </section>

      <section className="flex min-h-[460px] flex-col rounded-xl border border-border bg-card shadow-sm">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {mensagens.length === 0 ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">
                Pergunte, por exemplo: “Quais documentos vencem nos próximos 30 dias?”
              </p>
              <div className="mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
                {sugestoes.map((sugestao) => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => setPergunta(sugestao)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            mensagens.map((mensagem) => (
              <div
                key={mensagem.id}
                className={`flex ${mensagem.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <article
                  className={`max-w-[780px] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    mensagem.role === "user"
                      ? "bg-sidebar text-sidebar-foreground"
                      : "border border-border bg-background text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{mensagem.content}</p>
                  {mensagem.role === "assistant" && mensagem.sourcesCount ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Baseado em {mensagem.sourcesCount} registro(s) estruturado(s).
                    </p>
                  ) : null}
                </article>
              </div>
            ))
          )}
        </div>

        {erro ? (
          <div className="border-t border-border px-5 py-2 text-xs text-danger">{erro}</div>
        ) : null}

        <form onSubmit={enviarPergunta} className="flex gap-3 border-t border-border p-4">
          <input
            value={pergunta}
            onChange={(event) => setPergunta(event.target.value)}
            placeholder={placeholder}
            className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            disabled={enviando}
          />
          <button
            type="submit"
            disabled={!podeEnviar}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
