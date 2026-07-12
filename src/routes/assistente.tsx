import { createFileRoute } from "@tanstack/react-router";
import { AssistentePage } from "@/pages/AssistentePage";

export const Route = createFileRoute("/assistente")({
  component: AssistentePage,
});
