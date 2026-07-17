import { useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Activity,
  Bell,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cog,
  FileClock,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthContext } from "@/hooks/use-conform-data";
import { useSession } from "@/hooks/use-session";
import type { PlanoRecurso } from "@/types";
import { cn } from "@/lib/utils";
import { getPlanName, hasPlanFeature } from "@/utils/plan-features";

type NavItem = {
  to: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  exact?: boolean;
  recurso?: PlanoRecurso;
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Operação",
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        description: "Visão executiva",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        to: "/documentos",
        label: "Documentos",
        description: "Validades e anexos",
        icon: FileText,
        recurso: "documentos",
      },
      {
        to: "/equipamentos",
        label: "Equipamentos",
        description: "Ativos e histórico",
        icon: Cog,
        recurso: "equipamentos",
      },
      {
        to: "/manutencoes",
        label: "Manutenções",
        description: "Preventivas e corretivas",
        icon: Wrench,
        recurso: "manutencoes",
      },
      {
        to: "/pendencias",
        label: "Pendências",
        description: "Tratativas abertas",
        icon: ClipboardList,
        recurso: "pendencias",
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        to: "/alertas",
        label: "Alertas",
        description: "Notificações",
        icon: Bell,
        recurso: "alertas",
      },
      {
        to: "/vencimentos",
        label: "Vencimentos",
        description: "Calendário regulatório",
        icon: CalendarClock,
        recurso: "vencimentos",
      },
      {
        to: "/relatorios",
        label: "Relatórios",
        description: "PDF e indicadores",
        icon: BarChart3,
        recurso: "relatorios",
      },
      {
        to: "/auditoria",
        label: "Auditoria",
        description: "Rastreabilidade",
        icon: ShieldCheck,
        recurso: "auditoria",
      },
    ],
  },
  {
    label: "Administração",
    items: [
      {
        to: "/usuarios",
        label: "Usuários",
        description: "Acessos e perfis",
        icon: Users,
        recurso: "usuarios",
      },
      {
        to: "/configuracoes",
        label: "Configurações",
        description: "Matriz e regras",
        icon: Settings,
      },
    ],
  },
];

const masterGroup: { label: string; items: NavItem[] } = {
  label: "Admin Master",
  items: [
    { to: "/master/empresas", label: "Empresas", description: "Base de clientes", icon: Building2 },
    {
      to: "/master/financeiro",
      label: "Financeiro",
      description: "MRR e cobranças",
      icon: WalletCards,
    },
    {
      to: "/master/planos",
      label: "Planos",
      description: "Recursos e limites",
      icon: SlidersHorizontal,
    },
    {
      to: "/master/saude",
      label: "Saúde do sistema",
      description: "Falhas e integrações",
      icon: Activity,
    },
    {
      to: "/master/historico-comercial",
      label: "Histórico comercial",
      description: "Planos e cobranças",
      icon: FileClock,
    },
  ],
};

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { data: authContext } = useAuthContext();
  const { selectedCompanyId } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const empresaAtual =
    authContext?.empresasPermitidas.find((company) => company.id === selectedCompanyId) ??
    authContext?.empresaAtual;
  const planName = getPlanName(authContext);
  const userInitials = useMemo(
    () => initials(authContext?.usuario.nome),
    [authContext?.usuario.nome],
  );

  const visibleGroups = (authContext?.usuario.isMaster ? [...groups, masterGroup] : groups)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.recurso || hasPlanFeature(authContext, item.recurso),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
        "cf-transition relative",
        collapsed ? "w-[88px]" : "w-[280px]",
      )}
    >
      <div
        className={cn("border-b border-sidebar-border bg-white/[0.035] p-5", collapsed && "px-3")}
      >
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/10 ring-1 ring-white/20">
            <img
              src="/conform-flow-logo-transparent.png"
              alt="Conform Flow"
              className="h-full w-full object-contain"
            />
          </div>
          {!collapsed ? (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-base font-bold tracking-tight text-white">
                Conform Flow
              </div>
              <div className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100/70">
                Gestão de conformidade
              </div>
            </div>
          ) : null}
        </div>

        {!collapsed && empresaAtual ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{empresaAtual.nome}</div>
                <div className="mt-1 truncate text-[11px] text-sidebar-foreground/60">
                  CNPJ {empresaAtual.cnpj}
                </div>
                <div className="mt-2 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-sidebar-foreground/80">
                  {authContext?.usuario.isMaster ? "Admin Master" : planName}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-3" : "px-4")}>
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {!collapsed ? (
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                  {group.label}
                </div>
              ) : null}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.to
                    : pathname === item.to || pathname.startsWith(item.to + "/");
                  const Icon = item.icon;

                  return (
                    <li key={item.to}>
                      <Link
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        to={item.to as any}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center rounded-xl text-sm cf-transition",
                          collapsed ? "h-11 justify-center px-0" : "gap-3 px-3 py-2.5",
                          active
                            ? "bg-white text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/78 hover:bg-white/[0.08] hover:text-white",
                        )}
                      >
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                        ) : null}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active
                              ? "text-accent"
                              : "text-sidebar-foreground/65 group-hover:text-white",
                          )}
                        />
                        {!collapsed ? (
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{item.label}</span>
                            {item.description ? (
                              <span
                                className={cn(
                                  "mt-0.5 block truncate text-[11px]",
                                  active ? "text-primary/65" : "text-sidebar-foreground/42",
                                )}
                              >
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className={cn("border-t border-sidebar-border p-4", collapsed && "px-3")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold ring-1 ring-white/10">
            {userInitials}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {authContext?.usuario.nome ?? "Usuário"}
              </div>
              <div className="truncate text-[11px] text-sidebar-foreground/55">
                {authContext?.usuario.email ?? "Sessão ativa"}
              </div>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <div className="mt-4 flex items-center justify-between text-[10px] text-sidebar-foreground/45">
            <span>Conform Flow v1.0</span>
            <span>SaaS seguro</span>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm cf-transition hover:bg-muted"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}

function initials(name?: string) {
  const parts = (name ?? "Usuário").trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
}
