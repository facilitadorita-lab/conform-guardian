import { Plus } from "lucide-react";
import { useUsuarios } from "@/hooks/use-conform-data";
import { AppShell } from "@/layouts/app-layout";

const perfilTone: Record<string, string> = {
  Administrador: "border-primary/30 bg-primary/5 text-primary",
  "Responsavel tecnico": "border-accent/30 bg-accent/5 text-accent",
  Colaborador: "border-border text-muted-foreground",
  "Somente leitura": "border-warning/40 bg-warning/5 text-warning",
};

export function UsuariosPage() {
  const { data: usuarios = [] } = useUsuarios();

  return (
    <AppShell
      title="Usuários e Perfis"
      description="Administrador, Responsável técnico, Colaborador e Somente leitura. Permissões controladas no backend."
      actions={
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Convidar usuário
        </button>
      }
    >
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium">Nome</th>
              <th className="px-4 py-2.5 text-left font-medium">E-mail</th>
              <th className="px-4 py-2.5 text-left font-medium">Perfil</th>
              <th className="px-4 py-2.5 text-left font-medium">Setor</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-6 py-2.5 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 font-medium">{usuario.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{usuario.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${perfilTone[usuario.perfil]}`}
                  >
                    {usuario.perfil}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{usuario.setor}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-success/40 bg-success/5 px-2 py-0.5 text-[11px] font-medium text-success">
                    {usuario.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <button className="text-xs font-medium text-accent hover:underline">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
