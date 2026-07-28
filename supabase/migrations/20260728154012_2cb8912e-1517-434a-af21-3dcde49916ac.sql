-- Conform Flow — parceiros, clientes vinculados e cobrança consolidada.
-- O parceiro é o titular financeiro; cada cliente continua sendo um tenant isolado.

alter table public.empresas
  add column if not exists tipo_conta text not null default 'direta',
  add column if not exists parceiro_origem_id uuid references public.empresas(id);

alter table public.empresas
  drop constraint if exists empresas_tipo_conta_check;
alter table public.empresas
  add constraint empresas_tipo_conta_check
  check (tipo_conta in ('direta', 'parceira', 'cliente'));

create index if not exists idx_empresas_tipo_conta
  on public.empresas(tipo_conta, parceiro_origem_id)
  where deleted_at is null;

alter table public.planos
  add column if not exists tipo_plano text not null default 'direto',
  add column if not exists limite_clientes integer,
  add column if not exists preco_cliente_extra_centavos integer;

alter table public.planos
  drop constraint if exists planos_tipo_plano_check;
alter table public.planos
  add constraint planos_tipo_plano_check
  check (tipo_plano in ('direto', 'parceiro'));

alter table public.planos
  drop constraint if exists planos_clientes_validos;
alter table public.planos
  add constraint planos_clientes_validos
  check (
    (tipo_plano = 'direto' and limite_clientes is null and preco_cliente_extra_centavos is null)
    or (tipo_plano = 'parceiro' and limite_clientes is not null and limite_clientes > 0
      and preco_cliente_extra_centavos is not null and preco_cliente_extra_centavos >= 0)
  );

insert into public.planos (
  nome, codigo, tipo_plano, descricao, valor_mensal_centavos, valor_anual_centavos,
  moeda, limite_usuarios, limite_unidades, limite_clientes, preco_cliente_extra_centavos,
  limite_storage_mb, trial_dias, disponivel_venda, ativo, recursos, ordem
)
values
  (
    'Parceiro Start', 'parceiro_start', 'parceiro',
    'Para parceiros que acompanham até 5 empresas clientes.',
    49900, 499000, 'BRL', 8, 3, 5, 7990, 10240, 14, true, true,
    jsonb_build_object(
      'assistente_ia', true, 'documentos', true, 'equipamentos', true,
      'calibracoes', true, 'qualificacoes', true, 'manutencoes', true,
      'pendencias', true, 'alertas', true, 'relatorios', true, 'auditoria', true,
      'usuarios', true, 'anexos', true, 'multi_clientes', true,
      'visao_consolidada', true, 'relatorios_por_cliente', true
    ), 110
  ),
  (
    'Parceiro Pro', 'parceiro_pro', 'parceiro',
    'Para parceiros com carteira de até 15 empresas clientes.',
    89900, 899000, 'BRL', 15, 10, 15, 5990, 30720, 14, true, true,
    jsonb_build_object(
      'assistente_ia', true, 'documentos', true, 'equipamentos', true,
      'calibracoes', true, 'qualificacoes', true, 'manutencoes', true,
      'pendencias', true, 'alertas', true, 'relatorios', true, 'auditoria', true,
      'usuarios', true, 'anexos', true, 'multi_clientes', true,
      'visao_consolidada', true, 'relatorios_por_cliente', true,
      'suporte_prioritario', true
    ), 120
  ),
  (
    'Parceiro Enterprise', 'parceiro_enterprise', 'parceiro',
    'Para operações estruturadas com até 40 empresas clientes.',
    169900, 1699000, 'BRL', 30, 25, 40, 4990, 102400, 14, true, true,
    jsonb_build_object(
      'assistente_ia', true, 'documentos', true, 'equipamentos', true,
      'calibracoes', true, 'qualificacoes', true, 'manutencoes', true,
      'pendencias', true, 'alertas', true, 'relatorios', true, 'auditoria', true,
      'usuarios', true, 'anexos', true, 'multi_clientes', true,
      'visao_consolidada', true, 'relatorios_por_cliente', true,
      'suporte_prioritario', true, 'sso', true, 'api', true
    ), 130
  )
on conflict (codigo) do update set
  nome = excluded.nome,
  tipo_plano = excluded.tipo_plano,
  descricao = excluded.descricao,
  valor_mensal_centavos = excluded.valor_mensal_centavos,
  valor_anual_centavos = excluded.valor_anual_centavos,
  limite_usuarios = excluded.limite_usuarios,
  limite_unidades = excluded.limite_unidades,
  limite_clientes = excluded.limite_clientes,
  preco_cliente_extra_centavos = excluded.preco_cliente_extra_centavos,
  limite_storage_mb = excluded.limite_storage_mb,
  trial_dias = excluded.trial_dias,
  disponivel_venda = excluded.disponivel_venda,
  ativo = excluded.ativo,
  recursos = excluded.recursos,
  ordem = excluded.ordem,
  updated_at = now();

create table if not exists public.relacionamentos_parceiro_clientes (
  id uuid primary key default gen_random_uuid(),
  parceiro_empresa_id uuid not null references public.empresas(id),
  cliente_empresa_id uuid not null unique references public.empresas(id),
  plano_servico_id uuid not null references public.planos(id),
  status text not null default 'ativo' check (status in ('ativo', 'suspenso', 'encerrado')),
  inicio_em timestamptz not null default now(),
  encerrado_em timestamptz,
  observacoes text,
  created_by uuid references public.usuarios(id),
  updated_by uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relacionamento_parceiro_cliente_distinto
    check (parceiro_empresa_id <> cliente_empresa_id),
  constraint relacionamento_cliente_plano_direto
    check (status <> 'ativo' or plano_servico_id is not null)
);

create unique index if not exists uq_relacionamento_parceiro_cliente_ativo
  on public.relacionamentos_parceiro_clientes(parceiro_empresa_id, cliente_empresa_id)
  where status = 'ativo';
create index if not exists idx_relacionamentos_parceiro
  on public.relacionamentos_parceiro_clientes(parceiro_empresa_id, status);
create index if not exists idx_relacionamentos_cliente
  on public.relacionamentos_parceiro_clientes(cliente_empresa_id, status);

alter table public.assinaturas_empresas
  add column if not exists clientes_incluidos integer not null default 0,
  add column if not exists clientes_ativos integer not null default 0,
  add column if not exists clientes_extras integer not null default 0,
  add column if not exists preco_cliente_extra_centavos integer not null default 0,
  add column if not exists stripe_cliente_extra_price_id text,
  add column if not exists stripe_cliente_extra_subscription_item_id text,
  add column if not exists cobranca_consolidada boolean not null default false;

alter table public.assinaturas_empresas
  drop constraint if exists assinaturas_clientes_validos;
alter table public.assinaturas_empresas
  add constraint assinaturas_clientes_validos
  check (clientes_incluidos >= 0 and clientes_ativos >= 0 and clientes_extras >= 0
    and preco_cliente_extra_centavos >= 0);

alter table public.relacionamentos_parceiro_clientes enable row level security;
revoke all on public.relacionamentos_parceiro_clientes from anon, authenticated;
grant select on public.relacionamentos_parceiro_clientes to authenticated;

create or replace function public.partner_relation_for_user(p_empresa_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select rpc.parceiro_empresa_id
  from public.relacionamentos_parceiro_clientes rpc
  join public.usuarios_empresas ue
    on ue.empresa_id = rpc.parceiro_empresa_id
   and ue.usuario_id = auth.uid()
   and ue.ativo and ue.deleted_at is null
  join public.usuarios u on u.id = ue.usuario_id and u.status = 'ativo' and u.deleted_at is null
  join public.empresas p on p.id = rpc.parceiro_empresa_id and p.deleted_at is null
  where rpc.cliente_empresa_id = p_empresa_id
    and rpc.status = 'ativo'
  limit 1
$$;

create or replace function public.has_company_membership(p_empresa_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_master() or exists (
    select 1
    from public.usuarios_empresas ue
    join public.usuarios u on u.id = ue.usuario_id
    join public.empresas e on e.id = ue.empresa_id
    where ue.usuario_id = auth.uid() and ue.empresa_id = p_empresa_id
      and ue.ativo and ue.deleted_at is null
      and u.status = 'ativo' and u.deleted_at is null and e.deleted_at is null
  ) or public.partner_relation_for_user(p_empresa_id) is not null
$$;

create or replace function public.has_company_access(p_empresa_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_master() or exists (
    select 1
    from public.usuarios_empresas ue
    join public.usuarios u on u.id = ue.usuario_id
    join public.empresas e on e.id = ue.empresa_id
    where ue.usuario_id = auth.uid() and ue.empresa_id = p_empresa_id
      and ue.ativo and ue.deleted_at is null
      and u.status = 'ativo' and u.deleted_at is null
      and e.access_status in ('provisional', 'active') and e.deleted_at is null
  ) or exists (
    select 1
    from public.relacionamentos_parceiro_clientes rpc
    join public.empresas p on p.id = rpc.parceiro_empresa_id
    join public.usuarios_empresas ue on ue.empresa_id = p.id
      and ue.usuario_id = auth.uid() and ue.ativo and ue.deleted_at is null
    join public.usuarios u on u.id = ue.usuario_id and u.status = 'ativo' and u.deleted_at is null
    join public.assinaturas_empresas a on a.empresa_id = p.id and a.deleted_at is null
    where rpc.cliente_empresa_id = p_empresa_id
      and rpc.status = 'ativo' and p.deleted_at is null
      and p.access_status in ('provisional', 'active')
      and a.status in ('trial', 'ativa', 'pagamento_pendente')
  )
$$;

create or replace function public.company_role(p_empresa_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when public.is_master() then 'master'
    when exists (
      select 1 from public.usuarios_empresas ue
      where ue.usuario_id = auth.uid() and ue.empresa_id = p_empresa_id
        and ue.ativo and ue.deleted_at is null
    ) then (
      select ue.perfil from public.usuarios_empresas ue
      where ue.usuario_id = auth.uid() and ue.empresa_id = p_empresa_id
        and ue.ativo and ue.deleted_at is null limit 1
    )
    when exists (
      select 1 from public.relacionamentos_parceiro_clientes rpc
      join public.usuarios_empresas ue on ue.empresa_id = rpc.parceiro_empresa_id
        and ue.usuario_id = auth.uid() and ue.ativo and ue.deleted_at is null
      where rpc.cliente_empresa_id = p_empresa_id and rpc.status = 'ativo'
    ) then case when exists (
      select 1 from public.usuarios_empresas ue
      join public.relacionamentos_parceiro_clientes rpc on rpc.parceiro_empresa_id = ue.empresa_id
      where ue.usuario_id = auth.uid() and rpc.cliente_empresa_id = p_empresa_id
        and rpc.status = 'ativo' and ue.perfil = 'administrador'
    ) then 'parceiro_administrador' else 'parceiro_colaborador' end
  end
$$;

create or replace function public.subscription_status_normalized(p_empresa_id uuid)
returns text language sql stable security definer set search_path = public
as $$
  select coalesce((
    select case a.status when 'trial' then 'trialing' when 'ativa' then 'active'
      when 'pagamento_pendente' then 'payment_pending' when 'inadimplente' then 'past_due'
      when 'bloqueada' then 'past_due' when 'cancelada' then 'canceled' else 'expired' end
    from public.assinaturas_empresas a
    where a.empresa_id = p_empresa_id and a.deleted_at is null limit 1
  ), (
    select case a.status when 'trial' then 'trialing' when 'ativa' then 'active'
      when 'pagamento_pendente' then 'payment_pending' when 'inadimplente' then 'past_due'
      when 'bloqueada' then 'past_due' when 'cancelada' then 'canceled' else 'expired' end
    from public.relacionamentos_parceiro_clientes rpc
    join public.assinaturas_empresas a on a.empresa_id = rpc.parceiro_empresa_id
      and a.deleted_at is null
    where rpc.cliente_empresa_id = p_empresa_id and rpc.status = 'ativo' limit 1
  ), 'trialing')
$$;

create or replace function public.company_billing_allows_write(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((
    select case
      when e.tipo_conta = 'cliente' then coalesce((
        select a.status in ('trial','ativa','pagamento_pendente')
        from public.relacionamentos_parceiro_clientes rpc
        join public.assinaturas_empresas a on a.empresa_id = rpc.parceiro_empresa_id
          and a.deleted_at is null
        where rpc.cliente_empresa_id = e.id and rpc.status = 'ativo' limit 1
      ), false)
      when e.access_status = 'provisional' then true
      when a.id is null then true
      else a.status in ('trial','ativa','pagamento_pendente')
    end
    from public.empresas e left join public.assinaturas_empresas a
      on a.empresa_id = e.id and a.deleted_at is null
    where e.id = p_empresa_id and e.deleted_at is null limit 1
  ), false)
$$;

create or replace function public.can_write_company(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(public.has_company_access(p_empresa_id)
    and public.company_role(p_empresa_id) in (
      'master','administrador_provisorio','administrador','responsavel_tecnico',
      'colaborador','parceiro_administrador','parceiro_colaborador'
    ) and public.company_billing_allows_write(p_empresa_id), false)
$$;

create or replace function public.can_admin_company(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(public.has_company_access(p_empresa_id)
    and public.company_role(p_empresa_id) in ('master','administrador_provisorio','administrador','parceiro_administrador'), false)
$$;

create or replace function public.api_contexto_usuario()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida' using errcode = '28000'; end if;
  select jsonb_build_object(
    'usuario', jsonb_build_object('id', u.id, 'nome', u.nome, 'email', u.email,
      'cargo', u.cargo, 'is_master', u.is_master, 'status', u.status),
    'empresas', coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'nome_fantasia', e.nome_fantasia, 'razao_social', e.razao_social,
      'cnpj', e.cnpj, 'status', e.status, 'tipo_conta', e.tipo_conta,
      'parceiro_empresa_id', case when e.tipo_conta = 'cliente' then e.parceiro_origem_id else null end,
      'verification_status', e.verification_status, 'access_status', e.access_status,
      'subscription_status', public.subscription_status_normalized(e.id),
      'perfil', case when u.is_master then 'master' else public.company_role(e.id) end,
      'plano', case when p.id is null then null else jsonb_build_object('id', p.id,
        'nome', p.nome, 'codigo', p.codigo, 'tipo_plano', p.tipo_plano,
        'recursos', p.recursos, 'limite_usuarios', p.limite_usuarios,
        'limite_documentos', p.limite_documentos, 'limite_equipamentos', p.limite_equipamentos,
        'limite_storage_mb', p.limite_storage_mb) end
    ) order by e.nome_fantasia) filter (where e.id is not null), '[]'::jsonb)
  ) into v_result
  from public.usuarios u
  left join public.empresas e on e.deleted_at is null and (
    u.is_master or public.has_company_membership(e.id)
  )
  left join public.planos p on p.id = e.plano_id and p.ativo
  where u.id = auth.uid() and u.deleted_at is null
  group by u.id;
  if v_result is null then raise exception 'Perfil não encontrado'; end if;
  return v_result;
end $$;

create or replace function public.api_partner_listar_planos()
returns jsonb language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'codigo', p.codigo, 'nome', p.nome, 'descricao', p.descricao,
    'valor_mensal_centavos', p.valor_mensal_centavos, 'valor_anual_centavos', p.valor_anual_centavos,
    'moeda', p.moeda, 'limite_clientes', p.limite_clientes,
    'preco_cliente_extra_centavos', p.preco_cliente_extra_centavos, 'recursos', p.recursos
  ) order by p.ordem), '[]'::jsonb)
  from public.planos p
  where p.tipo_plano = 'parceiro' and p.ativo and p.disponivel_venda
    and (public.is_master() or exists (
      select 1 from public.usuarios_empresas ue
      join public.empresas e on e.id = ue.empresa_id and e.tipo_conta = 'parceira'
      where ue.usuario_id = auth.uid() and ue.ativo and ue.deleted_at is null
    ))
$$;

create or replace function public.api_public_catalogo_parceiros()
returns jsonb language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'codigo', p.codigo, 'nome', p.nome, 'descricao', p.descricao,
    'valor_mensal_centavos', p.valor_mensal_centavos, 'valor_anual_centavos', p.valor_anual_centavos,
    'moeda', p.moeda, 'limite_clientes', p.limite_clientes,
    'preco_cliente_extra_centavos', p.preco_cliente_extra_centavos, 'recursos', p.recursos
  ) order by p.ordem), '[]'::jsonb)
  from public.planos p
  where p.tipo_plano = 'parceiro' and p.ativo and p.disponivel_venda
$$;

create or replace function public.api_partner_listar_clientes(p_parceiro_empresa_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare v_result jsonb;
begin
  if not public.is_master() and not exists (
    select 1 from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid() and ue.empresa_id = p_parceiro_empresa_id
      and ue.ativo and ue.deleted_at is null and ue.perfil = 'administrador'
  ) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'razao_social', c.razao_social, 'nome_fantasia', c.nome_fantasia,
    'cnpj', c.cnpj, 'status', c.status, 'access_status', c.access_status,
    'segmento', c.segmento, 'tipo_estabelecimento', c.tipo_estabelecimento,
    'plano', jsonb_build_object('id', p.id, 'nome', p.nome, 'codigo', p.codigo),
    'relacionamento', jsonb_build_object('id', rpc.id, 'status', rpc.status,
      'inicio_em', rpc.inicio_em, 'encerrado_em', rpc.encerrado_em)
  ) order by c.nome_fantasia), '[]'::jsonb)
  into v_result
  from public.relacionamentos_parceiro_clientes rpc
  join public.empresas c on c.id = rpc.cliente_empresa_id and c.deleted_at is null
  join public.planos p on p.id = rpc.plano_servico_id
  where rpc.parceiro_empresa_id = p_parceiro_empresa_id and rpc.status <> 'encerrado';
  return v_result;
end $$;

create or replace function public.api_partner_resumo(p_parceiro_empresa_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare v_plan public.planos; v_subscription public.assinaturas_empresas; v_clients integer;
begin
  if not public.is_master() and not exists (
    select 1 from public.usuarios_empresas ue where ue.usuario_id = auth.uid()
      and ue.empresa_id = p_parceiro_empresa_id and ue.perfil = 'administrador'
      and ue.ativo and ue.deleted_at is null
  ) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  select p.* into v_plan from public.empresas e join public.planos p on p.id = e.plano_id
    where e.id = p_parceiro_empresa_id and e.tipo_conta = 'parceira';
  select a.* into v_subscription from public.assinaturas_empresas a
    where a.empresa_id = p_parceiro_empresa_id and a.deleted_at is null;
  select count(*)::integer into v_clients from public.relacionamentos_parceiro_clientes rpc
    where rpc.parceiro_empresa_id = p_parceiro_empresa_id and rpc.status = 'ativo';
  return jsonb_build_object('parceiro_empresa_id', p_parceiro_empresa_id,
    'plano', case when v_plan.id is null then null else jsonb_build_object(
      'id', v_plan.id, 'codigo', v_plan.codigo, 'nome', v_plan.nome,
      'descricao', v_plan.descricao, 'valor_mensal_centavos', v_plan.valor_mensal_centavos,
      'valor_anual_centavos', v_plan.valor_anual_centavos, 'moeda', v_plan.moeda,
      'limite_clientes', v_plan.limite_clientes,
      'preco_cliente_extra_centavos', v_plan.preco_cliente_extra_centavos,
      'recursos', v_plan.recursos
    ) end,
    'assinatura', case when v_subscription.id is null then null else jsonb_build_object(
      'status', v_subscription.status, 'ciclo', v_subscription.ciclo,
      'valor_mensal_centavos', v_subscription.valor_mensal_centavos,
      'valor_anual_centavos', v_subscription.valor_anual_centavos,
      'clientes_incluidos', v_subscription.clientes_incluidos,
      'clientes_ativos', v_subscription.clientes_ativos,
      'clientes_extras', v_subscription.clientes_extras,
      'proximo_vencimento', v_subscription.proximo_vencimento
    ) end,
    'clientes_ativos', coalesce(v_clients,0),
    'clientes_incluidos', coalesce(v_subscription.clientes_incluidos, v_plan.limite_clientes, 0),
    'clientes_extras', greatest(coalesce(v_clients,0) - coalesce(v_plan.limite_clientes,0), 0));
end $$;

create or replace function public.api_partner_vincular_cliente(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_partner_id uuid := nullif(p_payload->>'parceiro_empresa_id','')::uuid;
  v_client public.empresas; v_plan public.planos; v_partner_plan public.planos;
  v_active_clients integer; v_included integer; v_extra integer; v_billing_status text;
begin
  if not public.is_master() and not exists (
    select 1 from public.usuarios_empresas ue where ue.usuario_id = auth.uid()
      and ue.empresa_id = v_partner_id and ue.perfil = 'administrador'
      and ue.ativo and ue.deleted_at is null
  ) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  select p.* into v_partner_plan from public.empresas e join public.planos p on p.id = e.plano_id
    where e.id = v_partner_id and e.tipo_conta = 'parceira' and p.tipo_plano = 'parceiro' and p.ativo;
  if not found then raise exception 'PLANO_PARCEIRO_NAO_CONFIGURADO' using errcode = 'P0001'; end if;
  select count(*)::integer into v_active_clients from public.relacionamentos_parceiro_clientes
    where parceiro_empresa_id = v_partner_id and status = 'ativo';
  select coalesce(a.clientes_extras,0), coalesce(a.clientes_incluidos, v_partner_plan.limite_clientes, 0), a.status
    into v_extra, v_included, v_billing_status from public.assinaturas_empresas a
    where a.empresa_id = v_partner_id and a.deleted_at is null;
  if v_billing_status is null or v_billing_status not in ('trial','ativa','pagamento_pendente') then
    raise exception 'PARTNER_BILLING_NOT_ACTIVE' using errcode = '42501';
  end if;
  if v_active_clients >= v_included + v_extra then
    raise exception 'LIMITE_CLIENTES_PARCEIRO_ATINGIDO' using errcode = 'P0001';
  end if;
  select p.* into v_plan from public.planos p
    where p.codigo = lower(trim(p_payload->>'plano_servico_codigo'))
      and p.tipo_plano = 'direto' and p.ativo and p.disponivel_venda;
  if not found then raise exception 'PLANO_SERVICO_INVALIDO' using errcode = 'P0001'; end if;
  insert into public.empresas (
    razao_social, nome_fantasia, cnpj, tipo_estabelecimento, segmento,
    email_principal, plano_id, tipo_conta, parceiro_origem_id,
    status, verification_status, access_status, observacoes
  ) values (
    trim(p_payload->>'razao_social'),
    coalesce(nullif(trim(p_payload->>'nome_fantasia'),''), trim(p_payload->>'razao_social')),
    trim(p_payload->>'cnpj'), nullif(trim(p_payload->>'tipo_estabelecimento'),''),
    nullif(trim(p_payload->>'segmento'),''), nullif(trim(p_payload->>'email_principal'),''),
    v_plan.id, 'cliente', v_partner_id, 'ativa', 'verified', 'active',
    'Cliente cadastrado por parceiro; cobrança consolidada no parceiro.'
  ) returning * into v_client;
  insert into public.relacionamentos_parceiro_clientes (
    parceiro_empresa_id, cliente_empresa_id, plano_servico_id, created_by
  ) values (v_partner_id, v_client.id, v_plan.id, auth.uid());
  perform public.api_provisionar_documentos_empresa(v_client.id, false);
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, novo_valor)
  values (v_partner_id, auth.uid(), 'parceiros', 'cliente_vinculado', v_client.id,
    jsonb_build_object('cliente_empresa_id', v_client.id, 'plano_servico', v_plan.codigo));
  return jsonb_build_object('cliente', to_jsonb(v_client), 'plano_servico', to_jsonb(v_plan));
exception when unique_violation then
  raise exception 'CLIENTE_CNPJ_JA_CADASTRADO' using errcode = '23505';
end $$;

-- Permite que o Admin Master crie o tenant parceiro com trial e titularidade
-- financeira própria. Clientes só podem ser adicionados depois pelo parceiro.
alter table public.planos
  add column if not exists stripe_client_extra_monthly_price_id text,
  add column if not exists stripe_client_extra_yearly_price_id text;

create or replace function public.api_master_criar_parceiro(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_empresa public.empresas; v_plan public.planos; v_user uuid := auth.uid();
begin
  if not public.is_master() then raise exception 'Acesso negado' using errcode = '42501'; end if;
  select p.* into v_plan from public.planos p
  where p.codigo = lower(trim(p_payload->>'plano_codigo'))
    and p.tipo_plano = 'parceiro' and p.ativo;
  if not found then raise exception 'PLANO_PARCEIRO_INVALIDO' using errcode = 'P0001'; end if;
  insert into public.empresas(
    razao_social, nome_fantasia, cnpj, tipo_estabelecimento, segmento,
    email_principal, plano_id, tipo_conta, status, verification_status,
    access_status, observacoes
  ) values (
    trim(p_payload->>'razao_social'),
    coalesce(nullif(trim(p_payload->>'nome_fantasia'),''), trim(p_payload->>'razao_social')),
    trim(p_payload->>'cnpj'), nullif(trim(p_payload->>'tipo_estabelecimento'),''),
    nullif(trim(p_payload->>'segmento'),''), nullif(trim(p_payload->>'email_principal'),''),
    v_plan.id, 'parceira', 'ativa', 'verified', 'active',
    'Conta parceira: titular da cobrança consolidada dos clientes vinculados.'
  ) returning * into v_empresa;
  insert into public.usuarios_empresas(usuario_id, empresa_id, perfil, ativo)
  values (v_user, v_empresa.id, 'administrador', true)
  on conflict (usuario_id, empresa_id) do update set ativo = true, deleted_at = null, updated_at = now();
  insert into public.assinaturas_empresas(
    empresa_id, plano_id, status, ciclo, valor_mensal_centavos,
    valor_anual_centavos, moeda, clientes_incluidos, preco_cliente_extra_centavos,
    cobranca_consolidada, trial_termina_em, proximo_vencimento, observacoes_internas
  ) values (
    v_empresa.id, v_plan.id, 'trial', 'mensal', v_plan.valor_mensal_centavos,
    v_plan.valor_anual_centavos, v_plan.moeda, v_plan.limite_clientes,
    v_plan.preco_cliente_extra_centavos, true, current_date + coalesce(v_plan.trial_dias,14),
    current_date + coalesce(v_plan.trial_dias,14), 'Criada pelo Admin Master.'
  );
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, novo_valor)
  values (v_empresa.id, v_user, 'parceiros', 'parceiro_criado',
    jsonb_build_object('plano', v_plan.codigo));
  return jsonb_build_object('empresa', to_jsonb(v_empresa), 'plano', to_jsonb(v_plan));
exception when unique_violation then
  raise exception 'PARCEIRO_CNPJ_JA_CADASTRADO' using errcode = '23505';
end $$;

create or replace function public.api_master_configurar_partner_gateway(
  p_plano_id uuid,
  p_stripe_product_id text,
  p_stripe_monthly_price_id text,
  p_stripe_yearly_price_id text,
  p_stripe_client_extra_monthly_price_id text,
  p_stripe_client_extra_yearly_price_id text
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_plan public.planos;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  if not exists (select 1 from public.planos where id = p_plano_id and tipo_plano = 'parceiro') then
    raise exception 'PARTNER_PLAN_NOT_FOUND';
  end if;
  if coalesce(nullif(trim(p_stripe_product_id),''),'') <> '' and trim(p_stripe_product_id) !~ '^prod_[A-Za-z0-9]+$' then raise exception 'INVALID_STRIPE_PRODUCT_ID'; end if;
  if coalesce(nullif(trim(p_stripe_monthly_price_id),''),'') <> '' and trim(p_stripe_monthly_price_id) !~ '^price_[A-Za-z0-9]+$' then raise exception 'INVALID_STRIPE_MONTHLY_PRICE_ID'; end if;
  if coalesce(nullif(trim(p_stripe_yearly_price_id),''),'') <> '' and trim(p_stripe_yearly_price_id) !~ '^price_[A-Za-z0-9]+$' then raise exception 'INVALID_STRIPE_YEARLY_PRICE_ID'; end if;
  if coalesce(nullif(trim(p_stripe_client_extra_monthly_price_id),''),'') <> '' and trim(p_stripe_client_extra_monthly_price_id) !~ '^price_[A-Za-z0-9]+$' then raise exception 'INVALID_STRIPE_CLIENT_EXTRA_MONTHLY_PRICE_ID'; end if;
  if coalesce(nullif(trim(p_stripe_client_extra_yearly_price_id),''),'') <> '' and trim(p_stripe_client_extra_yearly_price_id) !~ '^price_[A-Za-z0-9]+$' then raise exception 'INVALID_STRIPE_CLIENT_EXTRA_YEARLY_PRICE_ID'; end if;
  update public.planos set
    stripe_product_id = nullif(trim(p_stripe_product_id),''),
    stripe_monthly_price_id = nullif(trim(p_stripe_monthly_price_id),''),
    stripe_yearly_price_id = nullif(trim(p_stripe_yearly_price_id),''),
    stripe_client_extra_monthly_price_id = nullif(trim(p_stripe_client_extra_monthly_price_id),''),
    stripe_client_extra_yearly_price_id = nullif(trim(p_stripe_client_extra_yearly_price_id),''),
    updated_at = now()
  where id = p_plano_id returning * into v_plan;
  return to_jsonb(v_plan);
end $$;

create or replace function public.api_master_salvar_partner_plan(p_plano_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_plan public.planos;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  update public.planos set
    valor_mensal_centavos = coalesce(nullif(p_payload->>'valor_mensal_centavos','')::integer, valor_mensal_centavos),
    valor_anual_centavos = case when p_payload ? 'valor_anual_centavos' then nullif(p_payload->>'valor_anual_centavos','')::integer else valor_anual_centavos end,
    limite_usuarios = coalesce(nullif(p_payload->>'limite_usuarios','')::integer, limite_usuarios),
    limite_unidades = case when p_payload ? 'limite_unidades' then nullif(p_payload->>'limite_unidades','')::integer else limite_unidades end,
    limite_clientes = coalesce(nullif(p_payload->>'limite_clientes','')::integer, limite_clientes),
    preco_cliente_extra_centavos = coalesce(nullif(p_payload->>'preco_cliente_extra_centavos','')::integer, preco_cliente_extra_centavos),
    recursos = coalesce(p_payload->'recursos', recursos),
    disponivel_venda = coalesce((p_payload->>'disponivel_venda')::boolean, disponivel_venda),
    ativo = coalesce((p_payload->>'ativo')::boolean, ativo), updated_at = now()
  where id = p_plano_id and tipo_plano = 'parceiro' returning * into v_plan;
  if not found then raise exception 'PARTNER_PLAN_NOT_FOUND'; end if;
  return to_jsonb(v_plan);
end $$;

-- Clientes não possuem checkout próprio: o Stripe é atualizado por uma
-- rotina segura usando a assinatura e o preço de cliente extra do parceiro.
alter table public.planos
  add column if not exists stripe_client_extra_monthly_price_id text,
  add column if not exists stripe_client_extra_yearly_price_id text;

-- A contratação paga por um plano parceiro cria uma conta parceira, não uma
-- conta direta. O cliente final nunca passa por este fluxo.
create or replace function public.internal_provisionar_contratacao_paga(
  p_sessao_id uuid, p_auth_user_id uuid, p_stripe_customer_id text, p_stripe_subscription_id text
)
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare
  v_sessao public.sessoes_contratacao%rowtype; v_fotografia public.fotografias_contratacao%rowtype;
  v_empresa_id uuid; v_assinatura_id uuid; v_razao_social text; v_nome_fantasia text; v_endereco jsonb;
  v_tipo_plano text; v_conta text;
begin
  if auth.role() <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  select * into v_sessao from public.sessoes_contratacao where id = p_sessao_id for update;
  if not found then raise exception 'SIGNUP_SESSION_NOT_FOUND'; end if;
  if v_sessao.empresa_id is not null then
    return jsonb_build_object('empresa_id', v_sessao.empresa_id, 'assinatura_id', v_sessao.assinatura_id,
      'auth_user_id', v_sessao.auth_user_id, 'status', v_sessao.status, 'idempotent', true);
  end if;
  if v_sessao.status not in ('checkout_pendente','pagamento_confirmado','email_pendente') then
    raise exception 'SIGNUP_SESSION_INVALID_STATUS';
  end if;
  select * into v_fotografia from public.fotografias_contratacao
    where sessao_contratacao_id = v_sessao.id order by versao desc limit 1;
  if not found then raise exception 'CONTRACT_SNAPSHOT_NOT_FOUND'; end if;
  if exists (select 1 from public.empresas e where e.cnpj_normalizado = v_sessao.cnpj_normalizado and e.deleted_at is null) then
    raise exception 'COMPANY_ALREADY_REGISTERED';
  end if;
  select p.tipo_plano into v_tipo_plano from public.planos p where p.id = v_sessao.plano_id;
  v_conta := case when v_tipo_plano = 'parceiro' then 'parceira' else 'direta' end;
  insert into public.usuarios(id, nome, email, telefone, cargo, status)
  values (p_auth_user_id, coalesce(v_sessao.responsavel_json ->> 'nome','Responsável'), v_sessao.email_responsavel,
    v_sessao.responsavel_json ->> 'telefone', v_sessao.responsavel_json ->> 'cargo', 'ativo')
  on conflict (id) do update set nome = excluded.nome, telefone = coalesce(excluded.telefone, public.usuarios.telefone),
    cargo = coalesce(excluded.cargo, public.usuarios.cargo), updated_at = now();
  v_razao_social := coalesce(nullif(v_sessao.consulta_cnpj_json ->> 'legal_name',''), nullif(v_sessao.empresa_informada_json ->> 'razao_social',''), 'Empresa em validação');
  v_nome_fantasia := coalesce(nullif(v_sessao.consulta_cnpj_json ->> 'trade_name',''), nullif(v_sessao.empresa_informada_json ->> 'nome_fantasia',''), v_razao_social);
  v_endereco := coalesce(v_sessao.consulta_cnpj_json -> 'official_address', '{}'::jsonb);
  insert into public.empresas(
    razao_social,nome_fantasia,cnpj,tipo_estabelecimento,segmento,endereco,numero,complemento,bairro,cidade,estado,cep,
    telefone,email_principal,responsavel_legal,plano_id,tipo_conta,status,status_cadastral,data_status_cadastral,porte_empresa,
    cnae_principal_codigo,cnae_principal_descricao,email_oficial,telefone_oficial,endereco_oficial_json,verification_status,
    access_status,verification_method,ultima_consulta_cnpj_at,provedor_consulta_cnpj
  ) values (
    v_razao_social,v_nome_fantasia,v_sessao.cnpj_normalizado,v_sessao.empresa_informada_json ->> 'tipo_estabelecimento',v_sessao.empresa_informada_json ->> 'segmento',
    v_endereco ->> 'street',v_endereco ->> 'number',v_endereco ->> 'complement',v_endereco ->> 'district',v_endereco ->> 'city',left(v_endereco ->> 'state',2),v_endereco ->> 'postal_code',
    coalesce(v_sessao.responsavel_json ->> 'telefone',v_sessao.consulta_cnpj_json ->> 'official_phone'),v_sessao.email_responsavel,v_sessao.responsavel_json ->> 'nome',v_sessao.plano_id,v_conta,
    'bloqueada',v_sessao.consulta_cnpj_json ->> 'registration_status',nullif(v_sessao.consulta_cnpj_json ->> 'registration_status_date','')::date,v_sessao.consulta_cnpj_json ->> 'company_size',
    v_sessao.consulta_cnpj_json #>> '{main_activity,code}',v_sessao.consulta_cnpj_json #>> '{main_activity,description}',v_sessao.consulta_cnpj_json ->> 'official_email',v_sessao.consulta_cnpj_json ->> 'official_phone',v_endereco,
    'email_confirmation_pending','blocked','stripe_checkout_cnpj_provider',now(),v_sessao.pre_analise_json ->> 'provider'
  ) returning id into v_empresa_id;
  insert into public.usuarios_empresas(usuario_id,empresa_id,perfil,ativo) values (p_auth_user_id,v_empresa_id,'administrador_provisorio',true);
  insert into public.assinaturas_empresas(
    empresa_id,plano_id,status,ciclo,valor_mensal_centavos,valor_anual_centavos,moeda,gateway,gateway_customer_id,gateway_subscription_id,
    clientes_incluidos,preco_cliente_extra_centavos,cobranca_consolidada
  ) values (
    v_empresa_id,v_sessao.plano_id,'ativa',case when v_fotografia.periodicidade = 'yearly' then 'anual' else 'mensal' end,
    case when v_fotografia.periodicidade = 'monthly' then v_fotografia.valor_centavos else 0 end,
    case when v_fotografia.periodicidade = 'yearly' then v_fotografia.valor_centavos else null end,v_fotografia.moeda,'stripe',p_stripe_customer_id,p_stripe_subscription_id,
    case when v_tipo_plano = 'parceiro' then (select limite_clientes from public.planos where id = v_sessao.plano_id) else 0 end,
    case when v_tipo_plano = 'parceiro' then (select preco_cliente_extra_centavos from public.planos where id = v_sessao.plano_id) else 0 end,
    v_tipo_plano = 'parceiro'
  ) returning id into v_assinatura_id;
  update public.sessoes_contratacao set status='email_pendente',auth_user_id=p_auth_user_id,empresa_id=v_empresa_id,assinatura_id=v_assinatura_id,
    stripe_customer_id=p_stripe_customer_id,stripe_subscription_id=p_stripe_subscription_id,pagamento_confirmado_at=coalesce(pagamento_confirmado_at,now()),updated_at=now()
    where id=v_sessao.id;
  insert into public.eventos_contratacao(sessao_contratacao_id,tipo,status_anterior,status_novo,origem,metadata_json)
    values(v_sessao.id,'pagamento_confirmado_e_ambiente_preparado',v_sessao.status,'email_pendente','stripe_webhook',jsonb_build_object('empresa_id',v_empresa_id,'assinatura_id',v_assinatura_id,'tipo_conta',v_conta));
  return jsonb_build_object('empresa_id',v_empresa_id,'assinatura_id',v_assinatura_id,'auth_user_id',p_auth_user_id,'status','email_pendente','idempotent',false);
end $$;

revoke all on function public.api_master_criar_parceiro(jsonb) from public, anon;
grant execute on function public.api_master_criar_parceiro(jsonb) to authenticated;
revoke all on function public.api_master_configurar_partner_gateway(uuid,text,text,text,text,text) from public, anon;
grant execute on function public.api_master_configurar_partner_gateway(uuid,text,text,text,text,text) to authenticated;
revoke all on function public.api_master_salvar_partner_plan(uuid,jsonb) from public, anon;
grant execute on function public.api_master_salvar_partner_plan(uuid,jsonb) to authenticated;
revoke all on function public.internal_provisionar_contratacao_paga(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.internal_provisionar_contratacao_paga(uuid,uuid,text,text) to service_role;

create or replace function public.sync_partner_client_counters()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_partner uuid; v_active integer; v_plan public.planos;
begin
  v_partner := coalesce(new.parceiro_empresa_id, old.parceiro_empresa_id);
  select count(*)::integer into v_active from public.relacionamentos_parceiro_clientes
    where parceiro_empresa_id = v_partner and status = 'ativo';
  select p.* into v_plan from public.empresas e join public.planos p on p.id = e.plano_id where e.id = v_partner;
  update public.assinaturas_empresas set clientes_incluidos = coalesce(v_plan.limite_clientes,0),
    clientes_ativos = v_active, clientes_extras = greatest(v_active - coalesce(v_plan.limite_clientes,0),0),
    preco_cliente_extra_centavos = coalesce(v_plan.preco_cliente_extra_centavos,0),
    cobranca_consolidada = true, updated_at = now()
    where empresa_id = v_partner and deleted_at is null;
  if tg_op = 'DELETE' then return old; end if; return new;
end $$;

drop trigger if exists trg_partner_client_counters on public.relacionamentos_parceiro_clientes;
create trigger trg_partner_client_counters after insert or update or delete
on public.relacionamentos_parceiro_clientes for each row execute function public.sync_partner_client_counters();

revoke all on function public.partner_relation_for_user(uuid) from public, anon;
revoke all on function public.api_partner_listar_planos() from public, anon;
revoke all on function public.api_public_catalogo_parceiros() from public;
revoke all on function public.api_partner_listar_clientes(uuid) from public, anon;
revoke all on function public.api_partner_resumo(uuid) from public, anon;
revoke all on function public.api_partner_vincular_cliente(jsonb) from public, anon;
grant execute on function public.partner_relation_for_user(uuid) to authenticated;
grant execute on function public.api_partner_listar_planos() to authenticated;
grant execute on function public.api_public_catalogo_parceiros() to anon, authenticated;
grant execute on function public.api_partner_listar_clientes(uuid) to authenticated;
grant execute on function public.api_partner_resumo(uuid) to authenticated;
grant execute on function public.api_partner_vincular_cliente(jsonb) to authenticated;