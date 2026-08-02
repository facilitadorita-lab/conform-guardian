-- Conform Flow - núcleo estrutural de multiunidade.
-- Migration aditiva, idempotente e sem remoção dos campos textuais legados.

create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  codigo text not null,
  nome text not null,
  tipo text,
  descricao text,
  cnpj text,
  telefone text,
  email text,
  responsavel_id uuid references public.usuarios(id) on delete set null,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado char(2),
  cep text,
  timezone text not null default 'America/Sao_Paulo',
  is_matriz boolean not null default false,
  status text not null default 'ativa',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  constraint unidades_status_check
    check (status in ('ativa', 'inativa', 'em_implantacao', 'arquivada')),
  constraint unidades_codigo_check check (btrim(codigo) <> ''),
  constraint unidades_nome_check check (btrim(nome) <> ''),
  constraint unidades_cnpj_check
    check (cnpj is null or length(regexp_replace(cnpj, '\D', '', 'g')) = 14),
  constraint unidades_id_empresa_unique unique (id, empresa_id)
);

create unique index if not exists uq_unidades_empresa_codigo_ativo
  on public.unidades (empresa_id, lower(btrim(codigo)))
  where deleted_at is null;

create unique index if not exists uq_unidades_empresa_matriz_ativa
  on public.unidades (empresa_id)
  where is_matriz and deleted_at is null and status <> 'arquivada';

create index if not exists idx_unidades_empresa_status
  on public.unidades (empresa_id, status)
  where deleted_at is null;

create index if not exists idx_unidades_responsavel
  on public.unidades (responsavel_id)
  where deleted_at is null;

-- Toda empresa pré-existente recebe exatamente uma matriz, inclusive empresas
-- arquivadas que ainda possuem registros históricos sujeitos às novas FKs.
insert into public.unidades (
  empresa_id,
  codigo,
  nome,
  tipo,
  cnpj,
  telefone,
  email,
  endereco,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  cep,
  is_matriz,
  status,
  observacoes
)
select
  e.id,
  'MATRIZ',
  coalesce(nullif(btrim(e.nome_fantasia), ''), 'Matriz'),
  'matriz',
  case
    when length(regexp_replace(coalesce(e.cnpj, ''), '\D', '', 'g')) = 14
      then regexp_replace(e.cnpj, '\D', '', 'g')
    else null
  end,
  e.telefone,
  e.email_principal,
  e.endereco,
  e.numero,
  e.complemento,
  e.bairro,
  e.cidade,
  e.estado,
  e.cep,
  true,
  case when e.deleted_at is null then 'ativa' else 'arquivada' end,
  'Unidade matriz criada automaticamente na implantação da multiunidade.'
from public.empresas e
where not exists (
    select 1
    from public.unidades u
    where u.empresa_id = e.id
      and u.deleted_at is null
  );

-- Empresas criadas depois desta migration também recebem a matriz na mesma
-- transação. A matriz é infraestrutura obrigatória e não depende do plano.
create or replace function public.ensure_company_matrix_unit()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_cnpj text;
begin
  v_cnpj := regexp_replace(coalesce(new.cnpj, ''), '\D', '', 'g');

  insert into public.unidades (
    empresa_id,
    codigo,
    nome,
    tipo,
    cnpj,
    telefone,
    email,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    is_matriz,
    status,
    observacoes
  )
  select
    new.id,
    'MATRIZ',
    coalesce(nullif(btrim(new.nome_fantasia), ''), 'Matriz'),
    'matriz',
    case when length(v_cnpj) = 14 then v_cnpj else null end,
    new.telefone,
    new.email_principal,
    new.endereco,
    new.numero,
    new.complemento,
    new.bairro,
    new.cidade,
    new.estado,
    new.cep,
    true,
    'ativa',
    'Unidade matriz criada automaticamente no cadastro da empresa.'
  where not exists (
    select 1
    from public.unidades u
    where u.empresa_id = new.id
      and u.deleted_at is null
  );

  return new;
end
$$;

drop trigger if exists trg_empresas_ensure_matrix_unit on public.empresas;
create trigger trg_empresas_ensure_matrix_unit
after insert on public.empresas
for each row execute function public.ensure_company_matrix_unit();

alter table public.usuarios_empresas
  add column if not exists acesso_todas_unidades boolean not null default true,
  add column if not exists unidade_principal_id uuid references public.unidades(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_empresas_unidade_principal_empresa_fk'
      and conrelid = 'public.usuarios_empresas'::regclass
  ) then
    alter table public.usuarios_empresas
      add constraint usuarios_empresas_unidade_principal_empresa_fk
      foreign key (unidade_principal_id, empresa_id)
      references public.unidades(id, empresa_id)
      not valid;
  end if;
end
$$;

alter table public.usuarios_empresas
  validate constraint usuarios_empresas_unidade_principal_empresa_fk;

create table if not exists public.usuarios_unidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  unidade_id uuid not null,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  ativo boolean not null default true,
  perfil_unidade text,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  constraint usuarios_unidades_unidade_empresa_fk
    foreign key (unidade_id, empresa_id)
    references public.unidades(id, empresa_id),
  constraint usuarios_unidades_perfil_check
    check (
      perfil_unidade is null
      or perfil_unidade in (
        'administrador',
        'responsavel_tecnico',
        'colaborador',
        'somente_leitura'
      )
    ),
  unique (usuario_id, unidade_id)
);

create unique index if not exists uq_usuarios_unidades_principal
  on public.usuarios_unidades (usuario_id, empresa_id)
  where principal and ativo and deleted_at is null;

create index if not exists idx_usuarios_unidades_empresa_usuario
  on public.usuarios_unidades (empresa_id, usuario_id)
  where ativo and deleted_at is null;

create index if not exists idx_usuarios_unidades_unidade_usuario
  on public.usuarios_unidades (unidade_id, usuario_id)
  where ativo and deleted_at is null;

create table if not exists public.transferencias_unidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid not null references public.equipamentos(id),
  unidade_origem_id uuid not null,
  unidade_destino_id uuid not null,
  motivo text not null,
  responsavel_id uuid references public.usuarios(id) on delete set null,
  data_transferencia timestamptz not null default now(),
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios(id) on delete set null,
  constraint transferencias_unidades_origem_empresa_fk
    foreign key (unidade_origem_id, empresa_id)
    references public.unidades(id, empresa_id),
  constraint transferencias_unidades_destino_empresa_fk
    foreign key (unidade_destino_id, empresa_id)
    references public.unidades(id, empresa_id),
  constraint transferencias_unidades_distintas_check
    check (unidade_origem_id <> unidade_destino_id),
  constraint transferencias_unidades_motivo_check
    check (btrim(motivo) <> '')
);

create index if not exists idx_transferencias_unidades_equipamento_data
  on public.transferencias_unidades (empresa_id, equipamento_id, data_transferencia desc);

-- Escopo explícito nos registros principais e snapshot da unidade nos históricos.
alter table public.documentos
  add column if not exists escopo_documento text not null default 'corporativo',
  add column if not exists unidade_id uuid;

alter table public.equipamentos add column if not exists unidade_id uuid;
alter table public.calibracoes add column if not exists unidade_id uuid;
alter table public.qualificacoes add column if not exists unidade_id uuid;
alter table public.manutencoes add column if not exists unidade_id uuid;
alter table public.pendencias add column if not exists unidade_id uuid;
alter table public.tratativas_pendencias add column if not exists unidade_id uuid;
alter table public.alertas add column if not exists unidade_id uuid;
alter table public.anexos add column if not exists unidade_id uuid;
alter table public.logs_auditoria add column if not exists unidade_id uuid;
alter table public.interacoes_assistente add column if not exists unidade_id uuid;
alter table public.relatorios_agendados add column if not exists unidade_id uuid;
alter table public.execucoes_relatorios_agendados add column if not exists unidade_id uuid;
