-- Conform Flow — schema base
create extension if not exists pgcrypto;

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  limite_usuarios integer not null default 5,
  limite_documentos integer,
  limite_equipamentos integer,
  limite_storage_mb integer not null default 1024,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text not null,
  cnpj text not null unique,
  tipo_estabelecimento text,
  segmento text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado char(2),
  cep text,
  telefone text,
  email_principal text,
  responsavel_legal text,
  responsavel_tecnico text,
  conselho_profissional text,
  plano_id uuid references public.planos(id),
  status text not null default 'ativa' check (status in ('ativa','bloqueada','cancelada')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  cargo text,
  is_master boolean not null default false,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  ultimo_acesso timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.usuarios_empresas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  empresa_id uuid not null references public.empresas(id),
  perfil text not null check (perfil in ('administrador','responsavel_tecnico','colaborador','somente_leitura')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (usuario_id, empresa_id)
);

create table if not exists public.categorias_documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  nome text not null,
  descricao text,
  padrao_plataforma boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.tipos_documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  nome text not null,
  exige_anexo boolean not null default true,
  padrao_plataforma boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.tipos_equipamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  nome text not null,
  padrao_plataforma boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  nome text not null,
  categoria_id uuid references public.categorias_documentos(id),
  tipo_documento_id uuid references public.tipos_documentos(id),
  numero_documento text,
  orgao_emissor text,
  responsavel_id uuid references public.usuarios(id),
  data_emissao date,
  data_vencimento date,
  periodicidade_meses integer,
  alerta_antecedencia_dias integer[] default array[60,30,15,7,0],
  exige_anexo boolean not null default true,
  setor_unidade text,
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  nome text not null,
  tipo_equipamento_id uuid references public.tipos_equipamentos(id),
  codigo_interno text,
  numero_serie text,
  fabricante text,
  modelo text,
  setor text,
  localizacao text,
  criticidade text not null default 'media' check (criticidade in ('baixa','media','alta','critica')),
  status text not null default 'ativo' check (status in ('ativo','inativo','em_manutencao','descartado')),
  responsavel_id uuid references public.usuarios(id),
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id),
  unique (empresa_id, codigo_interno)
);

create table if not exists public.calibracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid not null references public.equipamentos(id),
  data_calibracao date not null,
  data_vencimento date,
  numero_certificado text,
  laboratorio_responsavel text,
  resultado text not null check (resultado in ('aprovado','reprovado','aprovado_restricao','nao_aplicavel')),
  responsavel_id uuid references public.usuarios(id),
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id),
  unique (empresa_id, numero_certificado)
);

create table if not exists public.qualificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid not null references public.equipamentos(id),
  tipo text not null check (tipo in ('instalacao','operacao','desempenho','mapeamento_termico','requalificacao_periodica','outro')),
  data_qualificacao date not null,
  data_vencimento date,
  resultado text not null check (resultado in ('aprovado','reprovado','aprovado_restricao','nao_aplicavel')),
  responsavel_tecnico_id uuid references public.usuarios(id),
  empresa_executora text,
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.manutencoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid references public.equipamentos(id),
  nome_servico text,
  natureza text not null check (natureza in ('preventiva','corretiva')),
  tipo_servico text not null default 'outro' check (tipo_servico in ('inspecao','limpeza','validacao','reparo','troca_peca','ajuste','outro')),
  status_execucao text not null default 'concluida' check (status_execucao in ('programada','em_andamento','concluida','cancelada')),
  data_manutencao date not null,
  proxima_manutencao date,
  periodicidade_meses integer check (periodicidade_meses is null or periodicidade_meses > 0),
  empresa_responsavel text,
  tecnico_responsavel text,
  numero_ordem_servico text,
  responsavel_interno_id uuid references public.usuarios(id),
  exige_evidencia boolean not null default true,
  falha_apresentada text,
  prioridade text check (prioridade is null or prioridade in ('baixa','media','alta','critica')),
  diagnostico text,
  causa_raiz text,
  acao_realizada text,
  equipamento_parado_desde timestamptz,
  retorno_operacao_at timestamptz,
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id),
  check (equipamento_id is not null or nullif(trim(nome_servico),'') is not null),
  check (natureza <> 'corretiva' or equipamento_id is not null),
  check (retorno_operacao_at is null or equipamento_parado_desde is null or retorno_operacao_at >= equipamento_parado_desde)
);

create table if not exists public.anexos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  modulo text not null check (modulo in ('documentos','equipamentos','calibracoes','qualificacoes','manutencoes','pendencias')),
  registro_id uuid not null,
  finalidade text not null default 'principal',
  storage_path text not null unique,
  nome_original text not null,
  mime_type text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0),
  versao integer not null default 1,
  substitui_anexo_id uuid references public.anexos(id),
  status text not null default 'ativo' check (status in ('ativo','substituido','excluido')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.pendencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  modulo text not null,
  registro_id uuid not null,
  tipo text not null,
  titulo text not null,
  responsavel_id uuid references public.usuarios(id),
  prazo date,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluida','cancelada')),
  concluida_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.tratativas_pendencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  pendencia_id uuid not null references public.pendencias(id),
  descricao text not null,
  responsavel_id uuid references public.usuarios(id),
  prazo date,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluida','cancelada')),
  data_conclusao timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  usuario_id uuid references public.usuarios(id),
  modulo text not null,
  registro_id uuid not null,
  marco_dias integer not null,
  titulo text not null,
  mensagem text not null,
  data_vencimento date,
  status text not null default 'nao_lido' check (status in ('nao_lido','lido','arquivado')),
  email_status text not null default 'pendente' check (email_status in ('pendente','enviado','falhou','dispensado')),
  email_enviado_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id),
  unique (empresa_id, usuario_id, modulo, registro_id, marco_dias)
);

create table if not exists public.configuracoes_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id),
  dias_alerta integer[] not null default array[60,30,15,7,0],
  enviar_email boolean not null default true,
  email_remetente_nome text default 'Conform Flow',
  categorias_alerta uuid[],
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  usuario_id uuid references public.usuarios(id),
  modulo text not null,
  acao text not null,
  registro_id uuid,
  valor_anterior jsonb,
  novo_valor jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_documentos_empresa_vencimento on public.documentos(empresa_id, data_vencimento) where deleted_at is null;
create index if not exists idx_equipamentos_empresa on public.equipamentos(empresa_id) where deleted_at is null;
create index if not exists idx_calibracoes_equipamento_data on public.calibracoes(equipamento_id, data_calibracao desc) where deleted_at is null;
create index if not exists idx_qualificacoes_equipamento_data on public.qualificacoes(equipamento_id, data_qualificacao desc) where deleted_at is null;
create index if not exists idx_manutencoes_empresa_proxima on public.manutencoes(empresa_id, proxima_manutencao) where deleted_at is null;
create index if not exists idx_anexos_registro on public.anexos(empresa_id, modulo, registro_id) where deleted_at is null;
create index if not exists idx_pendencias_empresa_status on public.pendencias(empresa_id, status) where deleted_at is null;
create index if not exists idx_alertas_usuario_status on public.alertas(usuario_id, status) where deleted_at is null;
create index if not exists idx_logs_empresa_data on public.logs_auditoria(empresa_id, created_at desc);
