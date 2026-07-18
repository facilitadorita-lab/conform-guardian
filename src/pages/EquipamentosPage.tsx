import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Download,
  Eye,
  Factory,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { SectionHeader } from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { useEquipamentos } from "@/hooks/use-conform-data";
import { useSession } from "@/hooks/use-session";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import { equipamentosService } from "@/services";
import type { EquipamentoResumo, StatusConformidade } from "@/types";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

type StatusFiltro = StatusConformidade | "todos";
type CriticidadeFiltro = EquipamentoResumo["criticidade"] | "todos";
type Ordenacao = "vencimento" | "nome" | "criticidade" | "status";

const PAGE_SIZE = 12;

export function EquipamentosPage() {
  const { podeEscrever, selectedCompanyId, selectedCompany } = useSession();
  const empresaNome = selectedCompany?.razao_social ?? "empresa não selecionada";
  const { data: equipamentos = [], isLoading, isError, error, refetch } = useEquipamentos();
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [criticidadeFiltro, setCriticidadeFiltro] = useState<CriticidadeFiltro>("todos");
  const [setorFiltro, setSetorFiltro] = useState("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("vencimento");
  const [pagina, setPagina] = useState(1);

  const resumo = useMemo(() => calcularResumo(equipamentos), [equipamentos]);
  const setores = useMemo(
    () => opcoesUnicas(equipamentos.map((item) => item.setor)),
    [equipamentos],
  );

  const equipamentosFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    return equipamentos
      .filter((equipamento) => {
        const texto = normalizar(
          [
            equipamento.nome,
            equipamento.codigo,
            equipamento.tipo,
            equipamento.fabricante,
            equipamento.modelo,
            equipamento.setor,
            equipamento.criticidade,
            statusLabel(equipamento.status),
          ].join(" "),
        );

        const atendeBusca = !termo || texto.includes(termo);
        const atendeStatus = statusFiltro === "todos" || equipamento.status === statusFiltro;
        const atendeCriticidade =
          criticidadeFiltro === "todos" || equipamento.criticidade === criticidadeFiltro;
        const atendeSetor = setorFiltro === "todos" || equipamento.setor === setorFiltro;

        return atendeBusca && atendeStatus && atendeCriticidade && atendeSetor;
      })
      .sort((a, b) => ordenarEquipamentos(a, b, ordenacao));
  }, [busca, criticidadeFiltro, equipamentos, ordenacao, setorFiltro, statusFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(equipamentosFiltrados.length / PAGE_SIZE));
  const equipamentosPagina = equipamentosFiltrados.slice(
    (pagina - 1) * PAGE_SIZE,
    pagina * PAGE_SIZE,
  );
  const filtrosAtivos =
    busca.trim() ||
    statusFiltro !== "todos" ||
    criticidadeFiltro !== "todos" ||
    setorFiltro !== "todos";

  useEffect(() => {
    setPagina(1);
  }, [busca, statusFiltro, criticidadeFiltro, setorFiltro, ordenacao]);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!podeEscrever) throw new Error("Seu perfil possui acesso somente para consulta.");
      if (!selectedCompanyId) throw new Error("Selecione uma empresa antes de salvar.");

      return equipamentosService.criar(selectedCompanyId, {
        nome: required(formData, "nome"),
        codigo_interno: optional(formData, "codigo_interno"),
        numero_serie: optional(formData, "numero_serie"),
        fabricante: optional(formData, "fabricante"),
        modelo: optional(formData, "modelo"),
        setor: optional(formData, "setor"),
        localizacao: optional(formData, "localizacao"),
        criticidade: required(formData, "criticidade"),
        status: "ativo",
        observacoes: optional(formData, "observacoes"),
      });
    },
    onSuccess: async () => {
      setModalAberto(false);
      setErro(null);
      await queryClient.invalidateQueries({ queryKey: ["equipamentos", selectedCompanyId] });
    },
    onError: (error) => {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o equipamento.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    createMutation.mutate(new FormData(event.currentTarget));
  }

  function limparFiltros() {
    setBusca("");
    setStatusFiltro("todos");
    setCriticidadeFiltro("todos");
    setSetorFiltro("todos");
    setOrdenacao("vencimento");
  }

  return (
    <AppShell
      title="Equipamentos"
      description="Ativos operacionais com visão consolidada de calibrações, qualificações, manutenções e evidências por empresa."
      actions={
        <>
          <button
            type="button"
            onClick={() => exportarEquipamentosCsv(equipamentosFiltrados, empresaNome)}
            disabled={equipamentosFiltrados.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm cf-transition hover:border-accent/30 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            disabled={!podeEscrever}
            title={!podeEscrever ? "Seu perfil possui acesso somente para consulta" : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm cf-transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Novo equipamento
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Equipamentos cadastrados"
          value={resumo.total}
          description={`${setores.length} setor${setores.length === 1 ? "" : "es"} com ativos`}
          icon={Factory}
          tone="info"
        />
        <ResumoCard
          title="Em dia"
          value={resumo.emDia}
          description="Sem ação imediata no momento"
          icon={ShieldCheck}
          tone="success"
        />
        <ResumoCard
          title="Em atenção"
          value={resumo.atencao}
          description="Calibração, qualificação ou manutenção a acompanhar"
          icon={AlertTriangle}
          tone={resumo.atencao > 0 ? "warning" : "neutral"}
        />
        <ResumoCard
          title="Alta criticidade"
          value={resumo.altaCriticidade}
          description="Ativos que merecem prioridade operacional"
          icon={Activity}
          tone={resumo.altaCriticidade > 0 ? "danger" : "neutral"}
        />
      </div>

      <Surface className="space-y-4">
        <SectionHeader
          title="Inventário de equipamentos"
          description="Pesquise, filtre e abra o histórico completo do ativo sem misturar dados entre empresas."
          action={
            filtrosAtivos ? (
              <button
                type="button"
                onClick={limparFiltros}
                className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground cf-transition hover:border-accent/30 hover:bg-muted/40 hover:text-foreground"
              >
                Limpar filtros
              </button>
            ) : null
          }
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(150px,1fr))]">
          <label className="relative">
            <span className="sr-only">Buscar equipamento</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, código, setor, fabricante..."
              className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </label>

          <FiltroSelect
            ariaLabel="Filtrar por status"
            value={statusFiltro}
            onChange={(value) => setStatusFiltro(value as StatusFiltro)}
            options={[
              ["todos", "Todos os status"],
              ["vencido", "Vencidos"],
              ["critico", "Críticos"],
              ["atencao", "Em atenção"],
              ["ok", "Em dia"],
              ["sem_validade", "Sem validade"],
            ]}
          />

          <FiltroSelect
            ariaLabel="Filtrar por criticidade"
            value={criticidadeFiltro}
            onChange={(value) => setCriticidadeFiltro(value as CriticidadeFiltro)}
            options={[
              ["todos", "Todas criticidades"],
              ["Critica", "Crítica"],
              ["Alta", "Alta"],
              ["Media", "Média"],
              ["Baixa", "Baixa"],
            ]}
          />

          <FiltroSelect
            ariaLabel="Filtrar por setor"
            value={setorFiltro}
            onChange={setSetorFiltro}
            options={[
              ["todos", "Todos os setores"],
              ...setores.map((setor) => [setor, setor] as const),
            ]}
          />

          <FiltroSelect
            ariaLabel="Ordenar equipamentos"
            value={ordenacao}
            onChange={(value) => setOrdenacao(value as Ordenacao)}
            options={[
              ["vencimento", "Ordenar por vencimento"],
              ["criticidade", "Ordenar por criticidade"],
              ["status", "Ordenar por status"],
              ["nome", "Ordenar por nome"],
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>
            Exibindo {equipamentosFiltrados.length} de {equipamentos.length} equipamento
            {equipamentos.length === 1 ? "" : "s"} da empresa {empresaNome}.
          </span>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Não foi possível carregar os equipamentos"
            description={error instanceof Error ? error.message : "Tente novamente em instantes."}
            action={
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-accent hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" /> Tentar novamente
              </button>
            }
          />
        ) : equipamentosFiltrados.length === 0 ? (
          <EmptyState
            icon={Factory}
            title={
              filtrosAtivos ? "Nenhum equipamento encontrado" : "Nenhum equipamento cadastrado"
            }
            description={
              filtrosAtivos
                ? "Ajuste os filtros ou limpe a busca para voltar ao inventário completo da empresa selecionada."
                : `Ambiente atual: ${empresaNome}. Cadastre o primeiro equipamento para controlar calibrações, qualificações, manutenções e anexos.`
            }
            action={
              <button
                type="button"
                onClick={() => (filtrosAtivos ? limparFiltros() : setModalAberto(true))}
                disabled={!filtrosAtivos && !podeEscrever}
                title={
                  !filtrosAtivos && !podeEscrever
                    ? "Seu perfil possui acesso somente para consulta"
                    : undefined
                }
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cf-transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {filtrosAtivos ? "Limpar filtros" : "Cadastrar equipamento"}
              </button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-border lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Equipamento</th>
                    <th className="px-4 py-3 text-left font-semibold">Identificação</th>
                    <th className="px-4 py-3 text-left font-semibold">Fabricante / Modelo</th>
                    <th className="px-4 py-3 text-left font-semibold">Setor</th>
                    <th className="px-4 py-3 text-left font-semibold">Criticidade</th>
                    <th className="px-4 py-3 text-left font-semibold">Próximo venc.</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {equipamentosPagina.map((equipamento) => (
                    <EquipamentoRow key={equipamento.id} equipamento={equipamento} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:hidden">
              {equipamentosPagina.map((equipamento) => (
                <EquipamentoMobileCard key={equipamento.id} equipamento={equipamento} />
              ))}
            </div>

            <PaginationFooter
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalItens={equipamentosFiltrados.length}
              onPrevious={() => setPagina((atual) => Math.max(1, atual - 1))}
              onNext={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
            />
          </>
        )}
      </Surface>

      {modalAberto && podeEscrever && (
        <NovoEquipamentoModal
          erro={erro}
          isSaving={createMutation.isPending}
          onSubmit={handleSubmit}
          onClose={() => {
            if (!createMutation.isPending) {
              setModalAberto(false);
              setErro(null);
            }
          }}
        />
      )}
    </AppShell>
  );
}

function ResumoCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const toneClass = {
    success: "border-success/20 bg-success/5 text-success",
    warning: "border-warning/25 bg-warning/5 text-warning",
    danger: "border-danger/25 bg-danger/5 text-danger",
    info: "border-accent/20 bg-accent/5 text-accent",
    neutral: "border-border bg-muted/30 text-muted-foreground",
  }[tone];

  return (
    <div className="cf-page-card flex min-h-36 flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </div>
        <div
          className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", toneClass)}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <div className="text-4xl font-semibold tracking-[-0.04em] tabular-nums">{value}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function EquipamentoRow({ equipamento }: { equipamento: EquipamentoResumo }) {
  return (
    <tr className="cf-transition hover:bg-muted/30">
      <td className="px-5 py-4">
        <div className="font-semibold text-foreground">{equipamento.nome}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {equipamento.tipo || "Equipamento"}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="font-mono text-xs text-foreground">
          {equipamento.codigo || "Sem código"}
        </div>
      </td>
      <td className="px-4 py-4 text-muted-foreground">
        <div>{equipamento.fabricante || "-"}</div>
        <div className="text-xs">{equipamento.modelo || "-"}</div>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{equipamento.setor || "-"}</td>
      <td className="px-4 py-4">
        <CriticidadeBadge criticidade={equipamento.criticidade} />
      </td>
      <td className="px-4 py-4 tabular-nums">{formatDateBR(equipamento.proximoVenc)}</td>
      <td className="px-4 py-4">
        <StatusBadge tone={equipamento.status}>{statusLabel(equipamento.status)}</StatusBadge>
      </td>
      <td className="px-5 py-4 text-right">
        <Link
          to="/equipamentos/$id"
          params={{ id: equipamento.id }}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-accent cf-transition hover:border-accent/30 hover:bg-accent/5"
        >
          <Eye className="h-3.5 w-3.5" /> Abrir
        </Link>
      </td>
    </tr>
  );
}

function EquipamentoMobileCard({ equipamento }: { equipamento: EquipamentoResumo }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{equipamento.nome}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {equipamento.codigo || "Sem código"} · {equipamento.setor || "Sem setor"}
          </p>
        </div>
        <StatusBadge tone={equipamento.status}>{statusLabel(equipamento.status)}</StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <InfoItem
          label="Fabricante / modelo"
          value={`${equipamento.fabricante || "-"} / ${equipamento.modelo || "-"}`}
        />
        <InfoItem label="Próximo vencimento" value={formatDateBR(equipamento.proximoVenc)} />
        <InfoItem label="Tipo" value={equipamento.tipo || "Equipamento"} />
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Criticidade
          </span>
          <div className="mt-1">
            <CriticidadeBadge criticidade={equipamento.criticidade} />
          </div>
        </div>
      </div>

      <Link
        to="/equipamentos/$id"
        params={{ id: equipamento.id }}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground cf-transition hover:bg-primary/90"
      >
        <Eye className="h-4 w-4" /> Abrir histórico do equipamento
      </Link>
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 text-foreground">{value}</div>
    </div>
  );
}

function CriticidadeBadge({ criticidade }: { criticidade: EquipamentoResumo["criticidade"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        criticidade === "Critica"
          ? "border-danger/30 bg-danger/10 text-danger"
          : criticidade === "Alta"
            ? "border-warning/40 bg-warning/10 text-warning"
            : criticidade === "Media"
              ? "border-accent/20 bg-accent/5 text-accent"
              : "border-border bg-muted/30 text-muted-foreground",
      )}
    >
      {criticidade === "Critica" ? "Crítica" : criticidade === "Media" ? "Média" : criticidade}
    </span>
  );
}

function PaginationFooter({
  pagina,
  totalPaginas,
  totalItens,
  onPrevious,
  onNext,
}: {
  pagina: number;
  totalPaginas: number;
  totalItens: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
      <span className="text-muted-foreground">
        Página {pagina} de {totalPaginas} · {totalItens} registro{totalItens === 1 ? "" : "s"}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={pagina === 1}
          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold cf-transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={pagina >= totalPaginas}
          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold cf-transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function FiltroSelect({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function NovoEquipamentoModal({
  erro,
  isSaving,
  onSubmit,
  onClose,
}: {
  erro: string | null;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/30 p-5">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Inventário de ativos
            </div>
            <h2 className="text-lg font-semibold">Novo equipamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O equipamento será criado apenas no ambiente da empresa selecionada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border p-2 text-muted-foreground cf-transition hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Input label="Nome" name="nome" required />
          <Input label="Código interno" name="codigo_interno" required />
          <Input label="Número de série" name="numero_serie" />
          <Input label="Fabricante" name="fabricante" required />
          <Input label="Modelo" name="modelo" required />
          <Input label="Setor" name="setor" required />
          <Input label="Localização" name="localizacao" />
          <Select label="Criticidade" name="criticidade" required>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </Select>
          <TextArea label="Observações" name="observacoes" />

          {erro && (
            <div className="md:col-span-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {erro}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium cf-transition hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cf-transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Wrench className="h-4 w-4 animate-pulse" /> Salvando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Salvar equipamento
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
      />
    </label>
  );
}

function Select({
  label,
  name,
  required,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <select
        name={name}
        required={required}
        className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
      >
        {children}
      </select>
    </label>
  );
}

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label className="md:col-span-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <textarea
        name={name}
        rows={3}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
      />
    </label>
  );
}

function calcularResumo(equipamentos: EquipamentoResumo[]) {
  return equipamentos.reduce(
    (acc, equipamento) => {
      acc.total += 1;
      if (equipamento.status === "ok") acc.emDia += 1;
      if (
        equipamento.status === "atencao" ||
        equipamento.status === "critico" ||
        equipamento.status === "vencido"
      ) {
        acc.atencao += 1;
      }
      if (equipamento.criticidade === "Alta" || equipamento.criticidade === "Critica") {
        acc.altaCriticidade += 1;
      }
      return acc;
    },
    { total: 0, emDia: 0, atencao: 0, altaCriticidade: 0 },
  );
}

function opcoesUnicas(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function ordenarEquipamentos(a: EquipamentoResumo, b: EquipamentoResumo, ordenacao: Ordenacao) {
  if (ordenacao === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
  if (ordenacao === "criticidade") {
    return (
      criticidadePeso(b.criticidade) - criticidadePeso(a.criticidade) ||
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }
  if (ordenacao === "status") {
    return statusPeso(b.status) - statusPeso(a.status) || a.nome.localeCompare(b.nome, "pt-BR");
  }

  return dataPeso(a.proximoVenc) - dataPeso(b.proximoVenc) || a.nome.localeCompare(b.nome, "pt-BR");
}

function criticidadePeso(criticidade: EquipamentoResumo["criticidade"]) {
  return { Baixa: 1, Media: 2, Alta: 3, Critica: 4 }[criticidade] ?? 0;
}

function statusPeso(status: StatusConformidade) {
  return { ok: 1, sem_validade: 0, atencao: 2, critico: 3, vencido: 4 }[status] ?? 0;
}

function dataPeso(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function exportarEquipamentosCsv(equipamentos: EquipamentoResumo[], empresaNome: string) {
  const header = [
    "Empresa",
    "Equipamento",
    "Codigo",
    "Tipo",
    "Fabricante",
    "Modelo",
    "Setor",
    "Criticidade",
    "Proximo vencimento",
    "Status",
  ];

  const rows = equipamentos.map((equipamento) => [
    empresaNome,
    equipamento.nome,
    equipamento.codigo,
    equipamento.tipo,
    equipamento.fabricante,
    equipamento.modelo,
    equipamento.setor,
    equipamento.criticidade,
    formatDateBR(equipamento.proximoVenc),
    statusLabel(equipamento.status),
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `equipamentos-${slugify(empresaNome)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizar(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value: string) {
  return (
    normalizar(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "empresa"
  );
}

function required(formData: FormData, key: string): string {
  const value = optional(formData, key);
  if (!value) throw new Error("Preencha os campos obrigatórios.");
  return value;
}

function optional(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
