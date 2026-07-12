export type StatusVenc = "vencido" | "critico" | "atencao" | "ok";

export {
  alertasMock as alertas,
  dashboardMock as kpis,
  documentosMock as documentos,
  equipamentosMock as equipamentos,
  logsAuditoriaMock as auditoriaLogs,
  manutencoesMock as manutencoes,
  pendenciasMock as pendenciasCriticas,
  usuariosMock as usuarios,
} from "@/mocks";

export { statusLabel, statusTone } from "@/utils/status";
