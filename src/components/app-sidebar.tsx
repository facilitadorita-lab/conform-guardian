import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Cog,
  ClipboardList,
  Bell,
  BarChart3,
  ShieldCheck,
  Users,
  Settings,
  ShieldHalf,
  DollarSign,
  Package,
  Building2,
  CreditCard,
  UserCheck,
  AlertOctagon,
  CalendarClock,
  Tag,
  SlidersHorizontal,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const baseGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Visão Geral",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Gestão",
    items: [
      { to: "/documentos", label: "Documentos", icon: FileText },
      { to: "/equipamentos", label: "Equipamentos", icon: Cog },
      { to: "/manutencoes", label: "Manutenções", icon: Wrench },
      { to: "/pendencias", label: "Pendências", icon: ClipboardList },
    ],
  },
  {
    label: "Controle",
    items: [
      { to: "/alertas", label: "Alertas", icon: Bell },
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/usuarios", label: "Usuários", icon: Users },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
] as const;

const masterGroup: { label: string; items: NavItem[] } = {
  label: "Admin Master",
  items: [
    { to: "/master/financeiro", label: "Financeiro", icon: DollarSign },
    { to: "/master/planos", label: "Planos", icon: Package },
    { to: "/master/empresas", label: "Empresas", icon: Building2 },
    { to: "/master/assinaturas", label: "Assinaturas", icon: CreditCard },
    { to: "/master/usuarios-ativos", label: "Usuários ativos", icon: UserCheck },
    { to: "/master/inadimplentes", label: "Inadimplentes", icon: AlertOctagon },
    { to: "/master/proximos-pagamentos", label: "Próximos pagamentos", icon: CalendarClock },
    { to: "/master/valores-planos", label: "Valores dos planos", icon: Tag },
    { to: "/master/recursos-planos", label: "Recursos por plano", icon: SlidersHorizontal },
  ],
};

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isMaster, acessoLiberado } = useSession();

  // Se a empresa está bloqueada e o usuário não é master, o menu não é exibido.
  if (!acessoLiberado) return null;

  const groups = isMaster ? [...baseGroups, masterGroup] : baseGroups;
  const { usuarioAtual } = useSession();
  const iniciais = usuarioAtual.nome
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldHalf className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Conform Flow</div>
          <div className="text-[11px] text-sidebar-foreground/60">Conformidade Operacional</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {groups.map((g: { label: string; items: NavItem[] }) => (
          <div key={g.label}>
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
              {g.label}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((item: NavItem) => {
                const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      to={item.to as any}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold">
            {iniciais}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{usuarioAtual.nome}</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">{usuarioAtual.perfil}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}