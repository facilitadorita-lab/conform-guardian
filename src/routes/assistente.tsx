import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Sparkles, Loader2, Send, ShieldAlert, Building2 } from "lucide-react";
import { edgeFunctionsService } from "@/services";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/assistente")({
  head: () => ({ meta: [{ title: "Assistente IA — Conform Flow" }] }),
  component: AssistentePage,
});

type Msg = { role: "user" | "assistant"; content: string };

function AssistentePage() {
  const { empresaAtual } = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const pergunta = input.trim();
    if (!pergunta || loading) return;
    if (!empresaAtual?.id) {
      setErro("Selecione uma empresa antes de consultar a IA.");
      return;
    }
    setErro(null);
    const historico = msgs.map((m) => ({ role: m.role, content: m.content }));
    const nextMsgs: Msg[] = [...msgs, { role: "user", content: pergunta }];
    setMsgs(nextMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await edgeFunctionsService.assistantQuery({
        empresa_id: empresaAtual.id,
        pergunta,
        contexto: "geral",
        historico,
      });
      const resposta = res.resposta ?? res.answer ?? "";
      setMsgs([...nextMsgs, { role: "assistant", content: resposta }]);
    } catch (err) {
      console.error("assistant-query erro:", err);
      setErro("Não consegui consultar a IA agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Assistente IA"
      description="Perguntas em linguagem natural sobre seus dados operacionais. Consulte vencimentos, pendências e status."
    >
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs flex items-center gap-2">
        <Building2 className="h-4 w-4 text-accent" />
        <span>
          Consultando dados de <strong>{empresaAtual.nome_fantasia}</strong>{" "}
          <span className="text-muted-foreground">({empresaAtual.cnpj})</span>
        </span>
      </div>
      <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
        <span>
          Este assistente responde <strong>apenas sobre dados estruturados</strong> do sistema. Não é possível
          enviar arquivos, PDFs, imagens ou documentos para análise.
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="min-h-[320px] max-h-[520px] overflow-y-auto p-5 space-y-4">
          {msgs.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10">
              <Sparkles className="h-6 w-6 mx-auto mb-2 text-accent" />
              Pergunte, por exemplo: “Quais documentos vencem nos próximos 30 dias?”
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Consultando...
            </div>
          )}
        </div>
        {erro && <div className="px-5 pb-2 text-xs text-destructive">{erro}</div>}
        <form onSubmit={enviar} className="border-t border-border p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta sobre os dados do sistema..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> Enviar
          </button>
        </form>
      </div>
    </AppShell>
  );
}