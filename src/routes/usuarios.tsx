import { createFileRoute } from "@tanstack/react-router";
import { UsuariosPage } from "@/pages/UsuariosPage";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários - Conform Flow" }] }),
  component: UsuariosPage,
});
