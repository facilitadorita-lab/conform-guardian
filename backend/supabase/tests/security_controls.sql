-- Regression checks for privileged security controls.
-- This file is intentionally read-only and can run against a staging/local DB.

do $$
begin
  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'api_mfa_policy_status'
  ) then raise exception 'MFA_POLICY_RPC_MISSING'; end if;
  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'api_master_stripe_health'
  ) then raise exception 'STRIPE_HEALTH_RPC_MISSING'; end if;
  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'api_master_listar_sandbox'
  ) then raise exception 'SANDBOX_RPC_MISSING'; end if;
  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'api_auditoria_integridade'
  ) then raise exception 'AUDIT_INTEGRITY_RPC_MISSING'; end if;
  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'api_copiloto_proximas_acoes'
  ) then raise exception 'COPILOT_ACTIONS_RPC_MISSING'; end if;
  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'api_painel_fiscalizacao'
  ) then raise exception 'INSPECTION_PANEL_RPC_MISSING'; end if;
  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'api_partner_carteira_saude'
  ) then raise exception 'PARTNER_PORTFOLIO_RPC_MISSING'; end if;
end;
$$;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'anexos' and column_name in ('scan_status', 'scan_engine', 'scan_sha256'))
    or (table_name = 'empresas' and column_name = 'is_sandbox'))
order by table_name, column_name;

select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('sandbox_ambientes', 'anexos', 'logs_auditoria');

select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'api_mfa_policy_status', 'api_master_stripe_health', 'api_master_listar_sandbox',
    'api_master_criar_sandbox', 'api_master_arquivar_sandbox',
    'api_auditoria_integridade', 'api_copiloto_proximas_acoes',
    'api_registrar_acao_copiloto', 'api_painel_fiscalizacao',
    'api_registrar_acesso_fiscalizacao', 'api_partner_carteira_saude'
  );

do $$
declare v_exposta integer;
begin
  select count(*) into v_exposta
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'api_auditoria_integridade', 'api_copiloto_proximas_acoes',
      'api_registrar_acao_copiloto', 'api_painel_fiscalizacao',
      'api_registrar_acesso_fiscalizacao', 'api_partner_carteira_saude'
    )
    and has_function_privilege('anon', p.oid, 'EXECUTE');

  if v_exposta <> 0 then
    raise exception 'OPERATIONAL_COPILOT_RPC_EXPOSED_TO_ANON: %', v_exposta;
  end if;
end;
$$;

select tg.tgname
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not tg.tgisinternal
  and n.nspname = 'public'
  and c.relname = 'permissoes_usuario_empresa'
  and tg.tgname = 'trg_permissoes_usuario_audit';
