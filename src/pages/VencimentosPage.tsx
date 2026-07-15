import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { vencimentosService, type VencimentoConsolidado, type VencimentoModulo } from "@/services";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

type FiltroPeriodo = "todos" | "vencidos" | "7" | "30" | "60";
type FiltroModulo = "todos" | VencimentoModulo;

export function VencimentosPage() {
  const { data: authContext } = useAuthContext();
  const empresaId = authContext?.empresaAtual.id;
  const [periodo, setPeriodo] = useState<FiltroPeriodo>("todos");
  const [modulo, setModulo] = useState<FiltroModulo>("todos");
  const [busca, setBusca] = useState("");

  const { data: vencimentos = [], isLoading } = useQuery({
    queryKey: ["vencimentos", empresaId],
    queryFn: () => vencimentosService.listar(empresaId!),
    enabled: Boolean(empresaId),
  });

  const filtrados = useMemo(
    () =>
      vencimentos.filter((item) => {
        const porModulo = modulo === "todos" || item.modulo === modulo;
        const porPeriodo = correspondePeriodo(item, periodo);
        const termo = normalizar(busca);
        const porBusca =
          !termo ||
          normalizar([item.titulo, item.subtitulo, item.responsavel, item.modulo].join(" ")).includes(
            termo,
          );

        return porModulo && porPeriodo && porBusca;
      }),
    [busca, modulo, periodo, vencimentos],
  );

  const resumo = {
    vencidos: vencimentos.filter((item) => item.diasRestantes < 0).length,
    sete: vencimentos.filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= 7).length,
    trinta: vencimentos.filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= 30).length,
    sessenta: vencimentos.filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= 60).length,
  };

  return (
    <AppShell
      title="Central de Vencimentos"
      description="Visão consolidada de documentos, equipamentos e manutenções por prioridade de prazo."
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
        </div>

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
              {filtrados.map((item) => (
                <LinhaVencimento key={`${item.modulo}-${item.id}`} item={item} />
              ))}
              {!isLoading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Nenhum vencimento encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Carregando vencimentos consolidados...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
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
