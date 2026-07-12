import { createFileRoute } from "@tanstack/react-router";
import { MasterFinanceiroPage } from "@/pages/MasterFinanceiroPage";

export const Route = createFileRoute("/master/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro Master - Conform Flow" }] }),
  component: MasterFinanceiroPage,
});
