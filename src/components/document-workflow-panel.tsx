import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileSignature, Loader2, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { professionalService } from "@/services";
import { formatDateTimeBR } from "@/utils/date";

export function DocumentWorkflowPanel({ companyId, documentId, canWrite }: { companyId: string; documentId: string; canWrite: boolean }) {
  const client = useQueryClient();
  const queryKey = ["professional", "document-workflow", companyId, documentId];
  const query = useQuery({ queryKey, queryFn: () => professionalService.documentWorkflow(companyId, documentId) });
  const [comment, setComment] = useState("");
  const [statement, setStatement] = useState("Confirmo que revisei os dados desta versão e aprovo o documento.");
  const refresh = () => client.invalidateQueries({ queryKey });
  const submit = useMutation({ mutationFn: () => professionalService.submitDocument(companyId, documentId, comment), onSuccess: refresh });
  const decide = useMutation({ mutationFn: (decision: "aprovado" | "reprovado") => professionalService.decideDocument(companyId, query.data!.revisoes[0].id, decision, comment, decision === "aprovado" ? statement : undefined), onSuccess: refresh });
  const status = query.data?.documento?.workflow_status ?? "rascunho";
  const pending = query.data?.revisoes.find((item) => item.status === "em_aprovacao");
  return (
    <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><FileSignature className="h-4 w-4 text-accent" /> Aprovação e assinatura</div>
        <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold uppercase">{status.replaceAll("_", " ")}</span>
      </div>
      {pending ? <p className="mt-2 text-xs text-muted-foreground">Versão {pending.numero_versao} enviada em {formatDateTimeBR(pending.created_at)}. Hash: {pending.conteudo_hash.slice(0, 12)}…</p> : null}
      {canWrite ? (
        <div className="mt-3 space-y-2">
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={pending ? "Comentário da decisão" : "Comentário para os aprovadores"} className="min-h-16 w-full rounded-xl border border-input bg-background p-3 text-xs" />
          {pending ? <input value={statement} onChange={(event) => setStatement(event.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs" aria-label="Declaração de assinatura" /> : null}
          <div className="flex flex-wrap gap-2">
            {!pending ? <Button type="button" size="sm" onClick={() => submit.mutate()} disabled={submit.isPending}><Send className="h-4 w-4" /> Enviar para aprovação</Button> : <>
              <Button type="button" size="sm" variant="outline" onClick={() => decide.mutate("reprovado")} disabled={decide.isPending || comment.trim().length < 5}><XCircle className="h-4 w-4" /> Rejeitar</Button>
              <Button type="button" size="sm" onClick={() => decide.mutate("aprovado")} disabled={decide.isPending || statement.trim().length < 10}><CheckCircle2 className="h-4 w-4" /> Aprovar e assinar</Button>
            </>}
            {submit.isPending || decide.isPending ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : null}
          </div>
        </div>
      ) : null}
      {submit.error || decide.error || query.error ? <p className="mt-2 text-xs text-danger">{(submit.error ?? decide.error ?? query.error)?.message}</p> : null}
      {(query.data?.revisoes.length ?? 0) > 0 ? <div className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">{query.data?.revisoes.length} versão(ões) preservada(s) na trilha.</div> : null}
    </div>
  );
}
