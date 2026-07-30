-- Camada A de Stripe: contratos locais sem chamadas externas.
-- Não usa chaves, cartões ou endpoints Stripe.
do $$
declare
  v_rls boolean;
  v_pk boolean;
  v_public_grants integer;
  v_provisioner integer;
begin
  if to_regclass('public.eventos_webhook_pagamento') is null then
    raise exception 'STRIPE_WEBHOOK_EVENTS_TABLE_MISSING';
  end if;

  select c.relrowsecurity into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'eventos_webhook_pagamento';
  if not coalesce(v_rls, false) then raise exception 'STRIPE_WEBHOOK_RLS_DISABLED'; end if;

  select exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'eventos_webhook_pagamento'
      and c.contype = 'p'
      and exists (
        select 1
        from unnest(c.conkey) column_number
        join pg_attribute a
          on a.attrelid = t.oid and a.attnum = column_number
        where a.attname = 'stripe_event_id'
      )
  ) into v_pk;
  if not v_pk then raise exception 'STRIPE_EVENT_ID_NOT_UNIQUE'; end if;

  select count(*) into v_public_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'eventos_webhook_pagamento'
    and grantee in ('anon', 'authenticated');
  if v_public_grants <> 0 then raise exception 'STRIPE_WEBHOOK_TABLE_EXPOSED'; end if;

  select count(*) into v_provisioner
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'internal_provisionar_contratacao_paga';
  if v_provisioner <> 1 then raise exception 'STRIPE_PROVISIONER_CONTRACT_MISSING'; end if;
end;
$$;
