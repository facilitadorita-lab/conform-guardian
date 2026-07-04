import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { usuarios } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Conform Flow" }] }),
  component: UsuariosPage,
});

const perfilTone: Record<string, string> = {
  "Administrador": "border-primary/30 text-primary bg-primary/5",
  "Responsável técnico": "border-accent/30 text-accent bg-accent/5",
  "Colaborador": "border-border text-muted-foreground",
  "Somente leitura": "border-warning/40 text-warning bg-warning/5",
};

function UsuariosPage() {
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
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-2.5">Nome</th>
              <th className="text-left font-medium px-4 py-2.5">E-mail</th>
              <th className="text-left font-medium px-4 py-2.5">Perfil</th>
              <th className="text-left font-medium px-4 py-2.5">Setor</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-6 py-2.5">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-6 py-3 font-medium">{u.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${perfilTone[u.perfil]}`}>{u.perfil}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.setor}</td>
                <td className="px-4 py-3"><span className="inline-flex rounded-full border border-success/40 text-success bg-success/5 px-2 py-0.5 text-[11px] font-medium">{u.status}</span></td>
                <td className="px-6 py-3 text-right"><button className="text-xs font-medium text-accent hover:underline">Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}