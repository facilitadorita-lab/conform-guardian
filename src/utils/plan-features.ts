import type { AuthContexto, PlanoRecurso } from "@/types";

const LEGACY_ALLOWLIST: PlanoRecurso[] = [
  "assistente_ia",
  "vencimentos",
  "documentos",
  "equipamentos",
  "calibracoes",
  "qualificacoes",
  "manutencoes",
  "pendencias",
  "alertas",
  "relatorios",
  "auditoria",
  "usuarios",
  "anexos",
  "multi_unidades",
  "suporte_prioritario",
];

export function hasPlanFeature(authContext: AuthContexto | undefined, recurso: PlanoRecurso) {
  if (!authContext) return false;
  if (authContext.usuario.isMaster) return true;

  const recursos = authContext.empresaAtual.plano?.recursos;
  if (!recursos || Object.keys(recursos).length === 0) {
    return LEGACY_ALLOWLIST.includes(recurso);
  }

  return Boolean(recursos[recurso]);
}

export function getPlanName(authContext: AuthContexto | undefined) {
  return authContext?.empresaAtual.plano?.nome ?? "Plano não identificado";
}
