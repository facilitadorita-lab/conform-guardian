import { FileClock, Eye, PenLine, Upload, Archive, ShieldCheck } from "lucide-react";
import type { EvidenciaTimelineItem } from "@/services";

export function EvidenciasTimeline({
  items,
  isLoading,
}: {
  items: EvidenciaTimelineItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Carregando linha do tempo de evidências...
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
        Ainda não há eventos de evidência para este registro.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Linha do tempo de evidências</h3>
        <p className="text-xs text-muted-foreground">
          Uploads, substituições, visualizações e alterações ficam rastreados por registro.
        </p>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => {
          const Icon = iconByTipo(item.tipo);
          return (
            <div key={item.id} className="flex gap-3 p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.titulo}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.data).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.descricao}</p>
                <p className="mt-1 text-xs text-muted-foreground">Usuário: {item.usuario}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function iconByTipo(tipo: EvidenciaTimelineItem["tipo"]) {
  return {
    upload: Upload,
    substituicao: Archive,
    visualizacao: Eye,
    edicao: PenLine,
    arquivo: FileClock,
    sistema: ShieldCheck,
  }[tipo];
}
