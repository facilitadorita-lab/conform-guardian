import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Clock3, Loader2, Mail, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { professionalService } from "@/services";
import { formatDateTimeBR } from "@/utils/date";

export function ScheduledReportsPanel({ companyId }: { companyId: string }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const queryKey = ["professional", "scheduled-reports", companyId];
  const query = useQuery({ queryKey, queryFn: () => professionalService.scheduledReports(companyId) });
  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => professionalService.saveScheduledReport(companyId, payload),
    onSuccess: () => { setOpen(false); void client.invalidateQueries({ queryKey }); },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    save.mutate({
      nome: String(data.get("nome") ?? "Relatório executivo recorrente"),
      tipo_relatorio: "executivo_ia",
      frequencia: String(data.get("frequencia") ?? "semanal"),
      horario: String(data.get("horario") ?? "08:00"),
      dia_semana: String(data.get("dia_semana") ?? "1"),
      dia_mes: String(data.get("dia_mes") ?? "1"),
      destinatarios: String(data.get("destinatarios") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      timezone: "America/Sao_Paulo",
      ativo: true,
    });
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 text-accent" />
          <div>
            <h2 className="text-sm font-semibold">Relatórios agendados</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Envio semanal ou mensal com dados estruturados da empresa selecionada.</p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo agendamento</Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(query.data?.agendamentos ?? []).map((schedule) => (
          <article key={schedule.id} className="rounded-2xl border border-border bg-muted/15 p-4">
            <div className="flex items-start justify-between gap-2">
              <div><h3 className="text-sm font-semibold">{schedule.nome}</h3><p className="mt-1 text-xs capitalize text-muted-foreground">{schedule.frequencia} · {schedule.horario.slice(0, 5)}</p></div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${schedule.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{schedule.ativo ? "Ativo" : "Pausado"}</span>
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground"><div><Clock3 className="mr-1 inline h-3.5 w-3.5" /> Próximo: {formatDateTimeBR(schedule.proxima_execucao_at)}</div><div><Mail className="mr-1 inline h-3.5 w-3.5" /> {schedule.destinatarios.join(", ")}</div></div>
          </article>
        ))}
        {!query.isLoading && !query.data?.agendamentos.length ? <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhum relatório recorrente configurado.</div> : null}
      </div>
      {(query.data?.ultimas_execucoes.length ?? 0) > 0 ? <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> Última execução: {formatDateTimeBR(query.data!.ultimas_execucoes[0].created_at)} · {query.data!.ultimas_execucoes[0].status}</div> : null}
      {query.error ? <p className="mt-3 text-xs text-danger">{query.error.message}</p> : null}
      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submit} className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"><div className="flex items-start justify-between border-b border-border p-5"><div><h2 className="text-lg font-semibold">Agendar relatório</h2><p className="mt-1 text-sm text-muted-foreground">O envio respeitará exclusivamente a empresa atual.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border p-2"><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5"><Field label="Nome" name="nome" defaultValue="Relatório executivo de conformidade" /><label className="text-xs font-semibold text-muted-foreground">Frequência<select name="frequencia" className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="semanal">Semanal</option><option value="mensal">Mensal</option></select></label><div className="grid grid-cols-3 gap-3"><Field label="Horário" name="horario" type="time" defaultValue="08:00" /><Field label="Dia semana" name="dia_semana" type="number" defaultValue="1" /><Field label="Dia mês" name="dia_mes" type="number" defaultValue="1" /></div><Field label="Destinatários (separados por vírgula)" name="destinatarios" type="text" required />{save.error ? <p className="text-xs text-danger">{save.error.message}</p> : null}</div><div className="flex justify-end gap-2 border-t border-border p-5"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Salvar agendamento</Button></div></form></div> : null}
    </section>
  );
}

function Field({ label, name, type = "text", defaultValue, required }: { label: string; name: string; type?: string; defaultValue?: string; required?: boolean }) {
  return <label className="text-xs font-semibold text-muted-foreground">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground" /></label>;
}
