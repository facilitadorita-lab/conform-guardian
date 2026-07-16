import type { ISODate, StatusConformidade, UUID } from "./domain";
import type {
  CompanyAccessStatus,
  CompanyVerificationStatus,
  SubscriptionStatusNormalized,
} from "./company-verification";

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
  anexoMimeType?: string | null;
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
  risco?: "baixo" | "medio" | "alto";
  categoria?: string;
  detalhes?: Record<string, unknown> | null;
  userAgent?: string | null;
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
  verificationStatus?: CompanyVerificationStatus;
  accessStatus?: CompanyAccessStatus;
  subscriptionStatus?: SubscriptionStatusNormalized;
  plano?: EmpresaPlanoResumo | null;
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
    | "administrador_provisorio"
    | "administrador"
    | "responsavel_tecnico"
    | "colaborador"
    | "somente_leitura"
    | "master";
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

export interface AuditoriaAvancadaResumo {
  eventos_30d: number;
  eventos_alto_risco_30d: number;
  downloads_30d: number;
  visualizacoes_30d: number;
  substituicoes_30d: number;
}

export interface AuditoriaAvancada {
  resumo: AuditoriaAvancadaResumo;
  por_modulo: Array<{ modulo: string; total: number }>;
  eventos: LogAuditoriaResumo[];
}

export interface MatrizDocumentalItem {
  id: UUID;
  segmento_chave: string;
  nome: string;
  categoria?: string | null;
  tipo?: string | null;
  orgao?: string | null;
  periodicidade_meses?: number | null;
  setor?: string | null;
  obrigatorio: boolean;
  observacoes?: string | null;
  documento_id?: UUID | null;
  status: StatusConformidade | "pendente_cadastro" | "cadastrado";
}

export interface MatrizDocumentalEmpresa {
  empresa: {
    id: UUID;
    nome: string;
    tipo_estabelecimento?: string | null;
    segmento?: string | null;
  };
  chaves: string[];
  resumo: {
    exigidos: number;
    cadastrados: number;
  };
  itens: MatrizDocumentalItem[];
}

export interface OnboardingItem {
  id: string;
  titulo: string;
  descricao: string;
  concluido: boolean;
}

export interface OnboardingEmpresa {
  progresso_percentual: number;
  concluidos: number;
  total: number;
  itens: OnboardingItem[];
}

export interface RelatorioExecutivoIA {
  empresa: {
    id: UUID;
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    tipo_estabelecimento?: string | null;
    segmento?: string | null;
  };
  gerado_em: string;
  politica_ia: {
    tipo: string;
    leu_anexos: boolean;
    fonte: string;
  };
  resumo: {
    indice_conformidade: number;
    risco_operacional: string;
    documentos_vencidos: number;
    vencendo_30_dias: number;
    equipamentos_atencao: number;
    manutencoes_vencidas: number;
    pendencias_abertas: number;
    onboarding_percentual: number;
    matriz_exigidos: number;
    matriz_cadastrados: number;
  };
  analise_ia: string[];
  recomendacoes: string[];
  itens_criticos: Array<Record<string, unknown>>;
  matriz_documental: MatrizDocumentalEmpresa;
  onboarding: OnboardingEmpresa;
}

export type PlanoRecurso =
  | "assistente_ia"
  | "vencimentos"
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

export interface EmpresaPlanoResumo {
  id?: UUID | null;
  nome?: string | null;
  codigo?: string | null;
  recursos: Partial<Record<PlanoRecurso, boolean>>;
  limite_usuarios?: number | null;
  limite_documentos?: number | null;
  limite_equipamentos?: number | null;
  limite_storage_mb?: number | null;
}

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
