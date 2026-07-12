import { createFileRoute } from "@tanstack/react-router";
import { DocumentosPage } from "@/pages/DocumentosPage";

export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [{ title: "Documentos - Conform Flow" }] }),
  component: DocumentosPage,
});
