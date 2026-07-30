import { Building, ChevronsUpDown, Layers3 } from "lucide-react";
import { useUnitContext } from "@/hooks/use-unit-context";
import { cn } from "@/lib/utils";

export function UnitSwitcher({ compact = false }: { compact?: boolean }) {
  const {
    unidadeAtualId,
    unidadesPermitidas,
    podeVisualizarConsolidado,
    carregando,
    selecionarUnidade,
  } = useUnitContext();

  if (carregando) {
    return (
      <div className="h-10 w-[190px] animate-pulse rounded-xl border border-border bg-muted/60" />
    );
  }

  if (unidadesPermitidas.length === 0) return null;

  return (
    <label
      className={cn(
        "relative flex h-10 items-center gap-2 rounded-[11px] border border-border/70 bg-white px-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        compact ? "w-full" : "min-w-[190px] max-w-[250px]",
      )}
    >
      {unidadeAtualId === null ? (
        <Layers3 className="h-4 w-4 shrink-0 text-accent" />
      ) : (
        <Building className="h-4 w-4 shrink-0 text-accent" />
      )}
      <span className="sr-only">Unidade atual</span>
      <select
        value={unidadeAtualId ?? "consolidado"}
        onChange={(event) => {
          const value = event.target.value;
          void selecionarUnidade(value === "consolidado" ? null : value);
        }}
        className="min-w-0 flex-1 appearance-none bg-transparent pr-5 text-xs font-semibold outline-none"
        aria-label="Selecionar unidade operacional"
      >
        {podeVisualizarConsolidado ? (
          <option value="consolidado">Visão consolidada</option>
        ) : null}
        {unidadesPermitidas
          .filter((unit) => unit.status !== "arquivada")
          .map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.is_matriz ? "Matriz · " : ""}
              {unit.nome}
              {unit.status === "inativa" ? " (inativa)" : ""}
            </option>
          ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-muted-foreground" />
    </label>
  );
}
