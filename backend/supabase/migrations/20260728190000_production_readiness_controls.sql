-- Conform Flow — controles de prontidão para operação comercial.
--
-- Este módulo não libera acesso nem substitui RLS. Ele transforma os
-- requisitos operacionais (isolamento, backup, cobrança, anexos e releases)
-- em sinais auditáveis para o Admin Master, sempre protegidos por MFA.

create table if not exists public.configuracoes_plataforma (
  chave text primary key,
  valor_json jsonb not null default '{}'::jsonb,
  descricao text not null,
  updated_by uuid references public.usuarios(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.configuracoes_plataforma enable row level security;
revoke all on public.configuracoes_plataforma from anon, authenticated;
grant select, insert, update, delete on public.configuracoes_plataforma to service_role;

insert into public.configuracoes_plataforma(chave, valor_json, descricao)
values
  ('monthly_cost_alert_cents', '100000'::jsonb, 'Alerta operacional de custo mensal configurado pelo Admin Master.'),
  ('backup_max_age_days', '7'::jsonb, 'Idade máxima recomendada para o último ensaio de restauração.'),
  ('webhook_failure_threshold_24h', '5'::jsonb, 'Falhas de webhook que elevam a cobrança para atenção.'),
  ('client_error_threshold_24h', '10'::jsonb, 'Erros de frontend abertos que elevam a plataforma para atenção.'),
  ('attachment_pending_max_hours', '24'::jsonb, 'Tempo máximo recomendado para anexos aguardando validação.')
on conflict (chave) do nothing;

create or replace function public.api_master_listar_configuracoes_plataforma()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(
    jsonb_object_agg(c.chave, jsonb_build_object(
      'valor', c.valor_json,
      'descricao', c.descricao,
      'updated_at', c.updated_at
    ) order by c.chave),
    '{}'::jsonb
  )
  from public.configuracoes_plataforma c
  where public.is_master() and public.session_has_aal2()
$$;

create or replace function public.api_master_salvar_configuracoes_plataforma(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_allowed text[] := array[
    'monthly_cost_alert_cents',
    'backup_max_age_days',
    'webhook_failure_threshold_24h',
    'client_error_threshold_24h',
    'attachment_pending_max_hours'
  ];
  v_key text;
  v_value jsonb;
  v_number integer;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'INVALID_PLATFORM_CONFIGURATION' using errcode = '22023';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_payload) loop
    if not (v_key = any(v_allowed)) then
      raise exception 'UNKNOWN_PLATFORM_CONFIGURATION: %', v_key using errcode = '22023';
    end if;
    if jsonb_typeof(v_value) <> 'number' then
      raise exception 'PLATFORM_CONFIGURATION_MUST_BE_NUMBER: %', v_key using errcode = '22023';
    end if;
    v_number := (v_value::text)::integer;
    if (v_key = 'monthly_cost_alert_cents' and (v_number < 0 or v_number > 100000000))
      or (v_key <> 'monthly_cost_alert_cents' and (v_number < 1 or v_number > 3650)) then
      raise exception 'PLATFORM_CONFIGURATION_OUT_OF_RANGE: %', v_key using errcode = '22023';
    end if;
    update public.configuracoes_plataforma
      set valor_json = v_value, updated_by = auth.uid(), updated_at = now()
      where chave = v_key;
    if not found then
      raise exception 'PLATFORM_CONFIGURATION_NOT_FOUND: %', v_key using errcode = '22023';
    end if;
  end loop;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, novo_valor)
  values (null, auth.uid(), 'plataforma', 'configuracao_operacional_alterada', p_payload);

  return public.api_master_listar_configuracoes_plataforma();
end;
$$;

create or replace function public.api_master_production_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_checks jsonb := '[]'::jsonb;
  v_blocked integer := 0;
  v_attention integer := 0;
  v_rls_tables integer;
  v_latest_test record;
  v_has_latest_test boolean := false;
  v_latest_backup record;
  v_has_latest_backup boolean := false;
  v_latest_deployment record;
  v_has_latest_deployment boolean := false;
  v_webhook_failures bigint;
  v_client_errors bigint;
  v_pending_scans bigint;
  v_backup_age_days integer;
  v_backup_max_age integer := 7;
  v_monthly_cost_alert integer := 100000;
  v_webhook_threshold integer := 5;
  v_client_error_threshold integer := 10;
  v_scan_max_hours integer := 24;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;

  select coalesce((valor_json::text)::integer, 7) into v_backup_max_age
    from public.configuracoes_plataforma where chave = 'backup_max_age_days';
  select coalesce((valor_json::text)::integer, 100000) into v_monthly_cost_alert
    from public.configuracoes_plataforma where chave = 'monthly_cost_alert_cents';
  select coalesce((valor_json::text)::integer, 5) into v_webhook_threshold
    from public.configuracoes_plataforma where chave = 'webhook_failure_threshold_24h';
  select coalesce((valor_json::text)::integer, 10) into v_client_error_threshold
    from public.configuracoes_plataforma where chave = 'client_error_threshold_24h';
  select coalesce((valor_json::text)::integer, 24) into v_scan_max_hours
    from public.configuracoes_plataforma where chave = 'attachment_pending_max_hours';

  select count(*)::integer into v_rls_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'codigo', 'rls_ativo', 'titulo', 'Isolamento RLS ativo',
    'status', case when v_rls_tables > 0 then 'passed' else 'blocked' end,
    'resumo', format('%s tabelas públicas com RLS habilitado.', v_rls_tables)
  ));
  if v_rls_tables = 0 then v_blocked := v_blocked + 1; end if;

  select status, failed_checks, executed_at into v_latest_test
  from public.execucoes_teste_isolamento order by executed_at desc limit 1;
  v_has_latest_test := found;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'codigo', 'teste_isolamento', 'titulo', 'Teste de fronteira entre empresas',
    'status', case when not v_has_latest_test then 'attention' when v_latest_test.status = 'passed' then 'passed' when v_latest_test.status = 'failed' then 'blocked' else 'attention' end,
    'resumo', case when not v_has_latest_test then 'Ainda não executado.' else format('Última execução: %s.', v_latest_test.executed_at) end,
    'failed_checks', case when v_has_latest_test then coalesce(v_latest_test.failed_checks, 0) else 0 end
  ));
  if v_has_latest_test and v_latest_test.status = 'failed' then v_blocked := v_blocked + 1; elsif not v_has_latest_test then v_attention := v_attention + 1; end if;

  select status, completed_at, initiated_at into v_latest_backup
  from public.ensaios_restauracao_backup order by coalesce(completed_at, initiated_at) desc limit 1;
  v_has_latest_backup := found;
  v_backup_age_days := case when not v_has_latest_backup or v_latest_backup.completed_at is null then null else greatest(0, floor(extract(epoch from (now() - v_latest_backup.completed_at)) / 86400)::integer) end;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'codigo', 'backup_restore', 'titulo', 'Backup e restauração testados',
    'status', case when v_has_latest_backup and v_latest_backup.status = 'passed' and v_backup_age_days <= v_backup_max_age then 'passed' when v_has_latest_backup and v_latest_backup.status = 'failed' then 'blocked' else 'attention' end,
    'resumo', case when not v_has_latest_backup or v_latest_backup.completed_at is null then 'Nenhum ensaio registrado.' else format('Último ensaio há %s dia(s).', v_backup_age_days) end,
    'max_age_days', v_backup_max_age
  ));
  if v_has_latest_backup and v_latest_backup.status = 'failed' then v_blocked := v_blocked + 1; elsif not v_has_latest_backup or v_backup_age_days > v_backup_max_age then v_attention := v_attention + 1; end if;

  select count(*) into v_webhook_failures
  from public.eventos_webhook_pagamento
  where not processado and recebido_at >= now() - interval '24 hours';
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'codigo', 'stripe_webhooks', 'titulo', 'Webhooks Stripe',
    'status', case when v_webhook_failures = 0 then 'passed' when v_webhook_failures >= v_webhook_threshold then 'blocked' else 'attention' end,
    'resumo', format('%s falha(s) nas últimas 24 horas.', v_webhook_failures),
    'threshold', v_webhook_threshold
  ));
  if v_webhook_failures >= v_webhook_threshold then v_blocked := v_blocked + 1; elsif v_webhook_failures > 0 then v_attention := v_attention + 1; end if;

  select coalesce(sum(ocorrencias), 0) into v_client_errors
  from public.eventos_erro_sistema
  where resolvido_at is null and ultima_ocorrencia_at >= now() - interval '24 hours';
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'codigo', 'erros_frontend', 'titulo', 'Erros abertos do frontend',
    'status', case when v_client_errors = 0 then 'passed' when v_client_errors >= v_client_error_threshold then 'blocked' else 'attention' end,
    'resumo', format('%s ocorrência(s) não resolvida(s) nas últimas 24 horas.', v_client_errors),
    'threshold', v_client_error_threshold
  ));
  if v_client_errors >= v_client_error_threshold then v_blocked := v_blocked + 1; elsif v_client_errors > 0 then v_attention := v_attention + 1; end if;

  select count(*) into v_pending_scans
  from public.anexos
  where deleted_at is null
    and scan_status in ('pending', 'error')
    and created_at < now() - make_interval(hours => v_scan_max_hours);
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'codigo', 'anexos_seguro', 'titulo', 'Anexos validados',
    'status', case when v_pending_scans = 0 then 'passed' else 'attention' end,
    'resumo', format('%s anexo(s) aguardando validação há mais de %s hora(s).', v_pending_scans, v_scan_max_hours)
  ));
  if v_pending_scans > 0 then v_attention := v_attention + 1; end if;

  select status, versao, concluido_at into v_latest_deployment
  from public.implantacoes_sistema
  where ambiente = 'production' order by iniciado_at desc limit 1;
  v_has_latest_deployment := found;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'codigo', 'release_producao', 'titulo', 'Última publicação em produção',
    'status', case when v_has_latest_deployment and v_latest_deployment.status = 'succeeded' then 'passed' when not v_has_latest_deployment then 'attention' else 'blocked' end,
    'resumo', case when v_has_latest_deployment then coalesce(v_latest_deployment.versao, 'Versão não informada.') else 'Nenhuma publicação registrada.' end
  ));
  if not v_has_latest_deployment then v_attention := v_attention + 1; elsif v_latest_deployment.status <> 'succeeded' then v_blocked := v_blocked + 1; end if;

  return jsonb_build_object(
    'status', case when v_blocked > 0 then 'blocked' when v_attention > 0 then 'attention' else 'ready' end,
    'blocked_count', v_blocked,
    'attention_count', v_attention,
    'checks', v_checks,
    'checked_at', now(),
    'configuration', jsonb_build_object(
      'backup_max_age_days', v_backup_max_age,
      'monthly_cost_alert_cents', v_monthly_cost_alert,
      'webhook_failure_threshold_24h', v_webhook_threshold,
      'client_error_threshold_24h', v_client_error_threshold,
      'attachment_pending_max_hours', v_scan_max_hours
    )
  );
end;
$$;

revoke all on function public.api_master_listar_configuracoes_plataforma() from public, anon;
revoke all on function public.api_master_salvar_configuracoes_plataforma(jsonb) from public, anon;
revoke all on function public.api_master_production_readiness() from public, anon;
grant execute on function public.api_master_listar_configuracoes_plataforma() to authenticated;
grant execute on function public.api_master_salvar_configuracoes_plataforma(jsonb) to authenticated;
grant execute on function public.api_master_production_readiness() to authenticated;
