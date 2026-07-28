-- Catálogo comercial vigente e preparação de add-ons recorrentes no Stripe.
-- Os Price IDs são preenchidos pelo Admin Master após a criação dos preços no Stripe.

update public.planos
set
  valor_mensal_centavos = case codigo
    when 'essencial' then 15990
    when 'profissional' then 18990
    when 'rede' then 28990
    else valor_mensal_centavos
  end,
  valor_anual_centavos = case codigo
    when 'essencial' then 159900
    when 'profissional' then 189900
    when 'rede' then 289900
    else valor_anual_centavos
  end,
  updated_at = now()
where codigo in ('essencial', 'profissional', 'rede');

alter table public.configuracoes_comerciais
  add column if not exists stripe_usuario_extra_monthly_price_id text,
  add column if not exists stripe_usuario_extra_yearly_price_id text,
  add column if not exists stripe_unidade_extra_monthly_price_id text,
  add column if not exists stripe_unidade_extra_yearly_price_id text;

alter table public.configuracoes_comerciais
  drop constraint if exists configuracoes_comerciais_stripe_price_ids_check;

alter table public.configuracoes_comerciais
  add constraint configuracoes_comerciais_stripe_price_ids_check check (
    (stripe_usuario_extra_monthly_price_id is null or stripe_usuario_extra_monthly_price_id ~ '^price_[A-Za-z0-9]+$')
    and (stripe_usuario_extra_yearly_price_id is null or stripe_usuario_extra_yearly_price_id ~ '^price_[A-Za-z0-9]+$')
    and (stripe_unidade_extra_monthly_price_id is null or stripe_unidade_extra_monthly_price_id ~ '^price_[A-Za-z0-9]+$')
    and (stripe_unidade_extra_yearly_price_id is null or stripe_unidade_extra_yearly_price_id ~ '^price_[A-Za-z0-9]+$')
  );

create unique index if not exists uq_config_comercial_stripe_user_monthly
  on public.configuracoes_comerciais(stripe_usuario_extra_monthly_price_id)
  where stripe_usuario_extra_monthly_price_id is not null;
create unique index if not exists uq_config_comercial_stripe_user_yearly
  on public.configuracoes_comerciais(stripe_usuario_extra_yearly_price_id)
  where stripe_usuario_extra_yearly_price_id is not null;
create unique index if not exists uq_config_comercial_stripe_unit_monthly
  on public.configuracoes_comerciais(stripe_unidade_extra_monthly_price_id)
  where stripe_unidade_extra_monthly_price_id is not null;
create unique index if not exists uq_config_comercial_stripe_unit_yearly
  on public.configuracoes_comerciais(stripe_unidade_extra_yearly_price_id)
  where stripe_unidade_extra_yearly_price_id is not null;

alter table public.fotografias_contratacao
  add column if not exists usuarios_extras integer not null default 0,
  add column if not exists unidades_extras integer not null default 0,
  add column if not exists valor_addons_centavos integer not null default 0,
  add column if not exists addons_json jsonb not null default '{}'::jsonb;

alter table public.assinaturas_empresas
  add column if not exists usuarios_extras integer not null default 0,
  add column if not exists unidades_extras integer not null default 0,
  add column if not exists valor_addons_centavos integer not null default 0;

create or replace function public.api_master_listar_addons()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(c)
  from public.configuracoes_comerciais c
  where public.is_master() and c.id;
$$;

revoke all on function public.api_master_listar_addons() from public, anon;
grant execute on function public.api_master_listar_addons() to authenticated;

create or replace function public.api_master_configurar_addons(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_saved public.configuracoes_comerciais;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;

  if nullif(trim(p_payload ->> 'stripe_usuario_extra_monthly_price_id'), '') is not null
    and trim(p_payload ->> 'stripe_usuario_extra_monthly_price_id') !~ '^price_[A-Za-z0-9]+$'
  then raise exception 'INVALID_STRIPE_USER_MONTHLY_PRICE_ID'; end if;
  if nullif(trim(p_payload ->> 'stripe_usuario_extra_yearly_price_id'), '') is not null
    and trim(p_payload ->> 'stripe_usuario_extra_yearly_price_id') !~ '^price_[A-Za-z0-9]+$'
  then raise exception 'INVALID_STRIPE_USER_YEARLY_PRICE_ID'; end if;
  if nullif(trim(p_payload ->> 'stripe_unidade_extra_monthly_price_id'), '') is not null
    and trim(p_payload ->> 'stripe_unidade_extra_monthly_price_id') !~ '^price_[A-Za-z0-9]+$'
  then raise exception 'INVALID_STRIPE_UNIT_MONTHLY_PRICE_ID'; end if;
  if nullif(trim(p_payload ->> 'stripe_unidade_extra_yearly_price_id'), '') is not null
    and trim(p_payload ->> 'stripe_unidade_extra_yearly_price_id') !~ '^price_[A-Za-z0-9]+$'
  then raise exception 'INVALID_STRIPE_UNIT_YEARLY_PRICE_ID'; end if;

  update public.configuracoes_comerciais
  set preco_usuario_extra_centavos = coalesce(nullif(p_payload ->> 'preco_usuario_extra_centavos', '')::integer, preco_usuario_extra_centavos),
      preco_unidade_extra_centavos = coalesce(nullif(p_payload ->> 'preco_unidade_extra_centavos', '')::integer, preco_unidade_extra_centavos),
      stripe_usuario_extra_monthly_price_id = case when p_payload ? 'stripe_usuario_extra_monthly_price_id' then nullif(trim(p_payload ->> 'stripe_usuario_extra_monthly_price_id'), '') else stripe_usuario_extra_monthly_price_id end,
      stripe_usuario_extra_yearly_price_id = case when p_payload ? 'stripe_usuario_extra_yearly_price_id' then nullif(trim(p_payload ->> 'stripe_usuario_extra_yearly_price_id'), '') else stripe_usuario_extra_yearly_price_id end,
      stripe_unidade_extra_monthly_price_id = case when p_payload ? 'stripe_unidade_extra_monthly_price_id' then nullif(trim(p_payload ->> 'stripe_unidade_extra_monthly_price_id'), '') else stripe_unidade_extra_monthly_price_id end,
      stripe_unidade_extra_yearly_price_id = case when p_payload ? 'stripe_unidade_extra_yearly_price_id' then nullif(trim(p_payload ->> 'stripe_unidade_extra_yearly_price_id'), '') else stripe_unidade_extra_yearly_price_id end,
      updated_at = now(), updated_by = auth.uid()
  where id = true
  returning * into v_saved;

  if not found then raise exception 'COMMERCIAL_CONFIGURATION_NOT_FOUND'; end if;
  return to_jsonb(v_saved);
end;
$$;

revoke all on function public.api_master_configurar_addons(jsonb) from public, anon;
grant execute on function public.api_master_configurar_addons(jsonb) to authenticated;
