import type { DashboardResumo, PendenciaResumo } from "@/types";

export const dashboardMock: DashboardResumo = {
  indiceConformidade: 87,
  documentosVencidos: 4,
  vencendo7: 3,
  vencendo30: 11,
  vencendo60: 18,
  equipamentosAtencao: 6,
  manutencoesVencidas: 2,
  manutencoesProximas: 9,
  pendenciasCriticas: 7,
  semAnexo: 5,
  semResponsavel: 3,
};

export const pendenciasMock: PendenciaResumo[] = [
  { id: "P-2041", item: "Alvara Sanitario 2025", tipo: "Documento", responsavel: "Marina Alves", vencimento: "2026-07-06", diasRestantes: 2, status: "critico" },
  { id: "P-2039", item: "Calibracao Balanca BL-04", tipo: "Equipamento", responsavel: "Rafael Souza", vencimento: "2026-07-02", diasRestantes: -2, status: "vencido" },
  { id: "P-2037", item: "Manutencao Preventiva Autoclave AC-01", tipo: "Manutencao", responsavel: "Time Tecnico", vencimento: "2026-07-10", diasRestantes: 6, status: "critico" },
  { id: "P-2035", item: "Laudo PGRSS", tipo: "Documento", responsavel: "Camila Torres", vencimento: "2026-07-15", diasRestantes: 11, status: "atencao" },
  { id: "P-2033", item: "Qualificacao Camara Fria CF-02", tipo: "Equipamento", responsavel: "Sem responsavel", vencimento: "2026-07-22", diasRestantes: 18, status: "atencao" },
  { id: "P-2031", item: "Contrato Coleta Residuos", tipo: "Documento", responsavel: "Marina Alves", vencimento: "2026-08-05", diasRestantes: 32, status: "ok" },
  { id: "P-2029", item: "Manutencao Corretiva Ar-Cond. AR-08", tipo: "Manutencao", responsavel: "Rafael Souza", vencimento: "2026-06-28", diasRestantes: -6, status: "vencido" },
];
