-- Conform Flow — cortesias de parceiros por cliente.
-- A cortesia é um benefício comercial do parceiro e nunca altera o tenant,
-- o CNPJ ou a assinatura de nenhuma outra empresa.

create table if not exists public.isencoes_parceiro (
  id uuid primary key default gen_random_uuid(),
  parceiro_empresa_id uuid not null references public.empresas(id),
  cliente_empresa_id uuid not null references public.empresas(id),
  inicio_em date not null default current_date,
  termina_em date not null,
  meses smallint not null check (meses between 1 and 12),
  status text not null default 'ativa' check (status in ('ativa', 'expirada', 'revogada')),
  motivo text not null default 'Presente do parceiro',
  observacoes text,
  created_by uuid references public.usuarios(id),
  revoked_by uuid references public.usuarios(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint isencao_parceiro_distinta check (parceiro_empresa_id <> cliente_empresa_id),
  constraint isencao_parceiro_periodo_valido check (termina_em >= inicio_em)
);

create index if not exists idx_isencoes_parceiro_cliente
  on public.isencoes_parceiro(parceiro_empresa_id, cliente_empresa_id, status);
create index if not exists idx_isencoes_parceiro_vigencia
  on public.isencoes_parceiro(status, inicio_em, termina_em);
create unique index if not exists uq_isencao_parceiro_cliente_ativa
  on public.isencoes_parceiro(parceiro_empresa_id, cliente_empresa_id)
  where status = 'ativa';

alter table public.isencoes_parceiro enable row level security;
revoke all on public.isencoes_parceiro from anon, authenticated;

create or replace function public.parceiro_isencao_ativa(p_cliente_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.isencoes_parceiro i
    join public.relacionamentos_parceiro_clientes rpc
      on rpc.parceiro_empresa_id = i.parceiro_empresa_id
     and rpc.cliente_empresa_id = i.cliente_empresa_id
     and rpc.status = 'ativo'
    where i.cliente_empresa_id = p_cliente_empresa_id
      and i.status = 'ativa'
      and current_date between i.inicio_em and i.termina_em
  )
$$;

-- Mantém os contadores do parceiro corretos: clientes isentos continuam na
-- carteira, mas não geram quantidade de cliente extra no Stripe.
create or replace function public.refresh_partner_client_counters(p_parceiro_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_active integer;
  v_billable integer;
  v_included integer;
  v_extra integer;
  v_price integer;
begin
  if p_parceiro_empresa_id is null then return; end if;
  select count(*)::integer into v_active
  from public.relacionamentos_parceiro_clientes rpc
  where rpc.parceiro_empresa_id = p_parceiro_empresa_id and rpc.status = 'ativo';

  select count(*)::integer into v_billable
  from public.relacionamentos_parceiro_clientes rpc
  where rpc.parceiro_empresa_id = p_parceiro_empresa_id
    and rpc.status = 'ativo'
    and not public.parceiro_isencao_ativa(rpc.cliente_empresa_id);

  select coalesce(p.limite_clientes, 0), coalesce(p.preco_cliente_extra_centavos, 0)
    into v_included, v_price
  from public.empresas e
  join public.planos p on p.id = e.plano_id
  where e.id = p_parceiro_empresa_id;

  v_extra := greatest(v_billable - coalesce(v_included, 0), 0);

  update public.assinaturas_empresas
  set clientes_incluidos = coalesce(v_included, 0),
      clientes_ativos = coalesce(v_active, 0),
      clientes_extras = v_extra,
      preco_cliente_extra_centavos = coalesce(v_price, 0),
      cobranca_consolidada = true,
      updated_at = now()
  where empresa_id = p_parceiro_empresa_id and deleted_at is null;
end
$$;

create or replace function public.sync_partner_client_counters()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_partner_client_counters(
    case when tg_op = 'delete' then old.parceiro_empresa_id else new.parceiro_empresa_id end
  );
  if tg_op = 'delete' then return old; end if;
  return new;
end
$$;

drop trigger if exists trg_partner_client_counters on public.relacionamentos_parceiro_clientes;
create trigger trg_partner_client_counters
after insert or update or delete on public.relacionamentos_parceiro_clientes
for each row execute function public.sync_partner_client_counters();

drop trigger if exists trg_partner_gift_counters on public.isencoes_parceiro;
create trigger trg_partner_gift_counters
after insert or update or delete on public.isencoes_parceiro
for each row execute function public.sync_partner_client_counters();

create or replace function public.api_partner_listar_clientes(p_parceiro_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
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
      'inicio_em', rpc.inicio_em, 'encerrado_em', rpc.encerrado_em),
    'isencao', case when i.id is null then null else jsonb_build_object(
      'id', i.id, 'inicio_em', i.inicio_em, 'termina_em', i.termina_em,
      'meses', i.meses, 'status', i.status, 'motivo', i.motivo
    ) end
  ) order by c.nome_fantasia), '[]'::jsonb)
  into v_result
  from public.relacionamentos_parceiro_clientes rpc
  join public.empresas c on c.id = rpc.cliente_empresa_id and c.deleted_at is null
  join public.planos p on p.id = rpc.plano_servico_id
  left join lateral (
    select i.* from public.isencoes_parceiro i
    where i.parceiro_empresa_id = rpc.parceiro_empresa_id
      and i.cliente_empresa_id = rpc.cliente_empresa_id
      and i.status = 'ativa'
      and current_date between i.inicio_em and i.termina_em
    order by i.created_at desc limit 1
  ) i on true
  where rpc.parceiro_empresa_id = p_parceiro_empresa_id and rpc.status <> 'encerrado';
  return v_result;
end
$$;

create or replace function public.api_partner_resumo(p_parceiro_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.planos;
  v_subscription public.assinaturas_empresas;
  v_clients integer;
  v_billable integer;
  v_gifts integer;
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
  select count(*)::integer into v_gifts from public.relacionamentos_parceiro_clientes rpc
    where rpc.parceiro_empresa_id = p_parceiro_empresa_id and rpc.status = 'ativo'
      and public.parceiro_isencao_ativa(rpc.cliente_empresa_id);
  v_billable := greatest(coalesce(v_clients, 0) - coalesce(v_gifts, 0), 0);
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
    'clientes_ativos', coalesce(v_clients, 0),
    'clientes_faturaveis', coalesce(v_billable, 0),
    'clientes_isentos', coalesce(v_gifts, 0),
    'clientes_incluidos', coalesce(v_subscription.clientes_incluidos, v_plan.limite_clientes, 0),
    'clientes_extras', greatest(coalesce(v_billable, 0) - coalesce(v_plan.limite_clientes, 0), 0));
end
$$;

create or replace function public.api_partner_conceder_isencao(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid := nullif(p_payload->>'parceiro_empresa_id', '')::uuid;
  v_client_id uuid := nullif(p_payload->>'cliente_empresa_id', '')::uuid;
  v_months integer := coalesce(nullif(p_payload->>'meses', '')::integer, 1);
  v_start date := coalesce(nullif(p_payload->>'inicio_em', '')::date, current_date);
  v_end date;
  v_gift public.isencoes_parceiro;
begin
  if not public.is_master() and not exists (
    select 1 from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid() and ue.empresa_id = v_partner_id
      and ue.ativo and ue.deleted_at is null and ue.perfil = 'administrador'
  ) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  if v_months not between 1 and 12 then raise exception 'ISENCAO_DURACAO_INVALIDA'; end if;
  if v_start < current_date then raise exception 'ISENCAO_INICIO_INVALIDO'; end if;
  if not exists (
    select 1 from public.empresas e
    join public.relacionamentos_parceiro_clientes rpc on rpc.cliente_empresa_id = e.id
    where rpc.parceiro_empresa_id = v_partner_id and rpc.cliente_empresa_id = v_client_id
      and rpc.status = 'ativo' and e.tipo_conta = 'cliente' and e.deleted_at is null
  ) then raise exception 'CLIENTE_NAO_VINCULADO_AO_PARCEIRO'; end if;

  v_end := (v_start + make_interval(months => v_months) - interval '1 day')::date;
  update public.isencoes_parceiro
  set status = 'revogada', revoked_by = auth.uid(), revoked_at = now(), updated_at = now()
  where parceiro_empresa_id = v_partner_id and cliente_empresa_id = v_client_id and status = 'ativa';

  insert into public.isencoes_parceiro(
    parceiro_empresa_id, cliente_empresa_id, inicio_em, termina_em, meses,
    motivo, observacoes, created_by
  ) values (
    v_partner_id, v_client_id, v_start, v_end, v_months,
    coalesce(nullif(trim(p_payload->>'motivo'), ''), 'Presente do parceiro'),
    nullif(trim(p_payload->>'observacoes'), ''), auth.uid()
  ) returning * into v_gift;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, novo_valor)
  values (v_partner_id, auth.uid(), 'parceiros', 'isencao_concedida', v_gift.id,
    jsonb_build_object('cliente_empresa_id', v_client_id, 'meses', v_months,
      'inicio_em', v_start, 'termina_em', v_end, 'motivo', v_gift.motivo));
  return jsonb_build_object(
    'id', v_gift.id, 'parceiro_empresa_id', v_partner_id,
    'cliente_empresa_id', v_client_id, 'inicio_em', v_start,
    'termina_em', v_end, 'meses', v_months, 'status', 'ativa',
    'motivo', v_gift.motivo
  );
end
$$;

create or replace function public.api_partner_revogar_isencao(p_isencao_id uuid, p_motivo text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gift public.isencoes_parceiro;
begin
  select i.* into v_gift from public.isencoes_parceiro i where i.id = p_isencao_id and i.status = 'ativa';
  if not found then raise exception 'ISENCAO_NAO_ENCONTRADA'; end if;
  if not public.is_master() and not exists (
    select 1 from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid() and ue.empresa_id = v_gift.parceiro_empresa_id
      and ue.ativo and ue.deleted_at is null and ue.perfil = 'administrador'
  ) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  update public.isencoes_parceiro
  set status = 'revogada', revoked_by = auth.uid(), revoked_at = now(),
      observacoes = coalesce(nullif(trim(p_motivo), ''), observacoes), updated_at = now()
  where id = v_gift.id returning * into v_gift;
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, novo_valor)
  values (v_gift.parceiro_empresa_id, auth.uid(), 'parceiros', 'isencao_revogada', v_gift.id,
    jsonb_build_object('cliente_empresa_id', v_gift.cliente_empresa_id, 'motivo', p_motivo));
  return jsonb_build_object('id', v_gift.id, 'status', v_gift.status);
end
$$;

revoke all on function public.parceiro_isencao_ativa(uuid) from public, anon;
revoke all on function public.refresh_partner_client_counters(uuid) from public, anon, authenticated;
revoke all on function public.api_partner_conceder_isencao(jsonb) from public, anon;
revoke all on function public.api_partner_revogar_isencao(uuid, text) from public, anon;
grant execute on function public.parceiro_isencao_ativa(uuid) to authenticated;
grant execute on function public.api_partner_conceder_isencao(jsonb) to authenticated;
grant execute on function public.api_partner_revogar_isencao(uuid, text) to authenticated;
