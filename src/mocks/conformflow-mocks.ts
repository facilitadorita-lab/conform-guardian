// Dados mockados centralizados. Não importar diretamente das páginas —
// sempre acessar via services em src/services/*.
export type StatusVenc = "vencido" | "critico" | "atencao" | "ok";

// ---------- Sessão / contexto atual (mock) ----------
export type EmpresaStatus = "ativa" | "inadimplente" | "suspensa" | "bloqueada" | "cancelada";

export interface EmpresaAtualMock {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  status: EmpresaStatus;
  plano: string;
  proximo_vencimento: string;
  motivo_bloqueio?: string;
}

export interface UsuarioAtualMock {
  id: string;
  nome: string;
  email: string;
  perfil: "Admin Master" | "Administrador" | "Responsável Técnico" | "Colaborador";
  isMaster: boolean;
}

export const empresaAtualMock: EmpresaAtualMock = {
  id: "EMP-001",
  razao_social: "Clínica Vitalis Ltda.",
  nome_fantasia: "Clínica Vitalis",
  cnpj: "12.345.678/0001-90",
  status: "ativa",
  plano: "Professional",
  proximo_vencimento: "2026-08-10",
};

export const usuarioAtualMock: UsuarioAtualMock = {
  id: "U-01",
  nome: "Marina Alves",
  email: "marina.alves@empresa.com",
  perfil: "Administrador",
  isMaster: false,
};

// ---------- Dados de Admin Master ----------
export const masterPlanos = [
  { id: "PL-STARTER", nome: "Starter", valor: 149, ativo: true, empresas: 42, recursos: { documentos: true, equipamentos: true, manutencoes: false, auditoria: false, alertas: true, usuarios: 3 } },
  { id: "PL-PRO", nome: "Professional", valor: 349, ativo: true, empresas: 118, recursos: { documentos: true, equipamentos: true, manutencoes: true, auditoria: true, alertas: true, usuarios: 15 } },
  { id: "PL-ENT", nome: "Enterprise", valor: 899, ativo: true, empresas: 27, recursos: { documentos: true, equipamentos: true, manutencoes: true, auditoria: true, alertas: true, usuarios: 100 } },
] as const;

export const masterEmpresas = [
  { id: "EMP-001", razao: "Clínica Vitalis Ltda.", fantasia: "Clínica Vitalis", cnpj: "12.345.678/0001-90", plano: "Professional", status: "ativa" as EmpresaStatus, usuarios: 12, documentos: 48, equipamentos: 22, assinatura: "ativa", desde: "2024-05-11" },
  { id: "EMP-002", razao: "LabAnalytics S.A.", fantasia: "LabAnalytics", cnpj: "22.981.221/0001-05", plano: "Enterprise", status: "ativa" as EmpresaStatus, usuarios: 48, documentos: 132, equipamentos: 87, assinatura: "ativa", desde: "2023-11-02" },
  { id: "EMP-003", razao: "Farma+ Distribuidora", fantasia: "Farma+", cnpj: "33.117.008/0001-71", plano: "Starter", status: "inadimplente" as EmpresaStatus, usuarios: 3, documentos: 14, equipamentos: 6, assinatura: "atrasada", desde: "2025-01-19" },
  { id: "EMP-004", razao: "Hospital São Bento", fantasia: "Hosp. São Bento", cnpj: "44.220.100/0001-33", plano: "Enterprise", status: "ativa" as EmpresaStatus, usuarios: 92, documentos: 214, equipamentos: 158, assinatura: "ativa", desde: "2022-08-30" },
  { id: "EMP-005", razao: "Odonto Prime", fantasia: "Odonto Prime", cnpj: "55.802.441/0001-12", plano: "Starter", status: "suspensa" as EmpresaStatus, usuarios: 5, documentos: 12, equipamentos: 4, assinatura: "suspensa", desde: "2025-03-05" },
  { id: "EMP-006", razao: "BioQuímica Sul", fantasia: "BioQuímica Sul", cnpj: "66.311.980/0001-09", plano: "Professional", status: "ativa" as EmpresaStatus, usuarios: 22, documentos: 63, equipamentos: 41, assinatura: "ativa", desde: "2024-02-14" },
];

export const masterAssinaturas = [
  { id: "AS-9001", empresa: "Clínica Vitalis Ltda.", plano: "Professional", inicio: "2024-05-11", proximaCobranca: "2026-08-10", valor: 349, status: "ativa" },
  { id: "AS-9002", empresa: "LabAnalytics S.A.", plano: "Enterprise", inicio: "2023-11-02", proximaCobranca: "2026-08-02", valor: 899, status: "ativa" },
  { id: "AS-9003", empresa: "Farma+ Distribuidora", plano: "Starter", inicio: "2025-01-19", proximaCobranca: "2026-07-19", valor: 149, status: "atrasada" },
  { id: "AS-9004", empresa: "Hospital São Bento", plano: "Enterprise", inicio: "2022-08-30", proximaCobranca: "2026-08-30", valor: 899, status: "ativa" },
  { id: "AS-9005", empresa: "Odonto Prime", plano: "Starter", inicio: "2025-03-05", proximaCobranca: "2026-07-05", valor: 149, status: "suspensa" },
];

export const masterFinanceiro = {
  mrr: 68420,
  arr: 821040,
  receitaMes: 71230,
  ticketMedio: 386,
  churn: 2.1,
  inadimplenciaPct: 4.8,
  meses: [
    { mes: "Fev", receita: 54210 },
    { mes: "Mar", receita: 58020 },
    { mes: "Abr", receita: 61140 },
    { mes: "Mai", receita: 63980 },
    { mes: "Jun", receita: 67210 },
    { mes: "Jul", receita: 71230 },
  ],
};

export const masterUsuariosAtivos = [
  { empresa: "Clínica Vitalis Ltda.", ativos: 12, ultimosLogin: "2026-07-11" },
  { empresa: "LabAnalytics S.A.", ativos: 48, ultimosLogin: "2026-07-12" },
  { empresa: "Hospital São Bento", ativos: 92, ultimosLogin: "2026-07-12" },
  { empresa: "BioQuímica Sul", ativos: 22, ultimosLogin: "2026-07-10" },
  { empresa: "Farma+ Distribuidora", ativos: 3, ultimosLogin: "2026-06-28" },
];

export const masterInadimplentes = [
  { empresa: "Farma+ Distribuidora", plano: "Starter", valor: 149, diasAtraso: 12, ultimaTentativa: "2026-07-08" },
  { empresa: "Odonto Prime", plano: "Starter", valor: 149, diasAtraso: 38, ultimaTentativa: "2026-07-04" },
  { empresa: "TechDiag Imagem", plano: "Professional", valor: 349, diasAtraso: 4, ultimaTentativa: "2026-07-10" },
];

export const masterProximosPagamentos = [
  { empresa: "Farma+ Distribuidora", vencimento: "2026-07-19", valor: 149, plano: "Starter" },
  { empresa: "LabAnalytics S.A.", vencimento: "2026-08-02", valor: 899, plano: "Enterprise" },
  { empresa: "Clínica Vitalis Ltda.", vencimento: "2026-08-10", valor: 349, plano: "Professional" },
  { empresa: "BioQuímica Sul", vencimento: "2026-08-14", valor: 349, plano: "Professional" },
  { empresa: "Hospital São Bento", vencimento: "2026-08-30", valor: 899, plano: "Enterprise" },
];

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