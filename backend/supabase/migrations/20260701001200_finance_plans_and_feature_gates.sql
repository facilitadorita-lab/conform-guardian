-- Conform Flow — financeiro, planos comerciais e controle de recursos por plano.
-- O Admin Master pode alterar planos/valores; empresas só usam recursos permitidos.

alter table public.planos
  add column if not exists codigo text,
  add column if not exists descricao text,
  add column if not exists valor_mensal_centavos integer not null default 0,
  add column if not exists valor_anual_centavos integer,
  add column if not exists moeda char(3) not null default 'BRL',
  add column if not exists trial_dias integer not null default 0,
  add column if not exists disponivel_venda boolean not null default true,
  add column if not exists recursos jsonb not null default '{}'::jsonb,
  add column if not exists ordem integer not null default 0;

update public.planos
set
  codigo = coalesce(codigo, lower(regexp_replace(nome, '[^a-zA-Z0-9]+', '-', 'g'))),
  recursos = case nome
    when 'Essencial' then jsonb_build_object(
      'documentos', true,
      'equipamentos', true,
      'calibracoes', true,
      'qualificacoes', false,
      'manutencoes', true,
      'pendencias', true,
      'alertas', true,
      'relatorios', false,
      'auditoria', false,
      'usuarios', true,
      'anexos', true
    )
    when 'Profissional' then jsonb_build_object(
      'documentos', true,
      'equipamentos', true,
      'calibracoes', true,
      'qualificacoes', true,
      'manutencoes', true,
      'pendencias', true,
      'alertas', true,
      'relatorios', true,
      'auditoria', true,
      'usuarios', true,
      'anexos', true
    )
    when 'Enterprise' then jsonb_build_object(
      'documentos', true,
      'equipamentos', true,
      'calibracoes', true,
      'qualificacoes', true,
      'manutencoes', true,
      'pendencias', true,
      'alertas', true,
      'relatorios', true,
      'auditoria', true,
      'usuarios', true,
      'anexos', true,
      'multi_unidades', true,
      'suporte_prioritario', true
    )
    else recursos
  end,
  valor_mensal_centavos = case nome
    when 'Essencial' then 19700
    when 'Profissional' then 39700
    when 'Enterprise' then 149000
    else valor_mensal_centavos
  end,
  valor_anual_centavos = case nome
    when 'Essencial' then 197000
    when 'Profissional' then 397000
    when 'Enterprise' then 1490000
    else valor_anual_centavos
  end,
  ordem = case nome
    when 'Essencial' then 10
    when 'Profissional' then 20
    when 'Enterprise' then 30
    else ordem
  end;

alter table public.planos
  alter column codigo set not null;

create unique index if not exists uq_planos_codigo
  on public.planos(codigo);

alter table public.planos
  drop constraint if exists planos_valores_validos;

alter table public.planos
  add constraint planos_valores_validos
  check (
    valor_mensal_centavos >= 0
    and (valor_anual_centavos is null or valor_anual_centavos >= 0)
    and trial_dias >= 0
    and moeda ~ '^[A-Z]{3}$'
  );

create table if not exists public.assinaturas_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id),
  plano_id uuid not null references public.planos(id),
  status text not null default 'trial' check (status in ('trial','ativa','pagamento_pendente','inadimplente','bloqueada','cancelada')),
  ciclo text not null default 'mensal' check (ciclo in ('mensal','anual','personalizado')),
  valor_mensal_centavos integer not null default 0 check (valor_mensal_centavos >= 0),
  valor_anual_centavos integer check (valor_anual_centavos is null or valor_anual_centavos >= 0),
  desconto_centavos integer not null default 0 check (desconto_centavos >= 0),
  desconto_percentual numeric(5,2) not null default 0 check (desconto_percentual >= 0 and desconto_percentual <= 100),
  moeda char(3) not null default 'BRL' check (moeda ~ '^[A-Z]{3}$'),
  gateway text,
  gateway_customer_id text,
  gateway_subscription_id text,
  trial_termina_em date,
  proximo_vencimento date,
  ultimo_pagamento_em date,
  cancelada_em timestamptz,
  bloqueada_em timestamptz,
  observacoes_internas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.usuarios(id),
  updated_by uuid references public.usuarios(id)
);

create table if not exists public.faturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  assinatura_id uuid not null references public.assinaturas_empresas(id),
  competencia date not null,
  vencimento date not null,
  valor_centavos integer not null check (valor_centavos >= 0),
  desconto_centavos integer not null default 0 check (desconto_centavos >= 0),
  valor_pago_centavos integer check (valor_pago_centavos is null or valor_pago_centavos >= 0),
  moeda char(3) not null default 'BRL' check (moeda ~ '^[A-Z]{3}$'),
  status text not null default 'pendente' check (status in ('pendente','paga','vencida','cancelada','estornada')),
  forma_pagamento text check (forma_pagamento is null or forma_pagamento in ('pix','boleto','cartao','transferencia','manual')),
  gateway text,
  gateway_invoice_id text,
  link_pagamento text,
  paga_em timestamptz,
  observacoes_internas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.usuarios(id),
  updated_by uuid references public.usuarios(id),
  unique (empresa_id, competencia)
);

create table if not exists public.historico_planos_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  assinatura_id uuid references public.assinaturas_empresas(id),
  plano_anterior_id uuid references public.planos(id),
  plano_novo_id uuid references public.planos(id),
  valor_anterior_centavos integer,
  valor_novo_centavos integer,
  motivo text,
  alterado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now()
);

alter table public.assinaturas_empresas enable row level security;
alter table public.faturas enable row level security;
alter table public.historico_planos_empresas enable row level security;

drop policy if exists assinaturas_master_all on public.assinaturas_empresas;
create policy assinaturas_master_all on public.assinaturas_empresas
  for all to authenticated using (public.is_master()) with check (public.is_master());

drop policy if exists assinaturas_company_read on public.assinaturas_empresas;
create policy assinaturas_company_read on public.assinaturas_empresas
  for select to authenticated using (public.has_company_access(empresa_id));

drop policy if exists faturas_master_all on public.faturas;
create policy faturas_master_all on public.faturas
  for all to authenticated using (public.is_master()) with check (public.is_master());

drop policy if exists faturas_company_read on public.faturas;
create policy faturas_company_read on public.faturas
  for select to authenticated using (public.has_company_access(empresa_id));

drop policy if exists historico_planos_master_read on public.historico_planos_empresas;
create policy historico_planos_master_read on public.historico_planos_empresas
  for select to authenticated using (public.is_master());

create index if not exists idx_assinaturas_status_vencimento
  on public.assinaturas_empresas(status, proximo_vencimento)
  where deleted_at is null;

create index if not exists idx_faturas_status_vencimento
  on public.faturas(status, vencimento)
  where deleted_at is null;

create or replace function public.sync_company_plan_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.empresas
  set
    plano_id = new.plano_id,
    status = case
      when new.status in ('inadimplente','bloqueada','cancelada') then 'bloqueada'
      else 'ativa'
    end,
    updated_at = now()
  where id = new.empresa_id;

  return new;
end $$;

drop trigger if exists trg_assinaturas_sync_empresa on public.assinaturas_empresas;
create trigger trg_assinaturas_sync_empresa
after insert or update of plano_id, status on public.assinaturas_empresas
for each row execute function public.sync_company_plan_from_subscription();

create or replace function public.company_billing_allows_write(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select a.status in ('trial','ativa','pagamento_pendente')
    from public.assinaturas_empresas a
    where a.empresa_id = p_empresa_id
      and a.deleted_at is null
    limit 1
  ), true)
$$;

create or replace function public.plan_feature_enabled(p_empresa_id uuid, p_recurso text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select coalesce((p.recursos ->> p_recurso)::boolean, false)
    from public.empresas e
    join public.planos p on p.id = e.plano_id
    where e.id = p_empresa_id
      and e.deleted_at is null
      and p.ativo
  ), false)
$$;

create or replace function public.assert_plan_feature(p_empresa_id uuid, p_recurso text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.plan_feature_enabled(p_empresa_id, p_recurso) then
    raise exception 'Recurso % não está disponível no plano contratado.', p_recurso
      using errcode = '42501';
  end if;
end $$;

create or replace function public.can_write_company(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.company_role(p_empresa_id) in ('master','administrador','responsavel_tecnico','colaborador')
    and public.company_billing_allows_write(p_empresa_id),
    false
  )
$$;

create or replace function public.validate_plan_record_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_value integer;
  current_value bigint;
begin
  if tg_table_name = 'documentos' then
    perform public.assert_plan_feature(new.empresa_id, 'documentos');
    select p.limite_documentos into limit_value
    from public.empresas e join public.planos p on p.id = e.plano_id
    where e.id = new.empresa_id;

    if limit_value is not null then
      select count(*) into current_value
      from public.documentos
      where empresa_id = new.empresa_id and deleted_at is null;
    end if;

  elsif tg_table_name = 'equipamentos' then
    perform public.assert_plan_feature(new.empresa_id, 'equipamentos');
    select p.limite_equipamentos into limit_value
    from public.empresas e join public.planos p on p.id = e.plano_id
    where e.id = new.empresa_id;

    if limit_value is not null then
      select count(*) into current_value
      from public.equipamentos
      where empresa_id = new.empresa_id and deleted_at is null;
    end if;
  end if;

  if limit_value is not null and current_value >= limit_value then
    raise exception 'Limite do plano atingido para %', tg_table_name using errcode = 'P0001';
  end if;

  return new;
end $$;

create or replace function public.validate_plan_feature_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'calibracoes' then
    perform public.assert_plan_feature(new.empresa_id, 'calibracoes');
  elsif tg_table_name = 'qualificacoes' then
    perform public.assert_plan_feature(new.empresa_id, 'qualificacoes');
  elsif tg_table_name = 'manutencoes' then
    perform public.assert_plan_feature(new.empresa_id, 'manutencoes');
  elsif tg_table_name = 'pendencias' then
    perform public.assert_plan_feature(new.empresa_id, 'pendencias');
  elsif tg_table_name = 'alertas' then
    perform public.assert_plan_feature(new.empresa_id, 'alertas');
  elsif tg_table_name = 'anexos' then
    perform public.assert_plan_feature(new.empresa_id, 'anexos');
  end if;

  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['calibracoes','qualificacoes','manutencoes','pendencias','alertas','anexos'] loop
    execute format('drop trigger if exists trg_%I_plan_feature on public.%I', t, t);
    execute format(
      'create trigger trg_%I_plan_feature before insert or update on public.%I for each row execute function public.validate_plan_feature_usage()',
      t,
      t
    );
  end loop;
end $$;

create or replace function public.validate_user_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_value integer;
  current_value bigint;
begin
  if new.ativo and new.deleted_at is null then
    perform public.assert_plan_feature(new.empresa_id, 'usuarios');

    select p.limite_usuarios into limit_value
    from public.empresas e join public.planos p on p.id = e.plano_id
    where e.id = new.empresa_id;

    if limit_value is not null then
      select count(*) into current_value
      from public.usuarios_empresas ue
      where ue.empresa_id = new.empresa_id
        and ue.ativo
        and ue.deleted_at is null
        and (tg_op = 'INSERT' or ue.id <> new.id);

      if current_value >= limit_value then
        raise exception 'Limite de usuários do plano atingido.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_usuarios_empresas_plan_limit on public.usuarios_empresas;
create trigger trg_usuarios_empresas_plan_limit
before insert or update on public.usuarios_empresas
for each row execute function public.validate_user_plan_limit();

create or replace function public.api_master_financeiro_resumo()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'empresas_ativas', (select count(*) from public.empresas where status = 'ativa' and deleted_at is null),
    'empresas_bloqueadas', (select count(*) from public.empresas where status = 'bloqueada' and deleted_at is null),
    'assinaturas_ativas', (select count(*) from public.assinaturas_empresas where status in ('trial','ativa','pagamento_pendente') and deleted_at is null),
    'assinaturas_inadimplentes', (select count(*) from public.assinaturas_empresas where status in ('inadimplente','bloqueada') and deleted_at is null),
    'usuarios_ativos', (
      select count(distinct ue.usuario_id)
      from public.usuarios_empresas ue
      join public.usuarios u on u.id = ue.usuario_id
      where ue.ativo and ue.deleted_at is null and u.status = 'ativo' and u.deleted_at is null
    ),
    'receita_mensal_prevista_centavos', (
      select coalesce(sum(greatest(a.valor_mensal_centavos - a.desconto_centavos, 0)), 0)
      from public.assinaturas_empresas a
      where a.status in ('trial','ativa','pagamento_pendente') and a.deleted_at is null
    ),
    'receita_recebida_mes_centavos', (
      select coalesce(sum(f.valor_pago_centavos), 0)
      from public.faturas f
      where f.status = 'paga'
        and f.paga_em >= date_trunc('month', now())
        and f.deleted_at is null
    ),
    'proximos_pagamentos', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.proximo_vencimento), '[]'::jsonb)
      from (
        select e.id empresa_id, e.nome_fantasia, e.cnpj, a.status, a.proximo_vencimento,
               greatest(a.valor_mensal_centavos - a.desconto_centavos, 0) valor_centavos
        from public.assinaturas_empresas a
        join public.empresas e on e.id = a.empresa_id
        where a.deleted_at is null
          and a.status in ('trial','ativa','pagamento_pendente')
        order by a.proximo_vencimento nulls last
        limit 10
      ) x
    ),
    'pagamentos_atrasados', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.vencimento), '[]'::jsonb)
      from (
        select e.id empresa_id, e.nome_fantasia, e.cnpj, f.id fatura_id, f.vencimento, f.valor_centavos, f.status
        from public.faturas f
        join public.empresas e on e.id = f.empresa_id
        where f.deleted_at is null
          and f.status in ('pendente','vencida')
          and f.vencimento < current_date
        order by f.vencimento
        limit 10
      ) x
    )
  );
end $$;

create or replace function public.api_master_listar_planos()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(p) order by p.ordem, p.valor_mensal_centavos), '[]'::jsonb)
    from public.planos p
  );
end $$;

create or replace function public.api_master_salvar_plano(p_plano_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.planos;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  if p_plano_id is null then
    insert into public.planos(
      nome, codigo, descricao, limite_usuarios, limite_documentos, limite_equipamentos, limite_storage_mb,
      valor_mensal_centavos, valor_anual_centavos, moeda, trial_dias, disponivel_venda, recursos, ativo, ordem
    )
    values (
      trim(p_payload->>'nome'),
      lower(regexp_replace(coalesce(nullif(p_payload->>'codigo',''), p_payload->>'nome'), '[^a-zA-Z0-9]+', '-', 'g')),
      nullif(p_payload->>'descricao',''),
      coalesce(nullif(p_payload->>'limite_usuarios','')::integer, 5),
      nullif(p_payload->>'limite_documentos','')::integer,
      nullif(p_payload->>'limite_equipamentos','')::integer,
      coalesce(nullif(p_payload->>'limite_storage_mb','')::integer, 1024),
      coalesce(nullif(p_payload->>'valor_mensal_centavos','')::integer, 0),
      nullif(p_payload->>'valor_anual_centavos','')::integer,
      coalesce(nullif(p_payload->>'moeda',''), 'BRL'),
      coalesce(nullif(p_payload->>'trial_dias','')::integer, 0),
      coalesce((p_payload->>'disponivel_venda')::boolean, true),
      coalesce(p_payload->'recursos', '{}'::jsonb),
      coalesce((p_payload->>'ativo')::boolean, true),
      coalesce(nullif(p_payload->>'ordem','')::integer, 0)
    )
    returning * into saved;
  else
    update public.planos p
    set
      nome = coalesce(nullif(trim(p_payload->>'nome'), ''), p.nome),
      codigo = coalesce(nullif(lower(regexp_replace(p_payload->>'codigo', '[^a-zA-Z0-9]+', '-', 'g')), ''), p.codigo),
      descricao = coalesce(p_payload->>'descricao', p.descricao),
      limite_usuarios = coalesce(nullif(p_payload->>'limite_usuarios','')::integer, p.limite_usuarios),
      limite_documentos = case when p_payload ? 'limite_documentos' then nullif(p_payload->>'limite_documentos','')::integer else p.limite_documentos end,
      limite_equipamentos = case when p_payload ? 'limite_equipamentos' then nullif(p_payload->>'limite_equipamentos','')::integer else p.limite_equipamentos end,
      limite_storage_mb = coalesce(nullif(p_payload->>'limite_storage_mb','')::integer, p.limite_storage_mb),
      valor_mensal_centavos = coalesce(nullif(p_payload->>'valor_mensal_centavos','')::integer, p.valor_mensal_centavos),
      valor_anual_centavos = case when p_payload ? 'valor_anual_centavos' then nullif(p_payload->>'valor_anual_centavos','')::integer else p.valor_anual_centavos end,
      moeda = coalesce(nullif(p_payload->>'moeda',''), p.moeda),
      trial_dias = coalesce(nullif(p_payload->>'trial_dias','')::integer, p.trial_dias),
      disponivel_venda = coalesce((p_payload->>'disponivel_venda')::boolean, p.disponivel_venda),
      recursos = coalesce(p_payload->'recursos', p.recursos),
      ativo = coalesce((p_payload->>'ativo')::boolean, p.ativo),
      ordem = coalesce(nullif(p_payload->>'ordem','')::integer, p.ordem),
      updated_at = now()
    where p.id = p_plano_id
    returning * into saved;
  end if;

  return to_jsonb(saved);
end $$;

create or replace function public.api_master_atualizar_assinatura(p_empresa_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  previous public.assinaturas_empresas;
  saved public.assinaturas_empresas;
  target_plan public.planos;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  select * into target_plan
  from public.planos
  where id = nullif(p_payload->>'plano_id','')::uuid;

  if target_plan.id is null then
    raise exception 'Plano inválido.';
  end if;

  select * into previous
  from public.assinaturas_empresas
  where empresa_id = p_empresa_id and deleted_at is null;

  insert into public.assinaturas_empresas(
    empresa_id, plano_id, status, ciclo, valor_mensal_centavos, valor_anual_centavos,
    desconto_centavos, desconto_percentual, moeda, gateway, gateway_customer_id,
    gateway_subscription_id, trial_termina_em, proximo_vencimento, ultimo_pagamento_em,
    observacoes_internas, updated_by, created_by
  )
  values (
    p_empresa_id,
    target_plan.id,
    coalesce(nullif(p_payload->>'status',''), 'ativa'),
    coalesce(nullif(p_payload->>'ciclo',''), 'mensal'),
    coalesce(nullif(p_payload->>'valor_mensal_centavos','')::integer, target_plan.valor_mensal_centavos),
    coalesce(nullif(p_payload->>'valor_anual_centavos','')::integer, target_plan.valor_anual_centavos),
    coalesce(nullif(p_payload->>'desconto_centavos','')::integer, 0),
    coalesce(nullif(p_payload->>'desconto_percentual','')::numeric, 0),
    coalesce(nullif(p_payload->>'moeda',''), target_plan.moeda),
    nullif(p_payload->>'gateway',''),
    nullif(p_payload->>'gateway_customer_id',''),
    nullif(p_payload->>'gateway_subscription_id',''),
    nullif(p_payload->>'trial_termina_em','')::date,
    nullif(p_payload->>'proximo_vencimento','')::date,
    nullif(p_payload->>'ultimo_pagamento_em','')::date,
    nullif(p_payload->>'observacoes_internas',''),
    auth.uid(),
    auth.uid()
  )
  on conflict (empresa_id) do update set
    plano_id = excluded.plano_id,
    status = excluded.status,
    ciclo = excluded.ciclo,
    valor_mensal_centavos = excluded.valor_mensal_centavos,
    valor_anual_centavos = excluded.valor_anual_centavos,
    desconto_centavos = excluded.desconto_centavos,
    desconto_percentual = excluded.desconto_percentual,
    moeda = excluded.moeda,
    gateway = excluded.gateway,
    gateway_customer_id = excluded.gateway_customer_id,
    gateway_subscription_id = excluded.gateway_subscription_id,
    trial_termina_em = excluded.trial_termina_em,
    proximo_vencimento = excluded.proximo_vencimento,
    ultimo_pagamento_em = excluded.ultimo_pagamento_em,
    observacoes_internas = excluded.observacoes_internas,
    updated_by = auth.uid(),
    updated_at = now(),
    deleted_at = null
  returning * into saved;

  insert into public.historico_planos_empresas(
    empresa_id, assinatura_id, plano_anterior_id, plano_novo_id,
    valor_anterior_centavos, valor_novo_centavos, motivo, alterado_por
  )
  values (
    p_empresa_id,
    saved.id,
    previous.plano_id,
    saved.plano_id,
    previous.valor_mensal_centavos,
    saved.valor_mensal_centavos,
    nullif(p_payload->>'motivo',''),
    auth.uid()
  );

  return to_jsonb(saved);
end $$;

create or replace function public.api_master_listar_assinaturas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.proximo_vencimento nulls last, x.nome_fantasia), '[]'::jsonb)
    from (
      select
        e.id as empresa_id,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        e.status as empresa_status,
        p.nome as plano_nome,
        p.id as plano_id,
        a.status,
        a.ciclo,
        a.valor_mensal_centavos,
        a.valor_anual_centavos,
        a.desconto_centavos,
        a.desconto_percentual,
        a.proximo_vencimento,
        a.ultimo_pagamento_em,
        (select count(*) from public.usuarios_empresas ue where ue.empresa_id = e.id and ue.ativo and ue.deleted_at is null) usuarios_ativos
      from public.empresas e
      left join public.assinaturas_empresas a on a.empresa_id = e.id and a.deleted_at is null
      left join public.planos p on p.id = coalesce(a.plano_id, e.plano_id)
      where e.deleted_at is null
    ) x
  );
end $$;

revoke all on function public.company_billing_allows_write(uuid) from public, anon;
revoke all on function public.plan_feature_enabled(uuid,text) from public, anon;
revoke all on function public.assert_plan_feature(uuid,text) from public, anon;
revoke all on function public.api_master_financeiro_resumo() from public, anon;
revoke all on function public.api_master_listar_planos() from public, anon;
revoke all on function public.api_master_salvar_plano(uuid,jsonb) from public, anon;
revoke all on function public.api_master_atualizar_assinatura(uuid,jsonb) from public, anon;
revoke all on function public.api_master_listar_assinaturas() from public, anon;

grant execute on function public.company_billing_allows_write(uuid) to authenticated;
grant execute on function public.plan_feature_enabled(uuid,text) to authenticated;
grant execute on function public.api_master_financeiro_resumo() to authenticated;
grant execute on function public.api_master_listar_planos() to authenticated;
grant execute on function public.api_master_salvar_plano(uuid,jsonb) to authenticated;
grant execute on function public.api_master_atualizar_assinatura(uuid,jsonb) to authenticated;
grant execute on function public.api_master_listar_assinaturas() to authenticated;

grant select on public.assinaturas_empresas, public.faturas, public.historico_planos_empresas to authenticated;
