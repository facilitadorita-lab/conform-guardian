import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, LockKeyhole, Plus, Search, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import { InviteUserDialog } from "@/components/invite-user-dialog";
import { SectionHeader } from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { useAuthContext, useUsuarios } from "@/hooks/use-conform-data";
import { useSession } from "@/hooks/use-session";
import { AppShell } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import { usuariosService, type PerfilUsuarioEmpresa } from "@/services/usuariosService";
import type { UsuarioResumo } from "@/types";

const perfilTone: Record<UsuarioResumo["perfil"], string> = {
  Administrador: "border-primary/30 bg-primary/5 text-primary",
  "Responsavel tecnico": "border-accent/30 bg-accent/5 text-accent",
  Colaborador: "border-border bg-muted/30 text-muted-foreground",
  "Somente leitura": "border-warning/40 bg-warning/5 text-warning",
};

const perfis: Array<{
  value: PerfilUsuarioEmpresa;
  label: UsuarioResumo["perfil"];
  description: string;
}> = [
  {
    value: "administrador",
    label: "Administrador",
    description: "Gerencia usuários, configurações e operação da empresa.",
  },
  {
    value: "responsavel_tecnico",
    label: "Responsavel tecnico",
    description: "Acompanha conformidade técnica, evidências e tratativas.",
  },
  {
    value: "colaborador",
    label: "Colaborador",
    description: "Opera rotinas e registros conforme permissões do plano.",
  },
  {
    value: "somente_leitura",
    label: "Somente leitura",
    description: "Consulta dados sem alterar registros operacionais.",
  },
];

export function UsuariosPage() {
  const { data: usuarios = [], isLoading } = useUsuarios();
  const { data: authContext } = useAuthContext();
  const { podeAdministrar, selectedCompanyId } = useSession();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const podeGerenciar = podeAdministrar;
  const selectedCompanyContext = authContext?.empresasPermitidas.find(
    (company) => company.id === selectedCompanyId,
  );
  const limiteUsuarios = selectedCompanyContext?.plano?.limite_usuarios ?? null;
  const usuariosAtivos = usuarios.filter((usuario) => usuario.status === "Ativo").length;
  const atingiuLimite = limiteUsuarios !== null && usuariosAtivos >= limiteUsuarios;

  const usuariosFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return usuarios;
    return usuarios.filter((usuario) =>
      normalizar(
        `${usuario.nome} ${usuario.email} ${usuario.perfil} ${usuario.setor} ${usuario.status}`,
      ).includes(termo),
    );
  }, [busca, usuarios]);

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!podeGerenciar) throw new Error("Seu perfil não permite gerenciar usuários.");
      if (!selectedCompanyId || !editingUser) throw new Error("Selecione uma empresa e usuário.");

      return usuariosService.atualizarPerfil(selectedCompanyId, editingUser.id, {
        perfil: required(formData, "perfil") as PerfilUsuarioEmpresa,
        ativo: required(formData, "status") === "ativo",
      });
    },
    onSuccess: async () => {
      setEditingUser(null);
      setErro(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["usuarios", selectedCompanyId] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "contexto"] }),
        queryClient.invalidateQueries({ queryKey: ["auditoria", "avancada", selectedCompanyId] }),
      ]);
    },
    onError: (error) => {
      setErro(
        error instanceof Error
          ? traduzErroPerfil(error.message)
          : "Não foi possível atualizar o usuário.",
      );
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    updateMutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <AppShell
      title="Usuários e Perfis"
      description="Gerencie convites, perfis e acessos por empresa com segurança."
      actions={
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          disabled={!podeGerenciar || !selectedCompanyId || atingiuLimite}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm cf-transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Convidar usuário
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Usuários ativos"
          value={usuariosAtivos}
          description={
            limiteUsuarios ? `Limite do plano: ${limiteUsuarios}` : "Sem limite definido"
          }
          icon={Users}
          tone={atingiuLimite ? "warning" : "info"}
        />
        <ResumoCard
          title="Administradores"
          value={usuarios.filter((usuario) => usuario.perfil === "Administrador").length}
          description="Devem existir para continuidade operacional"
          icon={ShieldCheck}
          tone="success"
        />
        <ResumoCard
          title="Responsáveis técnicos"
          value={usuarios.filter((usuario) => usuario.perfil === "Responsavel tecnico").length}
          description="Perfil técnico da rotina de conformidade"
          icon={UserCheck}
          tone="info"
        />
        <ResumoCard
          title="Seu acesso"
          value={
            authContext?.perfilAtual === "master"
              ? "Master"
              : perfilAtualLabel(authContext?.perfilAtual)
          }
          description={
            podeGerenciar ? "Pode gerenciar perfis" : "Sem permissão para alterar perfis"
          }
          icon={podeGerenciar ? ShieldCheck : LockKeyhole}
          tone={podeGerenciar ? "success" : "warning"}
        />
      </div>

      {!podeGerenciar ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          Seu perfil atual não permite alterar usuários. A lista fica disponível para consulta, mas
          alterações de nível de acesso exigem Administrador ou Admin Master.
        </div>
      ) : null}

      {atingiuLimite ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          O limite de usuários ativos do plano foi atingido. Para convidar mais pessoas, altere o
          plano no Admin Master ou desative um usuário existente.
        </div>
      ) : null}

      <Surface className="space-y-4">
        <SectionHeader
          title="Acessos da empresa"
          description="Cada alteração fica registrada na auditoria e só afeta a empresa selecionada."
        />

        <label className="relative block">
          <span className="sr-only">Buscar usuário</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, e-mail, perfil, setor ou status..."
            className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
        </label>

        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum usuário encontrado"
            description="Ajuste a busca ou convide um novo usuário para esta empresa."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="hidden w-full text-sm lg:table">
              <thead className="bg-muted/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold">E-mail</th>
                  <th className="px-4 py-3 text-left font-semibold">Perfil</th>
                  <th className="px-4 py-3 text-left font-semibold">Setor</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usuariosFiltrados.map((usuario) => (
                  <UsuarioRow
                    key={usuario.id}
                    usuario={usuario}
                    canEdit={Boolean(podeGerenciar)}
                    onEdit={() => {
                      setErro(null);
                      setEditingUser(usuario);
                    }}
                  />
                ))}
              </tbody>
            </table>

            <div className="divide-y divide-border lg:hidden">
              {usuariosFiltrados.map((usuario) => (
                <UsuarioMobileCard
                  key={usuario.id}
                  usuario={usuario}
                  canEdit={Boolean(podeGerenciar)}
                  onEdit={() => {
                    setErro(null);
                    setEditingUser(usuario);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </Surface>

      {inviteOpen && selectedCompanyId && podeGerenciar ? (
        <InviteUserDialog
          empresaId={selectedCompanyId}
          onClose={() => {
            setInviteOpen(false);
            void queryClient.invalidateQueries({ queryKey: ["usuarios", selectedCompanyId] });
          }}
        />
      ) : null}

      {editingUser ? (
        <EditarPerfilModal
          usuario={editingUser}
          erro={erro}
          isSaving={updateMutation.isPending}
          onSubmit={handleSubmit}
          onClose={() => {
            if (!updateMutation.isPending) {
              setEditingUser(null);
              setErro(null);
            }
          }}
        />
      ) : null}
    </AppShell>
  );
}

function UsuarioRow({
  usuario,
  canEdit,
  onEdit,
}: {
  usuario: UsuarioResumo;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <tr className="cf-transition hover:bg-muted/30">
      <td className="px-5 py-4 font-semibold">{usuario.nome}</td>
      <td className="px-4 py-4 text-muted-foreground">{usuario.email}</td>
      <td className="px-4 py-4">
        <PerfilBadge perfil={usuario.perfil} />
      </td>
      <td className="px-4 py-4 text-muted-foreground">{humanize(usuario.setor)}</td>
      <td className="px-4 py-4">
        <StatusBadge status={usuario.status} />
      </td>
      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={onEdit}
          disabled={!canEdit}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-accent cf-transition hover:border-accent/30 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Edit3 className="h-3.5 w-3.5" /> Editar
        </button>
      </td>
    </tr>
  );
}

function UsuarioMobileCard({
  usuario,
  canEdit,
  onEdit,
}: {
  usuario: UsuarioResumo;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{usuario.nome}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{usuario.email}</p>
        </div>
        <StatusBadge status={usuario.status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <PerfilBadge perfil={usuario.perfil} />
        <span className="text-xs text-muted-foreground">Setor: {humanize(usuario.setor)}</span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        disabled={!canEdit}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-accent cf-transition hover:border-accent/30 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Edit3 className="h-4 w-4" /> Editar acesso
      </button>
    </article>
  );
}

function EditarPerfilModal({
  usuario,
  erro,
  isSaving,
  onSubmit,
  onClose,
}: {
  usuario: UsuarioResumo;
  erro: string | null;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/30 p-5">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Controle de acesso
            </div>
            <h2 className="text-lg font-semibold">Editar perfil do usuário</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {usuario.nome} · {usuario.email}
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

        <div className="grid gap-4 p-5">
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Perfil
            </span>
            <select
              name="perfil"
              defaultValue={perfilValue(usuario.perfil)}
              className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            >
              {perfis.map((perfil) => (
                <option key={perfil.value} value={perfil.value}>
                  {perfil.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            {perfis.map((perfil) => (
              <div key={perfil.value} className="rounded-2xl border border-border bg-muted/25 p-3">
                <div className="text-sm font-semibold">{perfil.label}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{perfil.description}</p>
              </div>
            ))}
          </div>

          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Status do acesso
            </span>
            <select
              name="status"
              defaultValue={usuario.status === "Ativo" ? "ativo" : "inativo"}
              className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </label>

          <div className="rounded-2xl border border-success/25 bg-success/5 p-3 text-sm text-success">
            Esta alteração será enviada para o backend, registrada na auditoria e aplicada somente à
            empresa selecionada.
          </div>

          {erro ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {erro}
            </div>
          ) : null}
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
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cf-transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isSaving ? "Salvando..." : "Salvar perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PerfilBadge({ perfil }: { perfil: UsuarioResumo["perfil"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        perfilTone[perfil],
      )}
    >
      {perfilLabel(perfil)}
    </span>
  );
}

function StatusBadge({ status }: { status: UsuarioResumo["status"] }) {
  const ativo = status === "Ativo";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        ativo
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {status}
    </span>
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
  value: number | string;
  description: string;
  icon: typeof Users;
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
        <div className="text-3xl font-semibold tracking-[-0.04em] tabular-nums">{value}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function perfilValue(perfil: UsuarioResumo["perfil"]): PerfilUsuarioEmpresa {
  return perfis.find((item) => item.label === perfil)?.value ?? "colaborador";
}

function perfilLabel(perfil: UsuarioResumo["perfil"]) {
  if (perfil === "Responsavel tecnico") return "Responsável técnico";
  return perfil;
}

function perfilAtualLabel(perfil?: string) {
  if (perfil === "administrador") return "Administrador";
  if (perfil === "responsavel_tecnico") return "Responsável técnico";
  if (perfil === "colaborador") return "Colaborador";
  if (perfil === "somente_leitura") return "Somente leitura";
  return "Sem perfil";
}

function traduzErroPerfil(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("self_profile_change"))
    return "Por segurança, você não pode alterar o próprio perfil.";
  if (normalized.includes("company_must_keep_one_admin"))
    return "A empresa precisa manter pelo menos um administrador ativo.";
  if (normalized.includes("forbidden"))
    return "Seu usuário não tem permissão para alterar perfis nesta empresa.";
  if (normalized.includes("user_membership_not_found"))
    return "Este usuário não está vinculado à empresa selecionada.";
  if (normalized.includes("invalid_profile")) return "Perfil selecionado inválido.";
  return message;
}

function normalizar(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function required(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim())
    throw new Error("Preencha os campos obrigatórios.");
  return value.trim();
}
