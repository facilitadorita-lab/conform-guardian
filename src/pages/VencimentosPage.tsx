import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  List,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { useUnitContext } from "@/hooks/use-unit-context";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { vencimentosService, type VencimentoConsolidado, type VencimentoModulo } from "@/services";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

type FiltroPeriodo = "todos" | "vencidos" | "7" | "30" | "60";
type FiltroModulo = "todos" | VencimentoModulo;

export function VencimentosPage() {
  const { selectedCompanyId: empresaId } = useSession();
  const {
    unidadeAtualId,
    visaoConsolidada,
    carregando: carregandoUnidades,
  } = useUnitContext();
  const [periodo, setPeriodo] = useState<FiltroPeriodo>("todos");
  const [modulo, setModulo] = useState<FiltroModulo>("todos");
  const [busca, setBusca] = useState("");
  const [visualizacao, setVisualizacao] = useState<"lista" | "calendario">("lista");

  const {
    data: vencimentos = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["vencimentos", empresaId, unidadeAtualId ?? "consolidado"],
    queryFn: () => vencimentosService.listar(empresaId!, unidadeAtualId),
    enabled: Boolean(empresaId) && !carregandoUnidades,
  });

  const filtrados = useMemo(
    () =>
      vencimentos.filter((item) => {
        const porModulo = modulo === "todos" || item.modulo === modulo;
        const porPeriodo = correspondePeriodo(item, periodo);
        const termo = normalizar(busca);
        const porBusca =
          !termo ||
          normalizar(
            [item.titulo, item.subtitulo, item.responsavel, item.modulo].join(" "),
          ).includes(termo);

        return porModulo && porPeriodo && porBusca;
      }),
    [busca, modulo, periodo, vencimentos],
  );

  const resumo = {
    vencidos: vencimentos.filter((item) => item.diasRestantes < 0).length,
    sete: vencimentos.filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= 7).length,
    trinta: vencimentos.filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= 30)
      .length,
    sessenta: vencimentos.filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= 60)
      .length,
  };

  return (
    <AppShell
      title="Central de Vencimentos"
      description={
        visaoConsolidada
          ? "Visão consolidada de documentos, equipamentos e manutenções por prioridade de prazo."
          : "Vencimentos da unidade selecionada e documentos corporativos aplicáveis."
      }
    >
      <div className="grid gap-3 md:grid-cols-4">
        <ResumoCard label="Vencidos" value={resumo.vencidos} tone="vencido" icon={AlertTriangle} />
        <ResumoCard label="Até 7 dias" value={resumo.sete} tone="critico" icon={Clock} />
        <ResumoCard label="Até 30 dias" value={resumo.trinta} tone="atencao" icon={CalendarClock} />
        <ResumoCard label="Até 60 dias" value={resumo.sessenta} tone="ok" icon={CheckCircle2} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por item, responsável, módulo..."
            className="h-9 min-w-[240px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value as FiltroPeriodo)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="todos">Todos os prazos</option>
            <option value="vencidos">Vencidos</option>
            <option value="7">Vencendo em 7 dias</option>
            <option value="30">Vencendo em 30 dias</option>
            <option value="60">Vencendo em 60 dias</option>
          </select>
          <select
            value={modulo}
            onChange={(event) => setModulo(event.target.value as FiltroModulo)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="todos">Todos os módulos</option>
            <option value="documentos">Documentos</option>
            <option value="equipamentos">Equipamentos</option>
            <option value="manutencoes">Manutenções</option>
          </select>
          <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted">
            <Filter className="h-4 w-4" /> Filtros
          </button>
          <div className="ml-auto flex items-center rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setVisualizacao("lista")}
              className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold ${visualizacao === "lista" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <List className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              type="button"
              onClick={() => setVisualizacao("calendario")}
              className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold ${visualizacao === "calendario" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> CalendÃ¡rio
            </button>
          </div>
        </div>

        {visualizacao === "calendario" ? (
          <CalendarioVencimentos items={filtrados} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-6 py-2.5 text-left font-medium">Item</th>
                  <th className="px-4 py-2.5 text-left font-medium">Módulo</th>
                  <th className="px-4 py-2.5 text-left font-medium">Responsável</th>
                  <th className="px-4 py-2.5 text-left font-medium">Vencimento</th>
                  <th className="px-4 py-2.5 text-left font-medium">Prazo</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-6 py-2.5 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isError && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-3 text-sm text-danger">
                        <AlertTriangle className="h-6 w-6" />
                        <span>
                          {error instanceof Error
                            ? error.message
                            : "Não foi possível carregar os vencimentos."}
                        </span>
                        <button
                          type="button"
                          onClick={() => void refetch()}
                          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-medium text-accent hover:bg-muted"
                        >
                          <RefreshCw className="h-4 w-4" /> Tentar novamente
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {filtrados.map((item) => (
                  <LinhaVencimento key={`${item.modulo}-${item.id}`} item={item} />
                ))}
                {!isLoading && !isError && filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhum vencimento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-muted-foreground"
                    >
                      Carregando vencimentos consolidados...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CalendarioVencimentos({ items }: { items: VencimentoConsolidado[] }) {
  const month = new Date();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const byDay = new Map<number, VencimentoConsolidado[]>();
  for (const item of items) {
    const date = new Date(`${item.vencimento}T00:00:00`);
    if (date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()) {
      byDay.set(date.getDate(), [...(byDay.get(date.getDate()) ?? []), item]);
    }
  }
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <CalendarDays className="h-4 w-4 text-accent" />{" "}
        {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        <div className="contents">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
            <div
              key={day}
              className="bg-muted/60 p-2 text-center text-[10px] font-semibold uppercase text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>
        {Array.from({ length: offset + days }, (_, index) => {
          const day = index - offset + 1;
          const dayItems = day > 0 ? (byDay.get(day) ?? []) : [];
          return (
            <div key={index} className={`min-h-24 bg-card p-2 ${day <= 0 ? "bg-muted/20" : ""}`}>
              <div className="text-xs font-semibold text-muted-foreground">
                {day > 0 ? day : ""}
              </div>
              <div className="mt-1 space-y-1">
                {dayItems.slice(0, 3).map((item) => (
                  <Link
                    key={`${item.modulo}-${item.id}`}
                    to={item.link as never}
                    className={`block truncate rounded-md px-1.5 py-1 text-[10px] font-medium ${item.status === "vencido" ? "bg-danger/10 text-danger" : item.status === "critico" ? "bg-warning/15 text-warning" : "bg-accent/10 text-accent"}`}
                    title={item.titulo}
                  >
                    {item.titulo}
                  </Link>
                ))}
                {dayItems.length > 3 ? (
                  <div className="text-[10px] text-muted-foreground">
                    +{dayItems.length - 3} itens
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {items.length > 0 && byDay.size === 0 ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Os itens filtrados estão fora do mês atual. Use a visualização em lista para consultar
          todos.
        </p>
      ) : null}
    </div>
  );
}

function correspondePeriodo(item: VencimentoConsolidado, periodo: FiltroPeriodo): boolean {
  if (periodo === "todos") return true;
  if (periodo === "vencidos") return item.diasRestantes < 0;
  return item.diasRestantes >= 0 && item.diasRestantes <= Number(periodo);
}

function LinhaVencimento({ item }: { item: VencimentoConsolidado }) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-6 py-3">
        <div className="font-medium">{item.titulo}</div>
        <div className="text-xs text-muted-foreground">{item.subtitulo}</div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{labelModulo(item.modulo)}</td>
      <td className="px-4 py-3 text-muted-foreground">{item.responsavel}</td>
      <td className="px-4 py-3 tabular-nums">{formatDateBR(item.vencimento)}</td>
      <td className="px-4 py-3">{labelPrazo(item.diasRestantes)}</td>
      <td className="px-4 py-3">
        <StatusBadge tone={item.status}>{statusLabel(item.status)}</StatusBadge>
      </td>
      <td className="px-6 py-3 text-right">
        <Link
          to={item.link as never}
          className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs font-medium text-accent hover:bg-muted"
        >
          Abrir origem
        </Link>
      </td>
    </tr>
  );
}

function ResumoCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "ok" | "atencao" | "critico" | "vencido";
  icon: typeof AlertTriangle;
}) {
  const color = {
    ok: "text-success",
    atencao: "text-warning",
    critico: "text-danger",
    vencido: "text-danger",
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function labelModulo(modulo: VencimentoModulo): string {
  return {
    documentos: "Documentos",
    equipamentos: "Equipamentos",
    manutencoes: "Manutenções",
  }[modulo];
}

function labelPrazo(dias: number): string {
  if (dias < 0) return `${Math.abs(dias)} dia(s) vencido`;
  if (dias === 0) return "Vence hoje";
  if (dias >= 9999) return "Sem validade";
  return `Em ${dias} dia(s)`;
}

function normalizar(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}
