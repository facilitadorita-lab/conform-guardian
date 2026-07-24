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
import { BrandMark, BrandText } from "./brand";

type NavItem = {
  to: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  exact?: boolean;
  recurso?: PlanoRecurso;
  adminOnly?: boolean;
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
        adminOnly: true,
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
  const { selectedCompanyId, podeAdministrar } = useSession();
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
        (item) =>
          (!item.recurso || hasPlanFeature(authContext, item.recurso)) &&
          (!item.adminOnly || authContext?.usuario.isMaster || podeAdministrar),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "cf-sidebar-bg hidden shrink-0 flex-col border-r border-white/[0.06] text-sidebar-foreground md:flex",
        "cf-transition relative",
        collapsed ? "w-[76px]" : "w-[268px]",
      )}
    >
      <div
        className={cn(
          "relative flex h-[80px] items-center border-b border-white/[0.08] px-5",
          collapsed && "justify-center px-3",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_55%)]"
        />
        <div className={cn("relative flex items-center gap-3", collapsed && "justify-center")}>
          <BrandMark size={50} />
          {!collapsed ? <BrandText /> : null}
        </div>
      </div>

      <nav
        className={cn(
          "cf-scrollbar-thin min-h-0 flex-1 overflow-y-auto py-5",
          collapsed ? "px-3" : "px-3",
        )}
      >
        <div className="space-y-7">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {!collapsed ? (
                <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100/40">
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
                          "group relative flex items-center rounded-[11px] text-sm cf-transition",
                          collapsed ? "h-11 justify-center px-0" : "min-h-[50px] gap-3 px-3.5 py-2",
                          active
                            ? "cf-active-nav text-[#0B2340]"
                            : "text-sky-50/78 hover:bg-white/[0.055] hover:text-white",
                        )}
                      >
                        {active ? (
                          <span className="absolute -left-[7px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#3A86FF]" />
                        ) : null}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active
                              ? "text-[#2563EB]"
                              : "text-sky-100/60 group-hover:text-white",
                          )}
                        />
                        {!collapsed ? (
                          <span className="min-w-0">
                            <span
                              className={cn(
                                "block truncate",
                                active ? "font-semibold" : "font-medium",
                              )}
                            >
                              {item.label}
                            </span>
                            {item.description ? (
                              <span
                                className={cn(
                                  "mt-0.5 block truncate text-[11px]",
                                  active ? "text-[#0B2340]/55" : "text-sky-100/40",
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

      <div className={cn("shrink-0 border-t border-white/[0.08] p-3", collapsed && "px-2")}>
        {!collapsed && empresaAtual ? (
          <div
            className="mb-2 flex items-center gap-2 rounded-[10px] border border-white/[0.08] bg-white/[0.05] px-2.5 py-2"
            title={`${empresaAtual.nome} — CNPJ ${empresaAtual.cnpj}`}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-sky-200/80" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12px] font-medium text-white">{empresaAtual.nome}</div>
              <div className="mt-0.5 truncate text-[10px] text-sky-100/50">
                {authContext?.usuario.isMaster ? "Admin Master" : planName}
              </div>
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5",
            collapsed && "justify-center px-0",
          )}
          title={authContext?.usuario.email ?? undefined}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-white ring-1 ring-white/10">
            {userInitials}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-medium text-white">
                {authContext?.usuario.nome ?? "Usuário"}
              </div>
              <div className="truncate text-[11px] text-sky-100/55">
                {authContext?.usuario.isMaster ? "Admin Master" : "Sessão ativa"}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        className="absolute -right-4 top-[58px] z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-white text-foreground shadow-[0_4px_12px_rgba(8,28,51,0.14)] cf-transition hover:bg-muted"
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
