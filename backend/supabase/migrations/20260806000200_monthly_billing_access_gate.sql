-- A inadimplencia mensal bloqueia dados imediatamente. A reativacao e exclusiva
-- do backend apos evento de pagamento confirmado pelo gateway.

alter table public.empresas
  add column if not exists billing_access_locked_at timestamptz;

comment on column public.empresas.billing_access_locked_at is
  'Marca bloqueio/restricao causado por cobranca. Evita que pagamento reative bloqueio manual ou de seguranca.';

-- Registros ja inadimplentes recebem o marcador para que um pagamento futuro
-- reative apenas a restricao financeira, nunca um bloqueio manual.
update public.empresas e
set billing_access_locked_at = coalesce(e.billing_access_locked_at, now())
where e.deleted_at is null
  and e.access_status in ('restricted', 'blocked')
  and exists (
    select 1
    from public.assinaturas_empresas a
    where a.empresa_id = e.id
      and a.deleted_at is null
      and a.status in ('inadimplente', 'bloqueada', 'cancelada')
  );

update public.empresas cliente
set billing_access_locked_at = coalesce(cliente.billing_access_locked_at, now())
where cliente.deleted_at is null
  and cliente.tipo_conta = 'cliente'
  and cliente.access_status in ('restricted', 'blocked')
  and exists (
    select 1
    from public.relacionamentos_parceiro_clientes rpc
    join public.assinaturas_empresas assinatura
      on assinatura.empresa_id = rpc.parceiro_empresa_id
     and assinatura.deleted_at is null
    where rpc.cliente_empresa_id = cliente.id
      and rpc.status = 'ativo'
      and assinatura.status in ('inadimplente', 'bloqueada', 'cancelada')
  );

create or replace function public.sync_company_plan_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.empresas e
  set
    plano_id = new.plano_id,
    billing_access_locked_at = case
      when new.status in ('inadimplente', 'bloqueada', 'cancelada') then coalesce(e.billing_access_locked_at, now())
      when new.status in ('trial', 'ativa', 'pagamento_pendente')
        and e.billing_access_locked_at is not null then null
      else e.billing_access_locked_at
    end,
    access_status = case
      -- Sem periodo de uso apos uma cobranca mensal recusada: a restricao e imediata.
      when new.status = 'inadimplente' then 'restricted'
      when new.status in ('bloqueada', 'cancelada') then 'blocked'
      -- So uma trava registrada pela cobranca pode ser removida aqui. Bloqueios
      -- manuais ou de seguranca continuam ativos mesmo depois da fatura paga.
      when new.status in ('trial', 'ativa', 'pagamento_pendente')
        and e.billing_access_locked_at is not null
        and e.access_status in ('restricted', 'blocked')
        and e.verification_status = 'verified' then 'active'
      else e.access_status
    end,
    status = case
      when new.status in ('inadimplente', 'bloqueada', 'cancelada') then 'bloqueada'
      when new.status in ('trial', 'ativa', 'pagamento_pendente')
        and e.billing_access_locked_at is not null
        and e.access_status in ('restricted', 'blocked')
        and e.verification_status = 'verified' then 'ativa'
      else e.status
    end,
    updated_at = now()
  where e.id = new.empresa_id;

  return new;
end $$;

create index if not exists idx_empresas_billing_access_locked
  on public.empresas(billing_access_locked_at)
  where billing_access_locked_at is not null and deleted_at is null;

-- Uma decisao manual do Admin Master sempre prevalece sobre a cobranca. Ao
-- trocar o acesso manualmente, removemos o marcador financeiro para que um
-- pagamento futuro nao reverta uma suspensao ou bloqueio administrativo.
create or replace function public.api_master_alterar_acesso_empresa(
  p_empresa_id uuid,
  p_access_status text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.empresas;
  v_event_type text;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  if p_access_status not in ('active', 'restricted', 'blocked', 'suspended')
    or nullif(trim(p_reason), '') is null
  then
    raise exception 'Status e motivo sao obrigatorios.' using errcode = '22023';
  end if;

  select * into v_company
  from public.empresas
  where id = p_empresa_id and deleted_at is null
  for update;

  if v_company.id is null then
    raise exception 'Empresa nao encontrada';
  end if;

  if p_access_status = 'active' and v_company.verification_status <> 'verified' then
    raise exception 'COMPANY_NOT_VERIFIED' using errcode = '42501';
  end if;

  v_event_type := case p_access_status
    when 'active' then 'access_reactivated'
    when 'restricted' then 'access_restricted'
    when 'blocked' then 'access_blocked'
    else 'access_suspended'
  end;

  update public.empresas
  set
    access_status = p_access_status,
    status = case when p_access_status = 'active' then 'ativa' else 'bloqueada' end,
    billing_access_locked_at = null,
    updated_at = now()
  where id = p_empresa_id;

  perform public.append_company_verification_event(
    p_empresa_id,
    (
      select id from public.solicitacoes_verificacao_empresa
      where empresa_id = p_empresa_id
      order by created_at desc limit 1
    ),
    v_event_type,
    v_company.access_status,
    p_access_status,
    'master',
    p_reason
  );

  insert into public.logs_auditoria(
    empresa_id, usuario_id, modulo, acao, novo_valor
  ) values (
    p_empresa_id,
    auth.uid(),
    'acesso_empresa',
    v_event_type,
    jsonb_build_object('access_status', p_access_status, 'reason', trim(p_reason), 'source', 'manual')
  );

  return jsonb_build_object('empresa_id', p_empresa_id, 'access_status', p_access_status);
end $$;
