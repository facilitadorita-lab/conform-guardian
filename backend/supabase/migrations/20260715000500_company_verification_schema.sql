-- Conform Flow — fundação do cadastro e da verificação de empresas.
-- Migração aditiva: preserva empresas, vínculos, planos e assinaturas existentes.

-- 1. Separa verificação cadastral de acesso operacional.
alter table public.empresas
  add column if not exists status_cadastral text,
  add column if not exists data_status_cadastral date,
  add column if not exists porte_empresa text,
  add column if not exists cnae_principal_codigo text,
  add column if not exists cnae_principal_descricao text,
  add column if not exists email_oficial text,
  add column if not exists telefone_oficial text,
  add column if not exists endereco_oficial_json jsonb not null default '{}'::jsonb,
  add column if not exists verification_status text not null default 'verified',
  add column if not exists access_status text not null default 'active',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.usuarios(id) on delete set null,
  add column if not exists verification_method text,
  add column if not exists ultima_consulta_cnpj_at timestamptz,
  add column if not exists provedor_consulta_cnpj text,
  add column if not exists provisional_started_at timestamptz,
  add column if not exists provisional_expires_at timestamptz;

-- Empresas anteriores à implantação continuam verificadas e com o mesmo bloqueio efetivo.
update public.empresas
set
  verification_status = 'verified',
  access_status = case
    when status = 'ativa' then 'active'
    when status = 'bloqueada' then 'blocked'
    else 'blocked'
  end,
  verified_at = coalesce(verified_at, created_at, now()),
  verification_method = coalesce(verification_method, 'legacy_migration')
where verification_method is null
   or verification_status is null
   or access_status is null;

alter table public.empresas
  drop constraint if exists empresas_verification_status_check,
  drop constraint if exists empresas_access_status_check,
  drop constraint if exists empresas_provisional_period_check;

alter table public.empresas
  add constraint empresas_verification_status_check check (
    verification_status in (
      'email_confirmation_pending',
      'pending_review',
      'additional_information_required',
      'verified',
      'rejected',
      'reverification_required'
    )
  ),
  add constraint empresas_access_status_check check (
    access_status in ('provisional', 'active', 'restricted', 'blocked', 'suspended')
  ),
  add constraint empresas_provisional_period_check check (
    provisional_expires_at is null
    or provisional_started_at is null
    or provisional_expires_at > provisional_started_at
  );

create index if not exists idx_empresas_verification_status
  on public.empresas(verification_status, created_at desc)
  where deleted_at is null;

create index if not exists idx_empresas_access_status
  on public.empresas(access_status, updated_at desc)
  where deleted_at is null;

-- O primeiro responsável usa um papel provisório até a aprovação.
alter table public.usuarios_empresas
  drop constraint if exists usuarios_empresas_perfil_check;

alter table public.usuarios_empresas
  add constraint usuarios_empresas_perfil_check check (
    perfil in (
      'administrador_provisorio',
      'administrador',
      'responsavel_tecnico',
      'colaborador',
      'somente_leitura'
    )
  );

-- 2. Solicitação principal de verificação.
create table if not exists public.solicitacoes_verificacao_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  solicitante_usuario_id uuid not null references public.usuarios(id),
  solicitante_nome text not null,
  solicitante_documento text,
  solicitante_cargo text not null,
  solicitante_departamento text,
  solicitante_email text not null,
  solicitante_telefone text,
  solicitante_relacao text not null check (
    solicitante_relacao in (
      'socio',
      'administrador',
      'responsavel_tecnico',
      'diretor',
      'gerente',
      'colaborador_autorizado',
      'consultor',
      'outro'
    )
  ),
  declaracao_autorizacao_aceita boolean not null default false,
  declaracao_autorizacao_aceita_at timestamptz,
  termos_versao text,
  politica_privacidade_versao text,
  status text not null default 'email_confirmation_pending' check (
    status in (
      'email_confirmation_pending',
      'pending_review',
      'additional_information_required',
      'verified',
      'rejected',
      'reverification_required'
    )
  ),
  nivel_risco text not null default 'normal' check (
    nivel_risco in ('normal', 'atencao', 'alto', 'critico')
  ),
  analista_responsavel_id uuid references public.usuarios(id) on delete set null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.usuarios(id) on delete set null,
  review_notes text,
  rejection_reason text,
  rejection_category text,
  additional_information_message text,
  additional_information_items jsonb not null default '[]'::jsonb,
  additional_information_due_at timestamptz,
  resubmitted_at timestamptz,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create unique index if not exists uq_solicitacao_verificacao_aberta_empresa
  on public.solicitacoes_verificacao_empresa(empresa_id)
  where status in (
    'email_confirmation_pending',
    'pending_review',
    'additional_information_required',
    'reverification_required'
  );

create index if not exists idx_solicitacoes_verificacao_fila
  on public.solicitacoes_verificacao_empresa(status, submitted_at, created_at);

create index if not exists idx_solicitacoes_verificacao_analista
  on public.solicitacoes_verificacao_empresa(analista_responsavel_id, status)
  where analista_responsavel_id is not null;

-- 3. Histórico imutável das transições.
create table if not exists public.eventos_verificacao_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  solicitacao_verificacao_id uuid references public.solicitacoes_verificacao_empresa(id),
  event_type text not null check (
    event_type in (
      'request_created',
      'email_confirmed',
      'provisional_access_granted',
      'information_requested',
      'information_submitted',
      'request_approved',
      'request_rejected',
      'access_restricted',
      'access_blocked',
      'access_suspended',
      'access_reactivated',
      'reverification_requested',
      'analyst_assigned',
      'internal_note_added'
    )
  ),
  previous_status text,
  new_status text,
  performed_by uuid references public.usuarios(id) on delete set null,
  performed_by_type text not null check (
    performed_by_type in ('user', 'master', 'system', 'provider')
  ),
  message text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_eventos_verificacao_timeline
  on public.eventos_verificacao_empresa(empresa_id, created_at desc);

create index if not exists idx_eventos_verificacao_solicitacao
  on public.eventos_verificacao_empresa(solicitacao_verificacao_id, created_at desc);

-- 4. Evidências mantidas em bucket privado. A gravação será feita por Edge Function.
create table if not exists public.evidencias_verificacao_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  solicitacao_verificacao_id uuid not null references public.solicitacoes_verificacao_empresa(id),
  evidence_type text not null,
  file_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  uploaded_by uuid not null references public.usuarios(id),
  uploaded_at timestamptz not null default now(),
  review_status text not null default 'pending' check (
    review_status in ('pending', 'accepted', 'rejected', 'replaced')
  ),
  reviewed_by uuid references public.usuarios(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evidencias_verificacao_solicitacao
  on public.evidencias_verificacao_empresa(solicitacao_verificacao_id, uploaded_at desc);

-- 5. Limites efetivos por origem. Apenas um limite vigente por origem será selecionado.
create table if not exists public.limites_acesso_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  source_type text not null check (source_type in ('provisional', 'plan', 'custom')),
  max_users integer check (max_users is null or max_users >= 0),
  max_units integer check (max_units is null or max_units >= 0),
  max_documents integer check (max_documents is null or max_documents >= 0),
  max_equipment integer check (max_equipment is null or max_equipment >= 0),
  max_pending_tasks integer check (max_pending_tasks is null or max_pending_tasks >= 0),
  max_storage_mb integer check (max_storage_mb is null or max_storage_mb >= 0),
  max_reports integer check (max_reports is null or max_reports >= 0),
  allow_exports boolean not null default false,
  allow_integrations boolean not null default false,
  allow_bulk_import boolean not null default false,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_until is null or effective_until > effective_from)
);

create index if not exists idx_limites_acesso_empresa_vigencia
  on public.limites_acesso_empresa(empresa_id, source_type, effective_from desc);

-- Configuração central e alterável pelo Admin Master.
create table if not exists public.configuracoes_limites_provisorios (
  id boolean primary key default true check (id),
  max_users integer not null default 2 check (max_users >= 0),
  max_units integer not null default 1 check (max_units >= 0),
  max_documents integer not null default 10 check (max_documents >= 0),
  max_equipment integer not null default 5 check (max_equipment >= 0),
  max_pending_tasks integer not null default 10 check (max_pending_tasks >= 0),
  max_storage_mb integer not null default 100 check (max_storage_mb >= 0),
  max_reports integer not null default 0 check (max_reports >= 0),
  trial_days integer not null default 14 check (trial_days >= 0),
  allow_exports boolean not null default false,
  allow_integrations boolean not null default false,
  allow_bulk_import boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.usuarios(id) on delete set null
);

insert into public.configuracoes_limites_provisorios(id)
values (true)
on conflict (id) do nothing;

-- 6. Solicitações de entrada em uma empresa já cadastrada.
create table if not exists public.solicitacoes_acesso_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  solicitante_usuario_id uuid not null references public.usuarios(id),
  solicitante_nome text not null,
  solicitante_email text not null,
  solicitante_telefone text,
  solicitante_cargo text,
  message text,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'canceled')
  ),
  reviewed_at timestamptz,
  reviewed_by uuid references public.usuarios(id) on delete set null,
  review_notes text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_solicitacao_acesso_empresa_aberta
  on public.solicitacoes_acesso_empresa(empresa_id, solicitante_usuario_id)
  where status = 'pending';

-- 7. Notificações transacionais internas com chave de deduplicação.
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  usuario_id uuid references public.usuarios(id),
  audience text not null default 'user' check (audience in ('user', 'company_admin', 'master')),
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  action_url text,
  dedupe_key text,
  lida_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_notificacoes_dedupe
  on public.notificacoes(dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_notificacoes_usuario_data
  on public.notificacoes(usuario_id, created_at desc);

create index if not exists idx_notificacoes_master_data
  on public.notificacoes(audience, created_at desc)
  where audience = 'master';

-- 8. Função de vínculo sem considerar o estado operacional da empresa.
create or replace function public.has_company_membership(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_master() or exists (
    select 1
    from public.usuarios_empresas ue
    join public.usuarios u on u.id = ue.usuario_id
    join public.empresas e on e.id = ue.empresa_id
    where ue.usuario_id = auth.uid()
      and ue.empresa_id = p_empresa_id
      and ue.ativo
      and ue.deleted_at is null
      and u.status = 'ativo'
      and u.deleted_at is null
      and e.deleted_at is null
  )
$$;

revoke all on function public.has_company_membership(uuid) from public, anon;
grant execute on function public.has_company_membership(uuid) to authenticated;

-- Protege estados e dados oficiais contra update direto do cliente.
create or replace function public.protect_company_control_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Operações internas/service role não possuem auth.uid().
  if auth.uid() is not null
    and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_master()
  then
    if new.verification_status is distinct from old.verification_status
      or new.access_status is distinct from old.access_status
      or new.status is distinct from old.status
      or new.plano_id is distinct from old.plano_id
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
      or new.verification_method is distinct from old.verification_method
      or new.status_cadastral is distinct from old.status_cadastral
      or new.data_status_cadastral is distinct from old.data_status_cadastral
      or new.cnpj is distinct from old.cnpj
      or new.cnpj_normalizado is distinct from old.cnpj_normalizado
      or new.razao_social is distinct from old.razao_social
      or new.email_oficial is distinct from old.email_oficial
      or new.telefone_oficial is distinct from old.telefone_oficial
      or new.endereco_oficial_json is distinct from old.endereco_oficial_json
      or new.ultima_consulta_cnpj_at is distinct from old.ultima_consulta_cnpj_at
      or new.provedor_consulta_cnpj is distinct from old.provedor_consulta_cnpj
      or new.provisional_started_at is distinct from old.provisional_started_at
      or new.provisional_expires_at is distinct from old.provisional_expires_at
    then
      raise exception 'Dados oficiais e estados da empresa só podem ser alterados pelo backend seguro.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_empresas_protect_control_fields on public.empresas;
create trigger trg_empresas_protect_control_fields
before update on public.empresas
for each row execute function public.protect_company_control_fields();

-- Impede autoelevação de privilégio na tabela de perfis.
create or replace function public.protect_user_privilege_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
    and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_master()
    and (
      new.is_master is distinct from old.is_master
      or new.status is distinct from old.status
      or new.email is distinct from old.email
      or new.deleted_at is distinct from old.deleted_at
    )
  then
    raise exception 'Perfil, status e privilégios só podem ser alterados pelo backend seguro.'
      using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists trg_usuarios_protect_privileges on public.usuarios;
create trigger trg_usuarios_protect_privileges
before update on public.usuarios
for each row execute function public.protect_user_privilege_fields();

drop policy if exists usuarios_master_insert on public.usuarios;
drop policy if exists usuarios_secure_insert on public.usuarios;
create policy usuarios_secure_insert
on public.usuarios
for insert to authenticated
with check (
  public.is_master()
  or (
    id = auth.uid()
    and is_master = false
    and status = 'ativo'
    and deleted_at is null
  )
);

-- Eventos de verificação são imutáveis inclusive para operações privilegiadas.
create or replace function public.prevent_verification_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Eventos de verificação são imutáveis.' using errcode = '42501';
end $$;

drop trigger if exists trg_eventos_verificacao_immutable on public.eventos_verificacao_empresa;
create trigger trg_eventos_verificacao_immutable
before update or delete on public.eventos_verificacao_empresa
for each row execute function public.prevent_verification_event_mutation();

-- 9. RLS. Escritas críticas ficam sem policy direta e passam por RPC/Edge Function.
alter table public.solicitacoes_verificacao_empresa enable row level security;
alter table public.eventos_verificacao_empresa enable row level security;
alter table public.evidencias_verificacao_empresa enable row level security;
alter table public.limites_acesso_empresa enable row level security;
alter table public.configuracoes_limites_provisorios enable row level security;
alter table public.solicitacoes_acesso_empresa enable row level security;
alter table public.notificacoes enable row level security;

drop policy if exists solicitacoes_verificacao_read on public.solicitacoes_verificacao_empresa;
create policy solicitacoes_verificacao_read
on public.solicitacoes_verificacao_empresa
for select to authenticated
using (public.has_company_membership(empresa_id));

drop policy if exists eventos_verificacao_read on public.eventos_verificacao_empresa;
create policy eventos_verificacao_read
on public.eventos_verificacao_empresa
for select to authenticated
using (public.has_company_membership(empresa_id));

drop policy if exists evidencias_verificacao_read on public.evidencias_verificacao_empresa;
create policy evidencias_verificacao_read
on public.evidencias_verificacao_empresa
for select to authenticated
using (public.has_company_membership(empresa_id));

drop policy if exists limites_acesso_read on public.limites_acesso_empresa;
create policy limites_acesso_read
on public.limites_acesso_empresa
for select to authenticated
using (public.has_company_membership(empresa_id));

drop policy if exists configuracoes_limites_provisorios_master on public.configuracoes_limites_provisorios;
create policy configuracoes_limites_provisorios_master
on public.configuracoes_limites_provisorios
for all to authenticated
using (public.is_master())
with check (public.is_master());

drop policy if exists solicitacoes_acesso_read on public.solicitacoes_acesso_empresa;
create policy solicitacoes_acesso_read
on public.solicitacoes_acesso_empresa
for select to authenticated
using (
  public.is_master()
  or solicitante_usuario_id = auth.uid()
  or public.can_admin_company(empresa_id)
);

drop policy if exists notificacoes_read on public.notificacoes;
create policy notificacoes_read
on public.notificacoes
for select to authenticated
using (
  public.is_master()
  or usuario_id = auth.uid()
  or (
    audience = 'company_admin'
    and empresa_id is not null
    and public.can_admin_company(empresa_id)
  )
);

drop policy if exists notificacoes_update_lida on public.notificacoes;
create policy notificacoes_update_lida
on public.notificacoes
for update to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

revoke update on public.notificacoes from authenticated;
grant update(lida_at) on public.notificacoes to authenticated;

-- Bucket separado das evidências operacionais.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-verification-evidence',
  'company-verification-evidence',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Nenhuma policy de upload direto é criada: URLs assinadas serão emitidas por backend autenticado.
