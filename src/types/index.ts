// Tipos de domínio do Conform Flow.
// Reflete o modelo previsto para o backend Supabase (multi-tenant por empresa_id).

export type UUID = string;
export type ISODateString = string;

export type StatusConformidade = "vencido" | "critico" | "atencao" | "ok";

export type PerfilUsuario =
  | "admin_master"
  | "administrador"
  | "responsavel_tecnico"
  | "colaborador"
  | "somente_leitura";

export interface Empresa {
  id: UUID;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  segmento?: string | null;
  ativo: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Usuario {
  id: UUID;
  email: string;
  nome: string;
  avatar_url?: string | null;
  ativo: boolean;
  created_at: ISODateString;
}

export interface UsuarioEmpresa {
  id: UUID;
  usuario_id: UUID;
  empresa_id: UUID;
  perfil: PerfilUsuario;
  setor?: string | null;
  ativo: boolean;
  created_at: ISODateString;
}

export interface Anexo {
  id: UUID;
  empresa_id: UUID;
  entidade: "documento" | "equipamento" | "manutencao" | "pendencia" | "calibracao" | "qualificacao";
  entidade_id: UUID;
  nome_arquivo: string;
  mime_type: string;
  tamanho_bytes: number;
  storage_path: string;
  criado_por: UUID;
  created_at: ISODateString;
}

export interface Documento {
  id: UUID;
  empresa_id: UUID;
  nome: string;
  categoria: string;
  tipo: string;
  numero?: string | null;
  orgao_emissor?: string | null;
  responsavel_id?: UUID | null;
  setor?: string | null;
  data_emissao?: ISODateString | null;
  data_vencimento?: ISODateString | null;
  status: StatusConformidade;
  observacoes?: string | null;
  deleted_at?: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface DocumentoVersao {
  id: UUID;
  documento_id: UUID;
  empresa_id: UUID;
  versao: number;
  anexo_id: UUID;
  motivo_substituicao?: string | null;
  criado_por: UUID;
  created_at: ISODateString;
}

export interface Equipamento {
  id: UUID;
  empresa_id: UUID;
  nome: string;
  codigo: string;
  tipo: string;
  fabricante?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  setor?: string | null;
  criticidade: "Baixa" | "Média" | "Alta" | "Crítica";
  status: StatusConformidade;
  proximo_vencimento?: ISODateString | null;
  deleted_at?: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Calibracao {
  id: UUID;
  empresa_id: UUID;
  equipamento_id: UUID;
  data_execucao: ISODateString;
  proxima_data: ISODateString;
  laboratorio?: string | null;
  certificado?: string | null;
  resultado: "conforme" | "nao_conforme" | "conforme_com_ressalvas";
  status: StatusConformidade;
  created_at: ISODateString;
}

export interface Qualificacao {
  id: UUID;
  empresa_id: UUID;
  equipamento_id: UUID;
  tipo: "IQ" | "OQ" | "PQ" | "DQ";
  data_execucao: ISODateString;
  proxima_data: ISODateString;
  executor?: string | null;
  status: StatusConformidade;
  created_at: ISODateString;
}

export interface Manutencao {
  id: UUID;
  empresa_id: UUID;
  equipamento_id?: UUID | null;
  tipo: "Preventiva" | "Corretiva" | "Recorrente Geral";
  ordem_servico?: string | null;
  data_programada: ISODateString;
  data_execucao?: ISODateString | null;
  responsavel?: string | null;
  status: StatusConformidade;
  deleted_at?: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Pendencia {
  id: UUID;
  empresa_id: UUID;
  origem: "documento" | "equipamento" | "manutencao" | "manual";
  origem_id?: UUID | null;
  titulo: string;
  descricao?: string | null;
  responsavel_id?: UUID | null;
  data_vencimento?: ISODateString | null;
  status: StatusConformidade;
  resolvida_em?: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface TratativaPendencia {
  id: UUID;
  empresa_id: UUID;
  pendencia_id: UUID;
  autor_id: UUID;
  descricao: string;
  anexo_id?: UUID | null;
  created_at: ISODateString;
}

export interface Alerta {
  id: UUID;
  empresa_id: UUID;
  marco: "60d" | "30d" | "15d" | "7d" | "no_vencimento" | "apos_vencido";
  entidade: "documento" | "equipamento" | "manutencao" | "calibracao" | "qualificacao";
  entidade_id: UUID;
  data_disparo: ISODateString;
  canais: Array<"email" | "central" | "dashboard">;
  nivel: "info" | "atencao" | "critico" | "vencido";
  enviado: boolean;
  created_at: ISODateString;
}

export interface LogAuditoria {
  id: UUID;
  empresa_id: UUID | null;
  usuario_id: UUID | null;
  usuario_email: string;
  acao: string;
  entidade: string;
  entidade_id?: UUID | null;
  ip?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: ISODateString;
}