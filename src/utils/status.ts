import type { StatusConformidade } from "@/types";

export function statusLabel(status: StatusConformidade) {
  return {
    vencido: "Vencido",
    critico: "Crítico",
    atencao: "Atenção",
    ok: "Em dia",
    sem_validade: "Sem validade",
  }[status];
}

export function statusTone(status: StatusConformidade) {
  return {
    vencido: "bg-danger/10 text-danger border-danger/30",
    critico: "bg-danger/10 text-danger border-danger/30",
    atencao: "bg-warning/10 text-warning border-warning/30",
    ok: "bg-success/10 text-success border-success/30",
    sem_validade: "bg-muted text-muted-foreground border-border",
  }[status];
}
