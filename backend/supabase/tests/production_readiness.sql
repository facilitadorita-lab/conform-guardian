-- Verificações estruturais do painel de prontidão. Não cria dados nem usa
-- credenciais de clientes; roda depois de todas as migrations locais.
do $$
declare
  v_config_count integer;
  v_function_count integer;
begin
  if to_regclass('public.configuracoes_plataforma') is null then
    raise exception 'PRODUCTION_READINESS_CONFIGURATION_TABLE_MISSING';
  end if;

  select count(*) into v_config_count
  from public.configuracoes_plataforma
  where chave in (
    'monthly_cost_alert_cents',
    'backup_max_age_days',
    'webhook_failure_threshold_24h',
    'client_error_threshold_24h',
    'attachment_pending_max_hours'
  );
  if v_config_count <> 5 then
    raise exception 'PRODUCTION_READINESS_DEFAULTS_MISSING: %', v_config_count;
  end if;

  select count(*) into v_function_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'api_master_production_readiness',
      'api_master_listar_configuracoes_plataforma',
      'api_master_salvar_configuracoes_plataforma'
    );
  if v_function_count <> 3 then
    raise exception 'PRODUCTION_READINESS_FUNCTIONS_MISSING: %', v_function_count;
  end if;
end;
$$;
