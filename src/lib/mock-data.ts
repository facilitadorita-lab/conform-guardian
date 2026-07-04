// Mock data para o Conform Flow (frontend-only, aguardando backend).
export type StatusVenc = "vencido" | "critico" | "atencao" | "ok";

export const kpis = {
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

export const pendenciasCriticas = [
  { id: "P-2041", item: "Alvará Sanitário 2025", tipo: "Documento", responsavel: "Marina Alves", vencimento: "2026-07-06", diasRestantes: 2, status: "critico" as StatusVenc },
  { id: "P-2039", item: "Calibração Balança BL-04", tipo: "Equipamento", responsavel: "Rafael Souza", vencimento: "2026-07-02", diasRestantes: -2, status: "vencido" as StatusVenc },
  { id: "P-2037", item: "Manutenção Preventiva Autoclave AC-01", tipo: "Manutenção", responsavel: "Time Técnico", vencimento: "2026-07-10", diasRestantes: 6, status: "critico" as StatusVenc },
  { id: "P-2035", item: "Laudo PGRSS", tipo: "Documento", responsavel: "Camila Torres", vencimento: "2026-07-15", diasRestantes: 11, status: "atencao" as StatusVenc },
  { id: "P-2033", item: "Qualificação Câmara Fria CF-02", tipo: "Equipamento", responsavel: "Sem responsável", vencimento: "2026-07-22", diasRestantes: 18, status: "atencao" as StatusVenc },
  { id: "P-2031", item: "Contrato Coleta Resíduos", tipo: "Documento", responsavel: "Marina Alves", vencimento: "2026-08-05", diasRestantes: 32, status: "ok" as StatusVenc },
  { id: "P-2029", item: "Manutenção Corretiva Ar-Cond. AR-08", tipo: "Manutenção", responsavel: "Rafael Souza", vencimento: "2026-06-28", diasRestantes: -6, status: "vencido" as StatusVenc },
];

export const documentos = [
  { id: "D-101", nome: "Alvará Sanitário 2025", categoria: "Regulatório", tipo: "Alvará", numero: "AS-2025-0091", orgao: "Vigilância Sanitária", responsavel: "Marina Alves", emissao: "2025-07-06", vencimento: "2026-07-06", status: "critico" as StatusVenc, setor: "Administrativo" },
  { id: "D-102", nome: "Licença Ambiental de Operação", categoria: "Ambiental", tipo: "Licença", numero: "LO-4488", orgao: "SEMA", responsavel: "Camila Torres", emissao: "2024-01-10", vencimento: "2027-01-10", status: "ok" as StatusVenc, setor: "Operações" },
  { id: "D-103", nome: "PGRSS", categoria: "Saúde", tipo: "Plano", numero: "PGRSS-19", orgao: "Interno", responsavel: "Camila Torres", emissao: "2025-01-15", vencimento: "2026-07-15", status: "atencao" as StatusVenc, setor: "Operações" },
  { id: "D-104", nome: "Contrato Coleta de Resíduos", categoria: "Contratos", tipo: "Contrato", numero: "CT-0071", orgao: "EcoAmbiental", responsavel: "Marina Alves", emissao: "2024-08-05", vencimento: "2026-08-05", status: "ok" as StatusVenc, setor: "Administrativo" },
  { id: "D-105", nome: "Autorização ANVISA", categoria: "Regulatório", tipo: "Autorização", numero: "ANV-778", orgao: "ANVISA", responsavel: "Marina Alves", emissao: "2023-05-01", vencimento: "2026-05-01", status: "vencido" as StatusVenc, setor: "Regulatório" },
  { id: "D-106", nome: "Certificado de Boas Práticas", categoria: "Qualidade", tipo: "Certificado", numero: "BPF-221", orgao: "ANVISA", responsavel: "Rafael Souza", emissao: "2025-03-01", vencimento: "2027-03-01", status: "ok" as StatusVenc, setor: "Qualidade" },
];

export const equipamentos = [
  { id: "E-01", nome: "Autoclave", codigo: "AC-01", tipo: "Esterilização", fabricante: "SterilTech", modelo: "ST-220", setor: "Laboratório", criticidade: "Alta", status: "atencao" as StatusVenc, proximoVenc: "2026-07-10" },
  { id: "E-02", nome: "Balança Analítica", codigo: "BL-04", tipo: "Medição", fabricante: "Precisa", modelo: "XP-320", setor: "Laboratório", criticidade: "Alta", status: "vencido" as StatusVenc, proximoVenc: "2026-07-02" },
  { id: "E-03", nome: "Câmara Fria", codigo: "CF-02", tipo: "Armazenamento", fabricante: "ColdMax", modelo: "CM-600", setor: "Estoque", criticidade: "Crítica", status: "atencao" as StatusVenc, proximoVenc: "2026-07-22" },
  { id: "E-04", nome: "Estufa Bacteriológica", codigo: "EB-07", tipo: "Cultura", fabricante: "BioLab", modelo: "BL-45", setor: "Laboratório", criticidade: "Média", status: "ok" as StatusVenc, proximoVenc: "2026-11-15" },
  { id: "E-05", nome: "Ar-Condicionado Sala Limpa", codigo: "AR-08", tipo: "Climatização", fabricante: "AirCorp", modelo: "AC-9000", setor: "Sala Limpa", criticidade: "Alta", status: "vencido" as StatusVenc, proximoVenc: "2026-06-28" },
  { id: "E-06", nome: "Refrigerador Vacinas", codigo: "RF-11", tipo: "Armazenamento", fabricante: "ColdMax", modelo: "CM-200", setor: "Farmácia", criticidade: "Crítica", status: "ok" as StatusVenc, proximoVenc: "2027-01-20" },
];

export const manutencoes = [
  { id: "M-501", equipamento: "Autoclave AC-01", tipo: "Preventiva", data: "2026-07-10", responsavel: "SterilTech", status: "atencao" as StatusVenc, os: "OS-8821" },
  { id: "M-502", equipamento: "Ar-Cond. AR-08", tipo: "Corretiva", data: "2026-06-28", responsavel: "AirCorp Serviços", status: "vencido" as StatusVenc, os: "OS-8815" },
  { id: "M-503", equipamento: "—", tipo: "Recorrente Geral", data: "2026-07-30", responsavel: "Higienização Total", status: "ok" as StatusVenc, os: "OS-8830" },
  { id: "M-504", equipamento: "Câmara Fria CF-02", tipo: "Preventiva", data: "2026-08-05", responsavel: "ColdMax", status: "ok" as StatusVenc, os: "OS-8833" },
  { id: "M-505", equipamento: "Balança BL-04", tipo: "Preventiva", data: "2026-07-15", responsavel: "Precisa Metrologia", status: "atencao" as StatusVenc, os: "OS-8840" },
];

export const alertas = [
  { id: "A-9001", marco: "60 dias", item: "Certificado BPF-221", canal: "E-mail + Central", data: "2026-08-30", nivel: "info" },
  { id: "A-9002", marco: "30 dias", item: "Licença Ambiental LO-4488", canal: "Central", data: "2026-07-10", nivel: "info" },
  { id: "A-9003", marco: "15 dias", item: "PGRSS-19", canal: "E-mail + Central", data: "2026-07-15", nivel: "atencao" },
  { id: "A-9004", marco: "7 dias", item: "Alvará AS-2025-0091", canal: "E-mail + Dashboard", data: "2026-07-06", nivel: "critico" },
  { id: "A-9005", marco: "No vencimento", item: "Calibração BL-04", canal: "E-mail + Dashboard", data: "2026-07-02", nivel: "critico" },
  { id: "A-9006", marco: "Após vencido", item: "Autorização ANV-778", canal: "E-mail + Dashboard", data: "2026-05-01", nivel: "vencido" },
];

export const auditoriaLogs = [
  { id: "L-77021", data: "2026-07-04 09:12", usuario: "marina.alves@empresa.com", acao: "Substituição de arquivo", entidade: "Documento D-103 (PGRSS)", ip: "189.14.22.10" },
  { id: "L-77020", data: "2026-07-04 08:47", usuario: "rafael.souza@empresa.com", acao: "Criação", entidade: "Manutenção M-505", ip: "189.14.22.12" },
  { id: "L-77019", data: "2026-07-03 17:33", usuario: "admin@conformflow.io", acao: "Alteração de permissões", entidade: "Usuário camila.torres", ip: "10.0.0.4" },
  { id: "L-77018", data: "2026-07-03 15:02", usuario: "camila.torres@empresa.com", acao: "Download", entidade: "Documento D-102", ip: "189.14.22.20" },
  { id: "L-77017", data: "2026-07-03 09:00", usuario: "marina.alves@empresa.com", acao: "Login", entidade: "Sessão", ip: "189.14.22.10" },
  { id: "L-77016", data: "2026-07-02 18:41", usuario: "rafael.souza@empresa.com", acao: "Exclusão lógica", entidade: "Documento D-090", ip: "189.14.22.12" },
];

export const usuarios = [
  { id: "U-01", nome: "Marina Alves", email: "marina.alves@empresa.com", perfil: "Administrador", setor: "Regulatório", status: "Ativo" },
  { id: "U-02", nome: "Rafael Souza", email: "rafael.souza@empresa.com", perfil: "Responsável técnico", setor: "Manutenção", status: "Ativo" },
  { id: "U-03", nome: "Camila Torres", email: "camila.torres@empresa.com", perfil: "Colaborador", setor: "Operações", status: "Ativo" },
  { id: "U-04", nome: "Auditor Externo", email: "auditor@parceiro.com", perfil: "Somente leitura", setor: "—", status: "Ativo" },
];

export function statusLabel(s: StatusVenc) {
  return { vencido: "Vencido", critico: "Crítico", atencao: "Atenção", ok: "Em dia" }[s];
}

export function statusTone(s: StatusVenc) {
  return {
    vencido: "bg-danger/10 text-danger border-danger/30",
    critico: "bg-danger/10 text-danger border-danger/30",
    atencao: "bg-warning/10 text-warning border-warning/30",
    ok: "bg-success/10 text-success border-success/30",
  }[s];
}