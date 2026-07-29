-- Conform Flow — bônus de cortesia controlados pelo Admin Master.
-- Um bônus é consumido somente quando o parceiro cadastra um cliente e marca
-- que deseja usar a isenção. O bônus nunca atravessa a carteira do parceiro.

create table if not exists public.bonus_isencao_parceiros (
  id uuid primary key default gen_random_uuid(),
  parceiro_empresa_id uuid not null references public.empresas(id),
  quantidade_total integer not null check (quantidade_total between 1 and 1000),
  quantidade_utilizada integer not null default 0 check (quantidade_utilizada >= 0),
  meses_por_bonus smallint not null default 1 check (meses_por_bonus between 1 and 12),
  validade_ate date,
  status text not null default 'ativo' check (status in ('ativo', 'encerrado', 'revogado')),
  motivo text not null default 'Bônus comercial',
  observacoes text,
  created_by uuid references public.usuarios(id),
  revoked_by uuid references public.usuarios(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bonus_isencao_quantidade_valida check (quantidade_utilizada <= quantidade_total)
);

create index if not exists idx_bonus_isencao_parceiro_status
  on public.bonus_isencao_parceiros(parceiro_empresa_id, status, validade_ate);

alter table public.bonus_isencao_parceiros enable row level security;
revoke all on public.bonus_isencao_parceiros from anon, authenticated;

alter table public.isencoes_parceiro
  add column if not exists beneficio_id uuid references public.bonus_isencao_parceiros(id);

create or replace function public.api_partner_listar_beneficios(p_parceiro_empresa_id uuid)
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
      and ue.ativo and ue.deleted_at is null
      and ue.perfil in ('administrador', 'parceiro_administrador')
  ) then raise exception 'Acesso negado' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'quantidade_total', b.quantidade_total,
    'quantidade_utilizada', b.quantidade_utilizada,
    'quantidade_disponivel', case when b.status = 'ativo'
      and (b.validade_ate is null or b.validade_ate >= current_date)
      then greatest(b.quantidade_total - b.quantidade_utilizada, 0) else 0 end,
    'meses_por_bonus', b.meses_por_bonus,
    'validade_ate', b.validade_ate,
    'status', case when b.status = 'ativo' and (b.validade_ate is null or b.validade_ate >= current_date)
      and b.quantidade_utilizada < b.quantidade_total then 'ativo'
      when b.status = 'ativo' then 'encerrado' else b.status end,
    'motivo', b.motivo,
    'observacoes', b.observacoes,
    'created_at', b.created_at
  ) order by b.created_at desc), '[]'::jsonb)
  into v_result
  from public.bonus_isencao_parceiros b
  where b.parceiro_empresa_id = p_parceiro_empresa_id;
  return v_result;
end
$$;

create or replace function public.api_master_conceder_bonus_isencao(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid := nullif(p_payload->>'parceiro_empresa_id', '')::uuid;
  v_quantity integer := coalesce(nullif(p_payload->>'quantidade', '')::integer, 1);
  v_months integer := coalesce(nullif(p_payload->>'meses_por_bonus', '')::integer, 1);
  v_expiry date := nullif(p_payload->>'validade_ate', '')::date;
  v_bonus public.bonus_isencao_parceiros;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  if not exists (select 1 from public.empresas where id = v_partner_id and tipo_conta = 'parceira' and deleted_at is null) then
    raise exception 'PARTNER_NOT_FOUND';
  end if;
  if v_quantity not between 1 and 1000 then raise exception 'BONUS_QUANTIDADE_INVALIDA'; end if;
  if v_months not between 1 and 12 then raise exception 'BONUS_DURACAO_INVALIDA'; end if;
  if v_expiry is not null and v_expiry < current_date then raise exception 'BONUS_VALIDADE_INVALIDA'; end if;

  insert into public.bonus_isencao_parceiros(
    parceiro_empresa_id, quantidade_total, meses_por_bonus, validade_ate,
    motivo, observacoes, created_by
  ) values (
    v_partner_id, v_quantity, v_months, v_expiry,
    coalesce(nullif(trim(p_payload->>'motivo'), ''), 'Bônus comercial'),
    nullif(trim(p_payload->>'observacoes'), ''), auth.uid()
  ) returning * into v_bonus;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, novo_valor)
  values (v_partner_id, auth.uid(), 'parceiros', 'bonus_isencao_concedido', v_bonus.id,
    jsonb_build_object('quantidade', v_quantity, 'meses_por_bonus', v_months,
      'validade_ate', v_expiry, 'motivo', v_bonus.motivo));
  return jsonb_build_object(
    'id', v_bonus.id, 'parceiro_empresa_id', v_partner_id,
    'quantidade_total', v_bonus.quantidade_total,
    'quantidade_utilizada', v_bonus.quantidade_utilizada,
    'quantidade_disponivel', v_bonus.quantidade_total,
    'meses_por_bonus', v_bonus.meses_por_bonus,
    'validade_ate', v_bonus.validade_ate, 'status', v_bonus.status,
    'motivo', v_bonus.motivo
  );
end
$$;

-- Recria o cadastro de cliente com consumo atômico do bônus de isenção.
create or replace function public.api_partner_vincular_cliente(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid := nullif(p_payload->>'parceiro_empresa_id','')::uuid;
  v_client public.empresas;
  v_plan public.planos;
  v_partner_plan public.planos;
  v_active_clients integer;
  v_included integer;
  v_extra integer;
  v_billing_status text;
  v_use_bonus boolean := coalesce((p_payload->>'usar_bonus_isencao')::boolean, false);
  v_bonus public.bonus_isencao_parceiros;
  v_gift public.isencoes_parceiro;
begin
  if not public.is_master() and not exists (
    select 1 from public.usuarios_empresas ue where ue.usuario_id = auth.uid()
      and ue.empresa_id = v_partner_id
      and ue.perfil in ('administrador', 'parceiro_administrador')
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

  if v_use_bonus then
    select b.* into v_bonus
    from public.bonus_isencao_parceiros b
    where b.parceiro_empresa_id = v_partner_id and b.status = 'ativo'
      and b.quantidade_utilizada < b.quantidade_total
      and (b.validade_ate is null or b.validade_ate >= current_date)
    order by b.validade_ate nulls last, b.created_at
    limit 1 for update;
    if not found then raise exception 'BONUS_ISENCAO_INDISPONIVEL' using errcode = 'P0001'; end if;
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
    case when v_use_bonus then 'Cliente cadastrado por parceiro com bônus de isenção.'
      else 'Cliente cadastrado por parceiro; cobrança consolidada no parceiro.' end
  ) returning * into v_client;
  insert into public.relacionamentos_parceiro_clientes (
    parceiro_empresa_id, cliente_empresa_id, plano_servico_id, created_by
  ) values (v_partner_id, v_client.id, v_plan.id, auth.uid());

  if v_use_bonus then
    insert into public.isencoes_parceiro(
      parceiro_empresa_id, cliente_empresa_id, inicio_em, termina_em, meses,
      motivo, beneficio_id, created_by
    ) values (
      v_partner_id, v_client.id, current_date,
      (current_date + make_interval(months => v_bonus.meses_por_bonus) - interval '1 day')::date,
      v_bonus.meses_por_bonus, 'Bônus de isenção do parceiro', v_bonus.id, auth.uid()
    ) returning * into v_gift;
    update public.bonus_isencao_parceiros
    set quantidade_utilizada = quantidade_utilizada + 1,
        status = case when quantidade_utilizada + 1 >= quantidade_total then 'encerrado' else status end,
        updated_at = now()
    where id = v_bonus.id;
  end if;

  perform public.api_provisionar_documentos_empresa(v_client.id, false);
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, novo_valor)
  values (v_partner_id, auth.uid(), 'parceiros', 'cliente_vinculado', v_client.id,
    jsonb_build_object('cliente_empresa_id', v_client.id, 'plano_servico', v_plan.codigo,
      'bonus_isencao', v_use_bonus, 'beneficio_id', case when v_use_bonus then v_bonus.id else null end));
  return jsonb_build_object(
    'cliente', to_jsonb(v_client), 'plano_servico', to_jsonb(v_plan),
    'bonus_consumido', v_use_bonus,
    'isencao', case when v_gift.id is null then null else jsonb_build_object(
      'id', v_gift.id, 'inicio_em', v_gift.inicio_em, 'termina_em', v_gift.termina_em,
      'meses', v_gift.meses, 'status', v_gift.status
    ) end
  );
exception when unique_violation then
  raise exception 'CLIENTE_CNPJ_JA_CADASTRADO' using errcode = '23505';
end
$$;

revoke all on function public.api_partner_listar_beneficios(uuid) from public, anon;
revoke all on function public.api_master_conceder_bonus_isencao(jsonb) from public, anon;
grant execute on function public.api_partner_listar_beneficios(uuid) to authenticated;
grant execute on function public.api_master_conceder_bonus_isencao(jsonb) to authenticated;
