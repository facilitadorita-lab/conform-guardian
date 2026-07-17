export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export type StatusConformidade = "ok" | "atencao" | "critico" | "vencido" | "sem_validade";

export interface EntidadeAuditavel {
  id: UUID;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
  deleted_at?: ISODateTime | null;
  created_by?: UUID | null;
  updated_by?: UUID | null;
}

export interface Empresa extends EntidadeAuditavel {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  tipo_estabelecimento?: string | null;
  segmento?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone?: string | null;
  email_principal?: string | null;
  responsavel_legal?: string | null;
  responsavel_tecnico?: string | null;
  conselho_profissional?: string | null;
  plano_id?: UUID | null;
  status: "ativa" | "bloqueada" | "cancelada";
  observacoes?: string | null;
}

export interface Usuario extends EntidadeAuditavel {
  nome: string;
  email: string;
  telefone?: string | null;
  cargo?: string | null;
  is_master: boolean;
  status: "ativo" | "inativo";
  ultimo_acesso?: ISODateTime | null;
}

export interface UsuarioEmpresa extends EntidadeAuditavel {
  usuario_id: UUID;
  empresa_id: UUID;
  perfil: "administrador" | "responsavel_tecnico" | "colaborador" | "somente_leitura";
  ativo: boolean;
}

export interface Documento extends EntidadeAuditavel {
  empresa_id: UUID;
  nome: string;
  categoria_id?: UUID | null;
  tipo_documento_id?: UUID | null;
  numero_documento?: string | null;
  orgao_emissor?: string | null;
  responsavel_id?: UUID | null;
  data_emissao?: ISODate | null;
  data_vencimento?: ISODate | null;
  periodicidade_meses?: number | null;
  alerta_antecedencia_dias?: number[];
  exige_anexo: boolean;
  setor_unidade?: string | null;
  observacoes?: string | null;
}

export interface DocumentoVersao extends EntidadeAuditavel {
  empresa_id: UUID;
  documento_id: UUID;
  versao: number;
  anexo_id?: UUID | null;
  observacoes?: string | null;
  vigente: boolean;
}

export interface Equipamento extends EntidadeAuditavel {
  empresa_id: UUID;
  nome: string;
  tipo_equipamento_id?: UUID | null;
  codigo_interno?: string | null;
  numero_serie?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  setor?: string | null;
  localizacao?: string | null;
  criticidade: "baixa" | "media" | "alta" | "critica";
  status: "ativo" | "inativo" | "em_manutencao" | "descartado";
  responsavel_id?: UUID | null;
  observacoes?: string | null;
}

export interface Manutencao extends EntidadeAuditavel {
  empresa_id: UUID;
  equipamento_id?: UUID | null;
  nome_servico?: string | null;
  natureza: "preventiva" | "corretiva";
  tipo_servico: "inspecao" | "limpeza" | "validacao" | "reparo" | "troca_peca" | "ajuste" | "outro";
  status_execucao: "programada" | "em_andamento" | "concluida" | "cancelada";
  data_manutencao: ISODate;
  proxima_manutencao?: ISODate | null;
  periodicidade_meses?: number | null;
  empresa_responsavel?: string | null;
  tecnico_responsavel?: string | null;
  numero_ordem_servico?: string | null;
  responsavel_interno_id?: UUID | null;
  exige_evidencia: boolean;
  prioridade?: "baixa" | "media" | "alta" | "critica" | null;
  observacoes?: string | null;
}

export interface Pendencia extends EntidadeAuditavel {
  empresa_id: UUID;
  modulo: string;
  registro_id: UUID;
  tipo: string;
  titulo: string;
  responsavel_id?: UUID | null;
  prazo?: ISODate | null;
  status: "pendente" | "em_andamento" | "concluida" | "cancelada";
  concluida_at?: ISODateTime | null;
}

export interface TratativaPendencia extends EntidadeAuditavel {
  empresa_id: UUID;
  pendencia_id: UUID;
  descricao: string;
  responsavel_id?: UUID | null;
  prazo?: ISODate | null;
  status: "pendente" | "em_andamento" | "concluida" | "cancelada";
  data_conclusao?: ISODateTime | null;
}

export interface Alerta extends EntidadeAuditavel {
  empresa_id: UUID;
  usuario_id?: UUID | null;
  modulo: string;
  registro_id: UUID;
  marco_dias: number;
  titulo: string;
  mensagem: string;
  data_vencimento?: ISODate | null;
  status: "nao_lido" | "lido" | "arquivado";
  email_status: "pendente" | "enviado" | "falhou" | "dispensado";
  email_enviado_at?: ISODateTime | null;
}

export interface Anexo extends EntidadeAuditavel {
  empresa_id: UUID;
  modulo:
    "documentos" | "equipamentos" | "calibracoes" | "qualificacoes" | "manutencoes" | "pendencias";
  registro_id: UUID;
  finalidade: string;
  storage_path: string;
  nome_original: string;
  mime_type: string;
  tamanho_bytes: number;
  versao: number;
  substitui_anexo_id?: UUID | null;
  status: "ativo" | "substituido" | "excluido";
}

export interface LogAuditoria {
  id: UUID;
  empresa_id?: UUID | null;
  usuario_id?: UUID | null;
  modulo: string;
  acao: string;
  registro_id?: UUID | null;
  valor_anterior?: Record<string, unknown> | null;
  novo_valor?: Record<string, unknown> | null;
  ip?: string | null;
  user_agent?: string | null;
  created_at: ISODateTime;
}
