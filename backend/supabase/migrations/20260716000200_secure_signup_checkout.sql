-- Conform Flow — contratação pública segura, fotografia comercial imutável e
-- provisionamento liberado exclusivamente por webhook assinado.

create table if not exists public.sessoes_contratacao (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  plano_id uuid not null references public.planos(id),
  periodicidade text not null check (periodicidade in ('monthly', 'yearly')),
  cnpj_normalizado text not null check (cnpj_normalizado ~ '^[0-9]{14}$'),
  email_responsavel text not null,
  responsavel_json jsonb not null,
  empresa_informada_json jsonb not null,
  consulta_cnpj_json jsonb not null,
  pre_analise_json jsonb not null,
  termos_aceitos boolean not null,
  termos_versao text not null,
  politica_privacidade_versao text not null,
  status text not null default 'pre_analisada' check (
    status in (
      'pre_analisada',
      'checkout_pendente',
      'pagamento_confirmado',
      'email_pendente',
      'provisionada',
      'expirada',
      'cancelada',
      'recusada'
    )
  ),
  stripe_checkout_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  auth_user_id uuid references auth.users(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  assinatura_id uuid references public.assinaturas_empresas(id) on delete set null,
  pagamento_confirmado_at timestamptz,
  email_verificado_at timestamptz,
  expira_em timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessoes_contratacao_email_check
    check (email_responsavel = lower(trim(email_responsavel)) and position('@' in email_responsavel) > 1),
  constraint sessoes_contratacao_termos_check
    check (termos_aceitos)
);

create unique index if not exists uq_sessoes_contratacao_stripe_checkout
  on public.sessoes_contratacao(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists idx_sessoes_contratacao_cnpj_status
  on public.sessoes_contratacao(cnpj_normalizado, status, created_at desc);

create index if not exists idx_sessoes_contratacao_expiracao
  on public.sessoes_contratacao(status, expira_em)
  where status in ('pre_analisada', 'checkout_pendente');

create table if not exists public.fotografias_contratacao (
  id uuid primary key default gen_random_uuid(),
  sessao_contratacao_id uuid not null references public.sessoes_contratacao(id),
  versao integer not null default 1 check (versao > 0),
  plano_id uuid not null references public.planos(id),
  plano_codigo text not null,
  plano_nome text not null,
  periodicidade text not null check (periodicidade in ('monthly', 'yearly')),
  valor_centavos integer not null check (valor_centavos >= 0),
  moeda char(3) not null check (moeda ~ '^[A-Z]{3}$'),
  stripe_price_id text not null,
  limites_json jsonb not null,
  recursos_json jsonb not null,
  responsavel_json jsonb not null,
  empresa_json jsonb not null,
  consulta_cnpj_json jsonb not null,
  termos_versao text not null,
  politica_privacidade_versao text not null,
  fotografia_hash text not null,
  created_at timestamptz not null default now(),
  unique (sessao_contratacao_id, versao)
);

create table if not exists public.eventos_contratacao (
  id uuid primary key default gen_random_uuid(),
  sessao_contratacao_id uuid not null references public.sessoes_contratacao(id),
  tipo text not null,
  status_anterior text,
  status_novo text,
  origem text not null check (origem in ('frontend', 'edge_function', 'stripe_webhook', 'supabase_auth', 'system')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_eventos_contratacao_timeline
  on public.eventos_contratacao(sessao_contratacao_id, created_at desc);

create table if not exists public.eventos_webhook_pagamento (
  stripe_event_id text primary key,
  stripe_event_type text not null,
  sessao_contratacao_id uuid references public.sessoes_contratacao(id),
  processado boolean not null default false,
  erro_codigo text,
  payload_hash text not null,
  recebido_at timestamptz not null default now(),
  processado_at timestamptz
);

alter table public.sessoes_contratacao enable row level security;
alter table public.fotografias_contratacao enable row level security;
alter table public.eventos_contratacao enable row level security;
alter table public.eventos_webhook_pagamento enable row level security;

revoke all on public.sessoes_contratacao from anon, authenticated;
revoke all on public.fotografias_contratacao from anon, authenticated;
revoke all on public.eventos_contratacao from anon, authenticated;
revoke all on public.eventos_webhook_pagamento from anon, authenticated;
grant select, insert, update on public.sessoes_contratacao to service_role;
grant select, insert on public.fotografias_contratacao to service_role;
grant select, insert on public.eventos_contratacao to service_role;
grant select, insert, update on public.eventos_webhook_pagamento to service_role;

create or replace function public.prevent_immutable_commercial_event_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'IMMUTABLE_COMMERCIAL_RECORD';
end;
$$;

drop trigger if exists trg_fotografias_contratacao_immutable on public.fotografias_contratacao;
create trigger trg_fotografias_contratacao_immutable
before update or delete on public.fotografias_contratacao
for each row execute function public.prevent_immutable_commercial_event_changes();

drop trigger if exists trg_eventos_contratacao_immutable on public.eventos_contratacao;
create trigger trg_eventos_contratacao_immutable
before update or delete on public.eventos_contratacao
for each row execute function public.prevent_immutable_commercial_event_changes();

create or replace function public.internal_provisionar_contratacao_paga(
  p_sessao_id uuid,
  p_auth_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_sessao public.sessoes_contratacao%rowtype;
  v_fotografia public.fotografias_contratacao%rowtype;
  v_empresa_id uuid;
  v_assinatura_id uuid;
  v_razao_social text;
  v_nome_fantasia text;
  v_endereco jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_sessao
  from public.sessoes_contratacao
  where id = p_sessao_id
  for update;

  if not found then raise exception 'SIGNUP_SESSION_NOT_FOUND'; end if;
  if v_sessao.empresa_id is not null then
    return jsonb_build_object(
      'empresa_id', v_sessao.empresa_id,
      'assinatura_id', v_sessao.assinatura_id,
      'auth_user_id', v_sessao.auth_user_id,
      'status', v_sessao.status,
      'idempotent', true
    );
  end if;
  if v_sessao.status not in ('checkout_pendente', 'pagamento_confirmado', 'email_pendente') then
    raise exception 'SIGNUP_SESSION_INVALID_STATUS';
  end if;

  select * into v_fotografia
  from public.fotografias_contratacao
  where sessao_contratacao_id = v_sessao.id
  order by versao desc
  limit 1;

  if not found then raise exception 'CONTRACT_SNAPSHOT_NOT_FOUND'; end if;
  if exists (
    select 1 from public.empresas e
    where e.cnpj_normalizado = v_sessao.cnpj_normalizado and e.deleted_at is null
  ) then
    raise exception 'COMPANY_ALREADY_REGISTERED';
  end if;

  insert into public.usuarios(id, nome, email, telefone, cargo, status)
  values (
    p_auth_user_id,
    coalesce(v_sessao.responsavel_json ->> 'nome', 'Responsável'),
    v_sessao.email_responsavel,
    v_sessao.responsavel_json ->> 'telefone',
    v_sessao.responsavel_json ->> 'cargo',
    'ativo'
  )
  on conflict (id) do update set
    nome = excluded.nome,
    telefone = coalesce(excluded.telefone, public.usuarios.telefone),
    cargo = coalesce(excluded.cargo, public.usuarios.cargo),
    updated_at = now();

  v_razao_social := coalesce(
    nullif(v_sessao.consulta_cnpj_json ->> 'legal_name', ''),
    nullif(v_sessao.empresa_informada_json ->> 'razao_social', ''),
    'Empresa em validação'
  );
  v_nome_fantasia := coalesce(
    nullif(v_sessao.consulta_cnpj_json ->> 'trade_name', ''),
    nullif(v_sessao.empresa_informada_json ->> 'nome_fantasia', ''),
    v_razao_social
  );
  v_endereco := coalesce(v_sessao.consulta_cnpj_json -> 'official_address', '{}'::jsonb);

  insert into public.empresas(
    razao_social, nome_fantasia, cnpj, tipo_estabelecimento, segmento,
    endereco, numero, complemento, bairro, cidade, estado, cep,
    telefone, email_principal, responsavel_legal, plano_id, status,
    status_cadastral, data_status_cadastral, porte_empresa,
    cnae_principal_codigo, cnae_principal_descricao,
    email_oficial, telefone_oficial, endereco_oficial_json,
    verification_status, access_status, verification_method,
    ultima_consulta_cnpj_at, provedor_consulta_cnpj
  ) values (
    v_razao_social,
    v_nome_fantasia,
    v_sessao.cnpj_normalizado,
    v_sessao.empresa_informada_json ->> 'tipo_estabelecimento',
    v_sessao.empresa_informada_json ->> 'segmento',
    v_endereco ->> 'street',
    v_endereco ->> 'number',
    v_endereco ->> 'complement',
    v_endereco ->> 'district',
    v_endereco ->> 'city',
    left(v_endereco ->> 'state', 2),
    v_endereco ->> 'postal_code',
    coalesce(v_sessao.responsavel_json ->> 'telefone', v_sessao.consulta_cnpj_json ->> 'official_phone'),
    v_sessao.email_responsavel,
    v_sessao.responsavel_json ->> 'nome',
    v_sessao.plano_id,
    'bloqueada',
    v_sessao.consulta_cnpj_json ->> 'registration_status',
    nullif(v_sessao.consulta_cnpj_json ->> 'registration_status_date', '')::date,
    v_sessao.consulta_cnpj_json ->> 'company_size',
    v_sessao.consulta_cnpj_json #>> '{main_activity,code}',
    v_sessao.consulta_cnpj_json #>> '{main_activity,description}',
    v_sessao.consulta_cnpj_json ->> 'official_email',
    v_sessao.consulta_cnpj_json ->> 'official_phone',
    v_endereco,
    'email_confirmation_pending',
    'blocked',
    'stripe_checkout_cnpj_provider',
    now(),
    v_sessao.pre_analise_json ->> 'provider'
  ) returning id into v_empresa_id;

  insert into public.usuarios_empresas(usuario_id, empresa_id, perfil, ativo)
  values (p_auth_user_id, v_empresa_id, 'administrador_provisorio', true);

  insert into public.assinaturas_empresas(
    empresa_id, plano_id, status, ciclo,
    valor_mensal_centavos, valor_anual_centavos, moeda,
    gateway, gateway_customer_id, gateway_subscription_id
  ) values (
    v_empresa_id,
    v_sessao.plano_id,
    'ativa',
    case when v_fotografia.periodicidade = 'yearly' then 'anual' else 'mensal' end,
    case when v_fotografia.periodicidade = 'monthly' then v_fotografia.valor_centavos else 0 end,
    case when v_fotografia.periodicidade = 'yearly' then v_fotografia.valor_centavos else null end,
    v_fotografia.moeda,
    'stripe',
    p_stripe_customer_id,
    p_stripe_subscription_id
  ) returning id into v_assinatura_id;

  update public.sessoes_contratacao
  set status = 'email_pendente',
      auth_user_id = p_auth_user_id,
      empresa_id = v_empresa_id,
      assinatura_id = v_assinatura_id,
      stripe_customer_id = p_stripe_customer_id,
      stripe_subscription_id = p_stripe_subscription_id,
      pagamento_confirmado_at = coalesce(pagamento_confirmado_at, now()),
      updated_at = now()
  where id = v_sessao.id;

  insert into public.eventos_contratacao(
    sessao_contratacao_id, tipo, status_anterior, status_novo, origem, metadata_json
  ) values (
    v_sessao.id, 'pagamento_confirmado_e_ambiente_preparado', v_sessao.status,
    'email_pendente', 'stripe_webhook',
    jsonb_build_object('empresa_id', v_empresa_id, 'assinatura_id', v_assinatura_id)
  );

  return jsonb_build_object(
    'empresa_id', v_empresa_id,
    'assinatura_id', v_assinatura_id,
    'auth_user_id', p_auth_user_id,
    'status', 'email_pendente',
    'idempotent', false
  );
end;
$$;

revoke all on function public.internal_provisionar_contratacao_paga(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.internal_provisionar_contratacao_paga(uuid,uuid,text,text) to service_role;

create or replace function public.internal_confirmar_email_contratacao(
  p_sessao_id uuid,
  p_auth_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_sessao public.sessoes_contratacao%rowtype;
  v_solicitacao_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'FORBIDDEN'; end if;

  select * into v_sessao
  from public.sessoes_contratacao
  where id = p_sessao_id
  for update;

  if not found then raise exception 'SIGNUP_SESSION_NOT_FOUND'; end if;
  if v_sessao.auth_user_id <> p_auth_user_id then raise exception 'SIGNUP_USER_MISMATCH'; end if;
  if v_sessao.empresa_id is null or v_sessao.status <> 'email_pendente' then
    if v_sessao.status = 'provisionada' then
      return jsonb_build_object('empresa_id', v_sessao.empresa_id, 'status', v_sessao.status, 'idempotent', true);
    end if;
    raise exception 'SIGNUP_SESSION_INVALID_STATUS';
  end if;

  update public.empresas
  set status = 'ativa',
      verification_status = 'pending_review',
      access_status = 'provisional',
      provisional_started_at = coalesce(provisional_started_at, now()),
      provisional_expires_at = coalesce(provisional_expires_at, now() + interval '7 days'),
      updated_at = now()
  where id = v_sessao.empresa_id;

  insert into public.solicitacoes_verificacao_empresa(
    empresa_id, solicitante_usuario_id, solicitante_nome, solicitante_cargo,
    solicitante_departamento, solicitante_email, solicitante_telefone,
    solicitante_relacao, declaracao_autorizacao_aceita,
    declaracao_autorizacao_aceita_at, termos_versao,
    politica_privacidade_versao, status, submitted_at, idempotency_key
  ) values (
    v_sessao.empresa_id,
    p_auth_user_id,
    coalesce(v_sessao.responsavel_json ->> 'nome', 'Responsável'),
    coalesce(v_sessao.responsavel_json ->> 'cargo', 'Administrador'),
    v_sessao.responsavel_json ->> 'departamento',
    v_sessao.email_responsavel,
    v_sessao.responsavel_json ->> 'telefone',
    coalesce(v_sessao.responsavel_json ->> 'relacao', 'administrador'),
    true,
    v_sessao.created_at,
    v_sessao.termos_versao,
    v_sessao.politica_privacidade_versao,
    'pending_review',
    now(),
    'checkout:' || v_sessao.id::text
  )
  on conflict (idempotency_key) do update set updated_at = now()
  returning id into v_solicitacao_id;

  update public.sessoes_contratacao
  set status = 'provisionada', email_verificado_at = now(), updated_at = now()
  where id = v_sessao.id;

  insert into public.eventos_contratacao(
    sessao_contratacao_id, tipo, status_anterior, status_novo, origem, metadata_json
  ) values (
    v_sessao.id, 'email_confirmado_acesso_provisorio', v_sessao.status,
    'provisionada', 'supabase_auth',
    jsonb_build_object('empresa_id', v_sessao.empresa_id, 'solicitacao_id', v_solicitacao_id)
  );

  return jsonb_build_object(
    'empresa_id', v_sessao.empresa_id,
    'solicitacao_id', v_solicitacao_id,
    'status', 'provisionada',
    'idempotent', false
  );
end;
$$;

revoke all on function public.internal_confirmar_email_contratacao(uuid,uuid) from public, anon, authenticated;
grant execute on function public.internal_confirmar_email_contratacao(uuid,uuid) to service_role;

create or replace function public.internal_auth_user_id_por_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, pg_temp
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(p_email))
  order by created_at
  limit 1
$$;

revoke all on function public.internal_auth_user_id_por_email(text) from public, anon, authenticated;
grant execute on function public.internal_auth_user_id_por_email(text) to service_role;

comment on table public.fotografias_contratacao is
  'Fotografia imutável do preço, plano, limites, recursos, CNPJ e termos no início do checkout.';
comment on table public.sessoes_contratacao is
  'Estado privado do fluxo comercial. Não possui leitura ou gravação direta pelo navegador.';
