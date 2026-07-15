import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Building2,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useAuthContext } from "@/hooks/use-conform-data";
import { assistantService } from "@/services";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sourcesCount?: number;
};

const ASSISTANT_NAME = "FlowIA";

const sugestoes = [
  "Quando vence meu AVCB?",
  "Quantos equipamentos estão para calibrar?",
  "Quais manutenções estão vencidas?",
  "Quais qualificações vencem nos próximos 30 dias?",
];

export function FloatingAssistant() {
  const { data: authContext } = useAuthContext();
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const empresa = authContext?.empresaAtual;
  const podeEnviar = Boolean(empresa?.id && pergunta.trim() && !enviando);

  const placeholder = useMemo(() => {
    if (!empresa) return "Selecione uma empresa para conversar com o FlowIA...";
    return `Pergunte sobre ${empresa.nome}`;
  }, [empresa]);

  async function enviarPergunta(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
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
        error instanceof Error ? error.message : "Não foi possível consultar o FlowIA agora.";
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

  function usarSugestao(sugestao: string) {
    setPergunta(sugestao);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {aberto ? (
        <section className="flex h-[min(680px,calc(100vh-7rem))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b border-border bg-gradient-to-br from-primary to-slate-900 px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{ASSISTANT_NAME}</div>
                <div className="text-[11px] text-sidebar-foreground/70">
                  Assistente seguro de conformidade
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
              aria-label="Fechar FlowIA"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="border-b border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-3.5 w-3.5 text-accent" />
              <div>
                Consultando apenas dados de{" "}
                <span className="font-semibold text-foreground">
                  {empresa?.nome ?? "empresa selecionada"}
                </span>
                {empresa?.cnpj ? <span> · CNPJ {empresa.cnpj}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4">
            {mensagens.length === 0 ? (
              <div className="flex min-h-full flex-col justify-between gap-5">
                <div className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-950">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p>
                      O {ASSISTANT_NAME} responde apenas sobre dados estruturados. Ele não lê
                      anexos, PDFs, imagens ou documentos confidenciais.
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Bot className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium">Como posso ajudar hoje?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pergunte sobre vencimentos, manutenções, equipamentos, documentos e pendências.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sugestoes.map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      onClick={() => usarSugestao(sugestao)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              mensagens.map((mensagem) => (
                <article
                  key={mensagem.id}
                  className={`flex ${mensagem.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                      mensagem.role === "user"
                        ? "bg-sidebar text-sidebar-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{mensagem.content}</p>
                  </div>
                </article>
              ))
            )}

            {enviando ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  FlowIA consultando dados...
                </div>
              </div>
            ) : null}
          </div>

          {erro ? (
            <div className="border-t border-border px-4 py-2 text-xs text-danger">{erro}</div>
          ) : null}

          <form onSubmit={enviarPergunta} className="flex gap-2 border-t border-border p-3">
            <input
              value={pergunta}
              onChange={(event) => setPergunta(event.target.value)}
              placeholder={placeholder}
              className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              disabled={enviando}
            />
            <button
              type="submit"
              disabled={!podeEnviar}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Enviar pergunta para o FlowIA"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-4 ring-primary/15 cf-transition hover:-translate-y-0.5 hover:bg-primary/90"
        aria-label="Abrir FlowIA"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -left-28 hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm group-hover:block">
          FlowIA
        </span>
      </button>
    </div>
  );
}
