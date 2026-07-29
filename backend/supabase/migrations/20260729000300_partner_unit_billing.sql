-- Conform Flow - planos opcionais e cobranca por CNPJ para parceiros.
-- A empresa parceira pode ser criada sem plano e escolher depois entre uma
-- carteira fixa ou cobranca unitária por cliente. O cliente continua sendo um
-- tenant isolado; apenas o parceiro e o titular financeiro.

alter table public.empresas
  alter column plano_id drop not null;

alter table public.empresas
  add column if not exists parceiro_cobranca_modo text not null default 'plano_carteira';

alter table public.empresas
  drop constraint if exists empresas_parceiro_cobranca_modo_check;
alter table public.empresas
  add constraint empresas_parceiro_cobranca_modo_check
  check (parceiro_cobranca_modo in ('plano_carteira', 'unitario'));

alter table public.assinaturas_empresas
  alter column plano_id drop not null;

alter table public.relacionamentos_parceiro_clientes
  add column if not exists cobranca_inicio_em timestamptz not null default now(),
  add column if not exists preco_unitario_centavos integer not null default 0;

alter table public.relacionamentos_parceiro_clientes
  drop constraint if exists relacionamento_preco_unitario_valido;
alter table public.relacionamentos_parceiro_clientes
  add constraint relacionamento_preco_unitario_valido
  check (preco_unitario_centavos >= 0);

create index if not exists idx_relacionamentos_parceiro_cobranca
  on public.relacionamentos_parceiro_clientes(parceiro_empresa_id, cobranca_inicio_em)
  where status = 'ativo';

-- Catalogo operacional usado quando o parceiro escolhe cobranca por CNPJ.
create or replace function public.api_partner_listar_planos_unitarios()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'codigo', p.codigo,
    'nome', p.nome,
    'descricao', p.descricao,
    'valor_mensal_centavos', p.valor_mensal_centavos,
    'valor_anual_centavos', p.valor_anual_centavos,
    'moeda', p.moeda,
    'stripe_monthly_price_id', p.stripe_monthly_price_id,
    'stripe_yearly_price_id', p.stripe_yearly_price_id,
    'recursos', p.recursos
  ) order by p.ordem), '[]'::jsonb)
  from public.planos p
  where p.tipo_plano = 'direto'
    and p.ativo
    and p.disponivel_venda
    and (public.is_master() or exists (
      select 1
      from public.usuarios_empresas ue
      join public.empresas e on e.id = ue.empresa_id and e.tipo_conta = 'parceira'
      where ue.usuario_id = auth.uid() and ue.ativo and ue.deleted_at is null
    ));
$$;

-- Escolha de modelo de cobranca feita pelo administrador do parceiro.
create or replace function public.api_partner_configurar_cobranca(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid := nullif(p_payload->>'parceiro_empresa_id', '')::uuid;
  v_mode text := coalesce(nullif(lower(trim(p_payload->>'modo_cobranca')), ''), 'plano_carteira');
  v_plan public.planos;
  v_empresa public.empresas;
  v_subscription public.assinaturas_empresas;
begin
  if not public.is_master() and not exists (
    select 1 from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid()
      and ue.empresa_id = v_partner_id
      and ue.perfil in ('administrador', 'parceiro_administrador')
      and ue.ativo and ue.deleted_at is null
  ) then raise exception 'Acesso negado' using errcode = '42501'; end if;

  if v_mode not in ('plano_carteira', 'unitario') then
    raise exception 'MODO_COBRANCA_INVALIDO' using errcode = 'P0001';
  end if;

  select * into v_empresa
  from public.empresas
  where id = v_partner_id and tipo_conta = 'parceira' and deleted_at is null
  for update;
  if not found then raise exception 'PARCEIRO_NAO_ENCONTRADO' using errcode = 'P0001'; end if;

  select * into v_subscription
  from public.assinaturas_empresas
  where empresa_id = v_partner_id and deleted_at is null;

  if v_subscription.gateway_subscription_id is not null
    and v_subscription.status in ('trial', 'ativa', 'pagamento_pendente')
    and coalesce(v_empresa.parceiro_cobranca_modo, 'plano_carteira') <> v_mode
  then
    raise exception 'PARTNER_BILLING_MODE_REQUIRES_NEW_CHECKOUT' using errcode = 'P0001';
  end if;

  if v_mode = 'plano_carteira' then
    select * into v_plan
    from public.planos
    where codigo = lower(trim(p_payload->>'plano_codigo'))
      and tipo_plano = 'parceiro' and ativo and disponivel_venda;
    if not found then raise exception 'PLANO_PARCEIRO_INVALIDO' using errcode = 'P0001'; end if;

    update public.empresas
    set plano_id = v_plan.id, parceiro_cobranca_modo = v_mode, updated_at = now()
    where id = v_partner_id;

    if v_subscription.id is null then
      insert into public.assinaturas_empresas(
        empresa_id, plano_id, status, ciclo, valor_mensal_centavos,
        valor_anual_centavos, moeda, clientes_incluidos,
        preco_cliente_extra_centavos, cobranca_consolidada, trial_termina_em,
        proximo_vencimento, created_by
      ) values (
        v_partner_id, v_plan.id, 'trial', 'mensal', v_plan.valor_mensal_centavos,
        v_plan.valor_anual_centavos, v_plan.moeda, v_plan.limite_clientes,
        v_plan.preco_cliente_extra_centavos, true,
        current_date + coalesce(v_plan.trial_dias, 14),
        current_date + coalesce(v_plan.trial_dias, 14), auth.uid()
      );
    else
      update public.assinaturas_empresas
      set plano_id = v_plan.id,
          clientes_incluidos = v_plan.limite_clientes,
          preco_cliente_extra_centavos = v_plan.preco_cliente_extra_centavos,
          cobranca_consolidada = true,
          updated_at = now()
      where id = v_subscription.id;
    end if;
  else
    update public.empresas
    set plano_id = null, parceiro_cobranca_modo = v_mode, updated_at = now()
    where id = v_partner_id;
    if v_subscription.id is not null and v_subscription.gateway_subscription_id is null then
      update public.assinaturas_empresas
      set plano_id = null, clientes_incluidos = 0, clientes_extras = 0,
          preco_cliente_extra_centavos = 0, cobranca_consolidada = true,
          updated_at = now()
      where id = v_subscription.id;
    end if;
  end if;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, novo_valor)
  values (v_partner_id, auth.uid(), 'parceiros', 'modelo_cobranca_atualizado',
    jsonb_build_object('modo_cobranca', v_mode,
      'plano_codigo', case when v_plan.id is null then null else v_plan.codigo end));

  return jsonb_build_object(
    'parceiro_empresa_id', v_partner_id,
    'modo_cobranca', v_mode,
    'plano', case when v_plan.id is null then null else to_jsonb(v_plan) end
  );
end;
$$;

-- Recria o cadastro Master permitindo deixar o plano em branco.
create or replace function public.api_master_criar_parceiro(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa public.empresas;
  v_plan public.planos;
  v_user uuid := auth.uid();
  v_plan_codigo text := nullif(lower(trim(p_payload->>'plano_codigo')), '');
  v_mode text := coalesce(nullif(lower(trim(p_payload->>'modo_cobranca')), ''), 'plano_carteira');
begin
  if not public.is_master() then raise exception 'Acesso negado' using errcode = '42501'; end if;
  if v_mode not in ('plano_carteira', 'unitario') then
    raise exception 'MODO_COBRANCA_INVALIDO' using errcode = 'P0001';
  end if;

  if v_plan_codigo is not null then
    select * into v_plan from public.planos
    where codigo = v_plan_codigo and tipo_plano = 'parceiro' and ativo;
    if not found then raise exception 'PLANO_PARCEIRO_INVALIDO' using errcode = 'P0001'; end if;
  end if;

  insert into public.empresas(
    razao_social, nome_fantasia, cnpj, tipo_estabelecimento, segmento,
    email_principal, plano_id, tipo_conta, parceiro_cobranca_modo,
    status, verification_status, access_status, observacoes
  ) values (
    trim(p_payload->>'razao_social'),
    coalesce(nullif(trim(p_payload->>'nome_fantasia'), ''), trim(p_payload->>'razao_social')),
    trim(p_payload->>'cnpj'), nullif(trim(p_payload->>'tipo_estabelecimento'), ''),
    nullif(trim(p_payload->>'segmento'), ''), nullif(trim(p_payload->>'email_principal'), ''),
    case when v_mode = 'unitario' then null else v_plan.id end, 'parceira', v_mode,
    'ativa', 'verified', 'active',
    'Conta parceira: titular da cobranca consolidada dos clientes vinculados.'
  ) returning * into v_empresa;

  insert into public.usuarios_empresas(usuario_id, empresa_id, perfil, ativo)
  values (v_user, v_empresa.id, 'administrador', true)
  on conflict (usuario_id, empresa_id) do update
  set ativo = true, deleted_at = null, updated_at = now();

  if v_plan.id is not null then
    insert into public.assinaturas_empresas(
      empresa_id, plano_id, status, ciclo, valor_mensal_centavos,
      valor_anual_centavos, moeda, clientes_incluidos,
      preco_cliente_extra_centavos, cobranca_consolidada,
      trial_termina_em, proximo_vencimento, observacoes_internas, created_by
    ) values (
      v_empresa.id, v_plan.id, 'trial', 'mensal', v_plan.valor_mensal_centavos,
      v_plan.valor_anual_centavos, v_plan.moeda, v_plan.limite_clientes,
      v_plan.preco_cliente_extra_centavos, true,
      current_date + coalesce(v_plan.trial_dias, 14),
      current_date + coalesce(v_plan.trial_dias, 14),
      'Criada pelo Admin Master.', v_user
    );
  end if;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, novo_valor)
  values (v_empresa.id, v_user, 'parceiros', 'parceiro_criado',
    jsonb_build_object('plano_codigo', case when v_plan.id is null then null else v_plan.codigo end,
      'modo_cobranca', v_mode));
  return jsonb_build_object(
    'empresa', to_jsonb(v_empresa),
    'plano', case when v_plan.id is null then null else to_jsonb(v_plan) end,
    'modo_cobranca', v_mode
  );
exception when unique_violation then
  raise exception 'PARCEIRO_CNPJ_JA_CADASTRADO' using errcode = '23505';
end;
$$;

-- Resumo inclui o modo de cobranca para o frontend e para as Edge Functions.
create or replace function public.api_partner_resumo(p_parceiro_empresa_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_plan public.planos;
  v_subscription public.assinaturas_empresas;
  v_mode text;
  v_clients integer;
  v_billable integer;
  v_exempt integer;
begin
  if not public.is_master() and not exists (
    select 1 from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid() and ue.empresa_id = p_parceiro_empresa_id
      and ue.perfil in ('administrador', 'parceiro_administrador')
      and ue.ativo and ue.deleted_at is null
  ) then raise exception 'Acesso negado' using errcode = '42501'; end if;

  select e.parceiro_cobranca_modo into v_mode
  from public.empresas e
  where e.id = p_parceiro_empresa_id and e.tipo_conta = 'parceira';
  select p.* into v_plan
  from public.empresas e
  join public.planos p on p.id = e.plano_id
  where e.id = p_parceiro_empresa_id and e.tipo_conta = 'parceira';
  select * into v_subscription from public.assinaturas_empresas
    where empresa_id = p_parceiro_empresa_id and deleted_at is null;
  select count(*)::integer into v_clients from public.relacionamentos_parceiro_clientes
    where parceiro_empresa_id = p_parceiro_empresa_id and status = 'ativo';
  select count(*)::integer into v_exempt
  from public.relacionamentos_parceiro_clientes rpc
  where rpc.parceiro_empresa_id = p_parceiro_empresa_id and rpc.status = 'ativo'
    and public.parceiro_isencao_ativa(rpc.cliente_empresa_id);
  v_billable := greatest(coalesce(v_clients, 0) - coalesce(v_exempt, 0), 0);
  return jsonb_build_object(
    'parceiro_empresa_id', p_parceiro_empresa_id,
    'modo_cobranca', coalesce(v_mode, 'plano_carteira'),
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
    'clientes_faturaveis', v_billable,
    'clientes_isentos', coalesce(v_exempt, 0),
    'clientes_incluidos', case when v_mode = 'unitario' then 0 else coalesce(v_subscription.clientes_incluidos, v_plan.limite_clientes, 0) end,
    'clientes_extras', case when v_mode = 'unitario' then v_billable else greatest(coalesce(v_clients, 0) - coalesce(v_plan.limite_clientes, 0), 0) end
  );
end;
$$;

-- Cadastro de cliente aceita parceiros sem plano e grava a data de inicio da
-- cobranca para que o Stripe gere a prorata no primeiro ciclo.
create or replace function public.api_partner_vincular_cliente(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid := nullif(p_payload->>'parceiro_empresa_id', '')::uuid;
  v_client public.empresas;
  v_plan public.planos;
  v_partner_plan public.planos;
  v_mode text;
  v_partner_status text;
  v_billing_status text;
  v_active_clients integer;
  v_included integer;
  v_extra integer;
  v_use_bonus boolean := coalesce((p_payload->>'usar_bonus_isencao')::boolean, false);
  v_bonus public.bonus_isencao_parceiros;
  v_gift public.isencoes_parceiro;
begin
  if not public.is_master() and not exists (
    select 1 from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid() and ue.empresa_id = v_partner_id
      and ue.perfil in ('administrador', 'parceiro_administrador')
      and ue.ativo and ue.deleted_at is null
  ) then raise exception 'Acesso negado' using errcode = '42501'; end if;

  select e.parceiro_cobranca_modo, e.access_status
  into v_mode, v_partner_status
  from public.empresas e
  where e.id = v_partner_id and e.tipo_conta = 'parceira' and e.deleted_at is null;
  if not found then raise exception 'PARCEIRO_NAO_ENCONTRADO' using errcode = 'P0001'; end if;
  select p.* into v_partner_plan
  from public.empresas e
  join public.planos p on p.id = e.plano_id
  where e.id = v_partner_id and e.tipo_conta = 'parceira'
    and p.tipo_plano = 'parceiro' and p.ativo;
  if v_partner_status not in ('active', 'provisional') then
    raise exception 'PARTNER_ACCESS_BLOCKED' using errcode = '42501';
  end if;

  select a.status into v_billing_status from public.assinaturas_empresas a
  where a.empresa_id = v_partner_id and a.deleted_at is null;
  if v_mode = 'unitario' then
    if v_billing_status is not null and v_billing_status not in ('trial', 'ativa', 'pagamento_pendente') then
      raise exception 'PARTNER_BILLING_NOT_ACTIVE' using errcode = '42501';
    end if;
  else
    if v_partner_plan.id is null then raise exception 'PLANO_PARCEIRO_NAO_CONFIGURADO' using errcode = 'P0001'; end if;
    if v_billing_status is null or v_billing_status not in ('trial', 'ativa', 'pagamento_pendente') then
      raise exception 'PARTNER_BILLING_NOT_ACTIVE' using errcode = '42501';
    end if;
    select count(*)::integer into v_active_clients from public.relacionamentos_parceiro_clientes
      where parceiro_empresa_id = v_partner_id and status = 'ativo';
    select coalesce(a.clientes_extras, 0), coalesce(a.clientes_incluidos, v_partner_plan.limite_clientes, 0)
    into v_extra, v_included from public.assinaturas_empresas a
    where a.empresa_id = v_partner_id and a.deleted_at is null;
    if v_active_clients >= v_included + v_extra then
      raise exception 'LIMITE_CLIENTES_PARCEIRO_ATINGIDO' using errcode = 'P0001';
    end if;
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

  select p.* into v_plan from public.planos p
  where p.codigo = lower(trim(p_payload->>'plano_servico_codigo'))
    and p.tipo_plano = 'direto' and p.ativo and p.disponivel_venda;
  if not found then raise exception 'PLANO_SERVICO_INVALIDO' using errcode = 'P0001'; end if;

  insert into public.empresas(
    razao_social, nome_fantasia, cnpj, tipo_estabelecimento, segmento,
    email_principal, plano_id, tipo_conta, parceiro_origem_id,
    status, verification_status, access_status, observacoes
  ) values (
    trim(p_payload->>'razao_social'),
    coalesce(nullif(trim(p_payload->>'nome_fantasia'), ''), trim(p_payload->>'razao_social')),
    trim(p_payload->>'cnpj'), nullif(trim(p_payload->>'tipo_estabelecimento'), ''),
    nullif(trim(p_payload->>'segmento'), ''), nullif(trim(p_payload->>'email_principal'), ''),
    v_plan.id, 'cliente', v_partner_id, 'ativa', 'verified', 'active',
    case when v_use_bonus then 'Cliente cadastrado por parceiro com bonus de isencao.'
      else 'Cliente cadastrado por parceiro; cobranca consolidada no parceiro.' end
  ) returning * into v_client;
  insert into public.relacionamentos_parceiro_clientes(
    parceiro_empresa_id, cliente_empresa_id, plano_servico_id, created_by,
    cobranca_inicio_em, preco_unitario_centavos
  ) values (v_partner_id, v_client.id, v_plan.id, auth.uid(), now(), v_plan.valor_mensal_centavos);

  if v_use_bonus then
    insert into public.isencoes_parceiro(
      parceiro_empresa_id, cliente_empresa_id, inicio_em, termina_em, meses,
      motivo, beneficio_id, created_by
    ) values (
      v_partner_id, v_client.id, current_date,
      (current_date + make_interval(months => v_bonus.meses_por_bonus) - interval '1 day')::date,
      v_bonus.meses_por_bonus, 'Bonus de isencao do parceiro', v_bonus.id, auth.uid()
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
      'modo_cobranca', v_mode, 'cobranca_inicio_em', now(),
      'bonus_isencao', v_use_bonus,
      'beneficio_id', case when v_use_bonus then v_bonus.id else null end));
  return jsonb_build_object(
    'cliente', to_jsonb(v_client), 'plano_servico', to_jsonb(v_plan),
    'bonus_consumido', v_use_bonus,
    'cobranca', jsonb_build_object('modo', v_mode, 'preco_mensal_centavos', v_plan.valor_mensal_centavos,
      'primeiro_mes_prorata', v_mode = 'unitario'),
    'isencao', case when v_gift.id is null then null else jsonb_build_object(
      'id', v_gift.id, 'inicio_em', v_gift.inicio_em, 'termina_em', v_gift.termina_em,
      'meses', v_gift.meses, 'status', v_gift.status
    ) end
  );
exception when unique_violation then
  raise exception 'CLIENTE_CNPJ_JA_CADASTRADO' using errcode = '23505';
end;
$$;

revoke all on function public.api_partner_listar_planos_unitarios() from public, anon;
grant execute on function public.api_partner_listar_planos_unitarios() to authenticated;
revoke all on function public.api_partner_configurar_cobranca(jsonb) from public, anon;
grant execute on function public.api_partner_configurar_cobranca(jsonb) to authenticated;
grant execute on function public.api_master_criar_parceiro(jsonb) to authenticated;
grant execute on function public.api_partner_resumo(uuid) to authenticated;
grant execute on function public.api_partner_vincular_cliente(jsonb) to authenticated;
