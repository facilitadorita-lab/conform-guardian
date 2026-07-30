import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Building2,
  CircleGauge,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Users,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { EmptyState, Surface } from "@/components/conform/surface";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppSession } from "@/hooks/use-app-session";
import { useUnitContext } from "@/hooks/use-unit-context";
import { unidadesService } from "@/services";
import type { StatusUnidade, UnidadeFormPayload, UnidadeResumo } from "@/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const unitSchema = z.object({
  codigo: z.string().trim().min(2, "Informe um código com pelo menos 2 caracteres.").max(30),
  nome: z.string().trim().min(2, "Informe o nome da unidade.").max(120),
  tipo: z.string().trim().max(60).optional(),
  cnpj: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.replace(/\D/g, "").length === 14, "CNPJ inválido."),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  telefone: z.string().trim().max(30).optional(),
  endereco: z.string().trim().max(180).optional(),
  numero: z.string().trim().max(30).optional(),
  complemento: z.string().trim().max(100).optional(),
  bairro: z.string().trim().max(100).optional(),
  cidade: z.string().trim().max(100).optional(),
  estado: z.string().trim().max(2).optional(),
  cep: z.string().trim().max(10).optional(),
  status: z.enum(["ativa", "inativa", "em_implantacao", "arquivada"]),
  observacoes: z.string().trim().max(1000).optional(),
});

export function UnidadesPage() {
  const { selectedCompanyId, authContext } = useAppSession();
  const empresaId = selectedCompanyId ?? authContext?.empresaAtual.id ?? null;
  const {
    unidadesPermitidas,
    limites,
    podeAdministrarUnidades,
    carregando,
    erro,
    atualizarUnidades,
  } = useUnitContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusUnidade | "todos">("todos");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UnidadeResumo | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return unidadesPermitidas.filter((unit) => {
      const matchesTerm =
        !term ||
        [unit.nome, unit.codigo, unit.cidade, unit.estado, unit.cnpj]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(term);
      return matchesTerm && (status === "todos" || unit.status === status);
    });
  }, [search, status, unidadesPermitidas]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const saveMutation = useMutation({
    mutationFn: async (payload: UnidadeFormPayload) => {
      if (!empresaId) throw new Error("Selecione uma empresa.");
      if (editing) return unidadesService.atualizar(empresaId, editing.id, payload);
      return unidadesService.criar(empresaId, payload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Unidade atualizada com sucesso." : "Unidade criada com sucesso.");
      setDialogOpen(false);
      setEditing(null);
      setFormError(null);
      await atualizarUnidades();
      await queryClient.invalidateQueries({ queryKey: ["dashboard", empresaId] });
    },
    onError: (cause) => {
      const message = cause instanceof Error ? cause.message : "Não foi possível salvar a unidade.";
      setFormError(
        message.includes("UNIT_LIMIT_REACHED")
          ? "O limite contratado foi atingido. Contrate uma unidade extra para continuar."
          : message,
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      unit,
      nextStatus,
    }: {
      unit: UnidadeResumo;
      nextStatus: StatusUnidade;
    }) => {
      if (!empresaId) throw new Error("Selecione uma empresa.");
      return unidadesService.alterarStatus(
        empresaId,
        unit.id,
        nextStatus,
        `Alteração realizada pela gestão de unidades para ${nextStatus}.`,
      );
    },
    onSuccess: async () => {
      toast.success("Status da unidade atualizado.");
      await atualizarUnidades();
    },
    onError: (cause) =>
      toast.error(cause instanceof Error ? cause.message : "Não foi possível alterar o status."),
  });

  const matrixMutation = useMutation({
    mutationFn: async (unit: UnidadeResumo) => {
      if (!empresaId) throw new Error("Selecione uma empresa.");
      return unidadesService.definirMatriz(empresaId, unit.id);
    },
    onSuccess: async () => {
      toast.success("Unidade matriz atualizada.");
      await atualizarUnidades();
    },
    onError: (cause) =>
      toast.error(cause instanceof Error ? cause.message : "Não foi possível definir a matriz."),
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(unit: UnidadeResumo) {
    setEditing(unit);
    setFormError(null);
    setDialogOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const parsed = unitSchema.safeParse({
      codigo: form.get("codigo"),
      nome: form.get("nome"),
      tipo: form.get("tipo"),
      cnpj: form.get("cnpj"),
      email: form.get("email"),
      telefone: form.get("telefone"),
      endereco: form.get("endereco"),
      numero: form.get("numero"),
      complemento: form.get("complemento"),
      bairro: form.get("bairro"),
      cidade: form.get("cidade"),
      estado: form.get("estado"),
      cep: form.get("cep"),
      status: form.get("status"),
      observacoes: form.get("observacoes"),
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revise os campos informados.");
      return;
    }
    saveMutation.mutate(parsed.data);
  }

  const limitReached = Boolean(limites && limites.disponiveis <= 0);

  return (
    <AppShell
      title="Unidades"
      description="Gerencie matriz e filiais, limites contratados e o contexto operacional de cada ambiente."
      actions={
        <button
          type="button"
          onClick={openCreate}
          disabled={!podeAdministrarUnidades || limitReached}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nova unidade
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          icon={Building2}
          label="Unidades utilizadas"
          value={limites ? `${limites.utilizadas} de ${limites.limite}` : "—"}
          detail={limites?.em_excesso ? "Acima do limite contratado" : "Capacidade contratada"}
          tone={limites?.em_excesso ? "danger" : "accent"}
        />
        <Metric
          icon={CircleGauge}
          label="Disponíveis"
          value={limites?.disponiveis ?? "—"}
          detail={limitReached ? "Contrate uma unidade extra" : "Prontas para ativação"}
          tone={limitReached ? "warning" : "success"}
        />
        <Metric
          icon={Users}
          label="Usuários vinculados"
          value={unidadesPermitidas.reduce((total, unit) => total + unit.usuarios, 0)}
          detail="Vínculos específicos por unidade"
          tone="neutral"
        />
      </div>

      {limitReached ? (
        <Surface className="flex flex-wrap items-center justify-between gap-4 border-warning/30 bg-warning/5">
          <div>
            <h2 className="text-sm font-semibold text-warning">Limite de unidades atingido</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A API também bloqueia novas unidades. Contrate um add-on para ampliar o limite.
            </p>
          </div>
          <a
            href="/configuracoes"
            className="rounded-xl border border-warning/30 bg-white px-4 py-2 text-sm font-semibold"
          >
            Gerenciar assinatura
          </a>
        </Surface>
      ) : null}

      <Surface className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Pesquisar unidades</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar por nome, código, cidade ou CNPJ..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-accent"
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusUnidade | "todos");
              setPage(1);
            }}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
            aria-label="Filtrar status de unidade"
          >
            <option value="todos">Todos os status</option>
            <option value="ativa">Ativa</option>
            <option value="em_implantacao">Em implantação</option>
            <option value="inativa">Inativa</option>
            <option value="arquivada">Arquivada</option>
          </select>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted/60" />
            ))}
          </div>
        ) : erro ? (
          <EmptyState
            icon={Building2}
            title="Não foi possível carregar as unidades"
            description={erro.message}
            action={
              <button
                type="button"
                onClick={() => void atualizarUnidades()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Tentar novamente
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma unidade encontrada"
            description="Ajuste os filtros ou cadastre uma nova unidade operacional."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] gap-4 bg-muted/45 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:grid">
              <span>Unidade</span>
              <span>Localização</span>
              <span>Registros</span>
              <span>Status</span>
              <span>Ações</span>
            </div>
            <div className="divide-y divide-border">
              {visible.map((unit) => (
                <article
                  key={unit.id}
                  className="grid gap-4 bg-card px-5 py-4 transition hover:bg-muted/20 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{unit.nome}</h3>
                      {unit.is_matriz ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/5 px-2 py-0.5 text-[11px] font-semibold text-accent">
                          <Star className="h-3 w-3" /> Matriz
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {unit.codigo} {unit.cnpj ? `· CNPJ ${unit.cnpj}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{[unit.cidade, unit.estado].filter(Boolean).join(" / ") || "Não informada"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>{unit.documentos} documentos</div>
                    <div>{unit.equipamentos} equipamentos</div>
                  </div>
                  <div>
                    <UnitStatus status={unit.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {podeAdministrarUnidades ? (
                      <>
                        <Action title="Editar" onClick={() => openEdit(unit)}>
                          <Pencil className="h-4 w-4" />
                        </Action>
                        {!unit.is_matriz && unit.status !== "arquivada" ? (
                          <Action
                            title="Definir como matriz"
                            onClick={() => matrixMutation.mutate(unit)}
                          >
                            <Star className="h-4 w-4" />
                          </Action>
                        ) : null}
                        {!unit.is_matriz && unit.status === "ativa" ? (
                          <Action
                            title="Arquivar"
                            onClick={() => statusMutation.mutate({ unit, nextStatus: "arquivada" })}
                          >
                            <Archive className="h-4 w-4" />
                          </Action>
                        ) : null}
                        {unit.status === "arquivada" || unit.status === "inativa" ? (
                          <Action
                            title="Reativar"
                            onClick={() => statusMutation.mutate({ unit, nextStatus: "ativa" })}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Action>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Somente leitura</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Página {currentPage} de {pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage >= pages}
                onClick={() => setPage((value) => Math.min(pages, value + 1))}
                className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </Surface>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar unidade" : "Nova unidade"}</DialogTitle>
            <DialogDescription>
              O vínculo com a empresa e o limite contratado serão validados no backend.
            </DialogDescription>
          </DialogHeader>
          <form key={editing?.id ?? "new"} className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Código" name="codigo" defaultValue={editing?.codigo} required />
              <Field label="Nome" name="nome" defaultValue={editing?.nome} required />
              <Field label="Tipo" name="tipo" defaultValue={editing?.tipo} />
              <Field label="CNPJ" name="cnpj" defaultValue={editing?.cnpj} />
              <Field label="E-mail" name="email" type="email" defaultValue={editing?.email} />
              <Field label="Telefone" name="telefone" defaultValue={editing?.telefone} />
              <Field label="Endereço" name="endereco" defaultValue={editing?.endereco} />
              <Field label="Número" name="numero" defaultValue={editing?.numero} />
              <Field label="Complemento" name="complemento" defaultValue={editing?.complemento} />
              <Field label="Bairro" name="bairro" defaultValue={editing?.bairro} />
              <Field label="Cidade" name="cidade" defaultValue={editing?.cidade} />
              <Field label="Estado" name="estado" defaultValue={editing?.estado} maxLength={2} />
              <Field label="CEP" name="cep" defaultValue={editing?.cep} />
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Status
                </span>
                {editing ? <input type="hidden" name="status" value={editing.status} /> : null}
                <select
                  name={editing ? undefined : "status"}
                  defaultValue={editing?.status ?? "em_implantacao"}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={Boolean(editing)}
                >
                  <option value="em_implantacao">Em implantação</option>
                  <option value="ativa">Ativa</option>
                  <option value="inativa">Inativa</option>
                  <option value="arquivada">Arquivada</option>
                </select>
              </label>
            </div>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Observações
              </span>
              <textarea
                name="observacoes"
                defaultValue={editing?.observacoes ?? ""}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            {formError ? (
              <p className="rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saveMutation.isPending ? "Salvando..." : "Salvar unidade"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function UnitStatus({ status }: { status: StatusUnidade }) {
  if (status === "ativa") return <StatusBadge tone="ok">Ativa</StatusBadge>;
  if (status === "em_implantacao")
    return <StatusBadge tone="atencao">Em implantação</StatusBadge>;
  if (status === "inativa") return <StatusBadge tone="sem_validade">Inativa</StatusBadge>;
  return <StatusBadge tone="sem_validade">Arquivada</StatusBadge>;
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
  detail: string;
  tone: "accent" | "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <Surface className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl",
          tone === "accent" && "bg-accent/10 text-accent",
          tone === "success" && "bg-success/10 text-success",
          tone === "warning" && "bg-warning/10 text-warning",
          tone === "danger" && "bg-danger/10 text-danger",
          tone === "neutral" && "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
    </Surface>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

function Action({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent/10 hover:text-accent"
    >
      {children}
    </button>
  );
}
