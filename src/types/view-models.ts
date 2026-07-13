import type { ISODate, StatusConformidade, UUID } from "./domain";

export interface DashboardResumo {
  indiceConformidade: number;
  documentosVencidos: number;
  vencendo7: number;
  vencendo30: number;
  vencendo60: number;
  equipamentosAtencao: number;
  manutencoesVencidas: number;
  manutencoesProximas: number;
  pendenciasCriticas: number;
  semAnexo: number;
  semResponsavel: number;
}

export interface PendenciaResumo {
  id: UUID;
  item: string;
  tipo: string;
  responsavel: string;
  vencimento: ISODate;
  diasRestantes: number;
  status: StatusConformidade;
}

export interface DocumentoResumo {
  id: UUID;
  nome: string;
  categoria: string;
  tipo: string;
  numero: string;
  orgao: string;
  responsavel: string;
  emissao: ISODate;
  vencimento: ISODate;
  status: StatusConformidade;
  setor: string;
  anexoId?: UUID | null;
  anexoUrl?: string | null;
  anexoNome?: string | null;
}

export interface EquipamentoResumo {
  id: UUID;
  nome: string;
  codigo: string;
  tipo: string;
  fabricante: string;
  modelo: string;
  setor: string;
  criticidade: "Baixa" | "Media" | "Alta" | "Critica";
  status: StatusConformidade;
  proximoVenc: ISODate;
}

export interface ManutencaoResumo {
  id: UUID;
  equipamentoId?: UUID | null;
  equipamento: string;
  natureza?: "preventiva" | "corretiva" | string | null;
  tipo: string;
  data: ISODate;
  responsavel: string;
  status: StatusConformidade;
  os: string;
  statusExecucao?: string | null;
}

export interface AlertaResumo {
  id: UUID;
  marco: string;
  item: string;
  canal: string;
  data: ISODate;
  nivel: StatusConformidade | "info";
}

export interface LogAuditoriaResumo {
  id: UUID;
  data: string;
  usuario: string;
  acao: string;
  entidade: string;
  ip: string;
}

export interface UsuarioResumo {
  id: UUID;
  nome: string;
  email: string;
  perfil: "Administrador" | "Responsavel tecnico" | "Colaborador" | "Somente leitura";
  setor: string;
  status: "Ativo" | "Inativo";
}

export interface EmpresaResumo {
  id: UUID;
  nome: string;
  cnpj: string;
  status: "ativa" | "bloqueada" | "cancelada";
}

export interface AuthContexto {
  usuario: {
    id: UUID;
    nome: string;
    email: string;
    isMaster: boolean;
  };
  empresaAtual: EmpresaResumo;
  empresasPermitidas: EmpresaResumo[];
  perfilAtual:
    "administrador" | "responsavel_tecnico" | "colaborador" | "somente_leitura" | "master";
}

export interface RelatorioCatalogoItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export interface ConfiguracaoCatalogoItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export type PlanoRecurso =
  | "documentos"
  | "equipamentos"
  | "calibracoes"
  | "qualificacoes"
  | "manutencoes"
  | "pendencias"
  | "alertas"
  | "relatorios"
  | "auditoria"
  | "usuarios"
  | "anexos"
  | "multi_unidades"
  | "suporte_prioritario";

export type StatusAssinatura =
  "trial" | "ativa" | "pagamento_pendente" | "inadimplente" | "bloqueada" | "cancelada";

export interface PlanoComercialResumo {
  id: UUID;
  nome: string;
  codigo: string;
  descricao?: string | null;
  valor_mensal_centavos: number;
  valor_anual_centavos?: number | null;
  moeda: "BRL";
  limite_usuarios: number;
  limite_documentos?: number | null;
  limite_equipamentos?: number | null;
  limite_storage_mb: number;
  trial_dias: number;
  disponivel_venda: boolean;
  ativo: boolean;
  recursos: Partial<Record<PlanoRecurso, boolean>>;
}

export interface AssinaturaEmpresaResumo {
  empresa_id: UUID;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  empresa_status: "ativa" | "bloqueada" | "cancelada";
  plano_id?: UUID | null;
  plano_nome?: string | null;
  status?: StatusAssinatura | null;
  ciclo?: "mensal" | "anual" | "personalizado" | null;
  valor_mensal_centavos?: number | null;
  valor_anual_centavos?: number | null;
  desconto_centavos?: number | null;
  desconto_percentual?: number | null;
  proximo_vencimento?: ISODate | null;
  ultimo_pagamento_em?: ISODate | null;
  usuarios_ativos: number;
}

export interface FinanceiroResumoMaster {
  empresas_ativas: number;
  empresas_bloqueadas: number;
  assinaturas_ativas: number;
  assinaturas_inadimplentes: number;
  usuarios_ativos: number;
  receita_mensal_prevista_centavos: number;
  receita_recebida_mes_centavos: number;
  proximos_pagamentos: Array<{
    empresa_id: UUID;
    nome_fantasia: string;
    cnpj: string;
    status: StatusAssinatura;
    proximo_vencimento?: ISODate | null;
    valor_centavos: number;
  }>;
  pagamentos_atrasados: Array<{
    empresa_id: UUID;
    nome_fantasia: string;
    cnpj: string;
    fatura_id: UUID;
    vencimento: ISODate;
    valor_centavos: number;
    status: "pendente" | "vencida";
  }>;
}
