import { BadgeCheck, CalendarClock, ClipboardCheck, FileStack, QrCode, ShieldCheck, Wrench } from "lucide-react";
import type { EquipamentoDetalhe } from "@/services/equipamentosService";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";
import { cn } from "@/lib/utils";

export function EquipmentPassport({ equipment }: { equipment: EquipamentoDetalhe }) {
  const calibration = current(equipment.calibracoes);
  const qualification = current(equipment.qualificacoes);
  const maintenance = current(equipment.manutencoes);
  const attachments = equipment.anexos.filter((item) => !item.arquivado && item.anexoStatus !== "substituido").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-primary/10 px-5 py-4">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><QrCode className="h-5 w-5" /></div><div><p className="text-sm font-semibold">Passaporte digital do equipamento</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Identificação, situação operacional e rastreabilidade em uma única ficha segura.</p></div></div>
        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", equipment.status === "ok" ? "border-success/25 bg-success/10 text-success" : equipment.status === "atencao" ? "border-warning/30 bg-warning/10 text-warning" : "border-danger/30 bg-danger/10 text-danger")}><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />{statusLabel(equipment.status)}</span>
      </div>
      <div className="grid gap-px bg-border/60 md:grid-cols-2 xl:grid-cols-4">
        <PassportItem icon={BadgeCheck} label="Identificação" value={equipment.codigo} helper={`${equipment.fabricante} · ${equipment.modelo}`} />
        <PassportItem icon={CalendarClock} label="Próxima calibração" value={calibration?.data ? formatDateBR(calibration.data) : "Não registrada"} helper={calibration?.descricao ?? "Cadastre o certificado vigente"} href={`/equipamentos/${equipment.id}?tab=Calibrações`} />
        <PassportItem icon={ClipboardCheck} label="Qualificação vigente" value={qualification?.data ? formatDateBR(qualification.data) : "Não registrada"} helper={qualification?.descricao ?? "Acompanhe a qualificação aplicável"} href={`/equipamentos/${equipment.id}?tab=Qualificações`} />
        <PassportItem icon={Wrench} label="Manutenção" value={maintenance?.data ? formatDateBR(maintenance.data) : "Não registrada"} helper={maintenance?.descricao ?? "Preventiva ou corretiva"} href={`/equipamentos/${equipment.id}?tab=Manutenções`} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-muted-foreground"><span>Setor: <strong className="text-foreground">{equipment.setor}</strong> · criticidade: <strong className="text-foreground">{equipment.criticidade}</strong></span><a href={`/equipamentos/${equipment.id}?tab=Anexos`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"><FileStack className="h-3.5 w-3.5" />{attachments} evidência(s) ativa(s)</a></div>
    </section>
  );
}

function PassportItem({ icon: Icon, label, value, helper, href }: { icon: typeof QrCode; label: string; value: string; helper: string; href?: string }) {
  const content = <><Icon className="h-4 w-4 text-primary" /><div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</div><div className="mt-1 truncate text-sm font-semibold">{value}</div><div className="mt-1 truncate text-[11px] text-muted-foreground">{helper}</div></div></>;
  return href ? <a href={href} className="flex min-w-0 gap-3 bg-card px-4 py-4 outline-none cf-transition hover:bg-primary/[0.03] focus-visible:ring-4 focus-visible:ring-primary/15">{content}</a> : <div className="flex min-w-0 gap-3 bg-card px-4 py-4">{content}</div>;
}

function current<T extends { arquivado?: boolean; vigente?: boolean | null }>(items: T[]) { return items.find((item) => item.vigente !== false && !item.arquivado) ?? items.find((item) => !item.arquivado); }
