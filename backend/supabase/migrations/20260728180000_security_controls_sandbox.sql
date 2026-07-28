-- Conform Flow — controles de segurança complementares.
-- Esta migration mantém as regras no backend e não expõe dados entre tenants.

-- 1. MFA obrigatório para Admin Master, administradores de empresas e
-- administradores de parceiros. A consulta de status continua disponível
-- para que o usuário consiga ativar o segundo fator.
create or replace function public.current_user_requires_mfa()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(
    public.is_master()
    or exists (
      select 1
      from public.usuarios_empresas ue
      join public.empresas e on e.id = ue.empresa_id
      where ue.usuario_id = auth.uid()
        and ue.ativo
        and ue.deleted_at is null
        and e.deleted_at is null
        and ue.perfil in ('administrador', 'administrador_provisorio', 'parceiro_administrador')
    ),
    false
  )
$$;

create or replace function public.enforce_privileged_mfa()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.role() = 'authenticated'
     and public.current_user_requires_mfa()
     and not public.session_has_aal2() then
    raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.api_mfa_policy_status()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select jsonb_build_object(
    'required', public.current_user_requires_mfa(),
    'current_level', coalesce(auth.jwt() ->> 'aal', 'aal1'),
    'satisfied', not public.current_user_requires_mfa() or public.session_has_aal2(),
    'needs_enrollment', public.current_user_requires_mfa() and not public.session_has_aal2()
  )
  where auth.uid() is not null
$$;

revoke all on function public.current_user_requires_mfa() from public, anon;
revoke all on function public.api_mfa_policy_status() from public, anon;
grant execute on function public.current_user_requires_mfa() to authenticated, service_role;
grant execute on function public.api_mfa_policy_status() to authenticated;

-- 2. Toda alteração granular de permissão deixa uma trilha imutável, mesmo
-- quando a operação veio de uma RPC diferente da tela de usuários.
create or replace function public.audit_permission_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_empresa_id uuid := case when tg_op = 'DELETE' then old.empresa_id else new.empresa_id end;
  v_usuario_id uuid := case when tg_op = 'DELETE' then old.usuario_id else new.usuario_id end;
  v_actor uuid := coalesce(
    auth.uid(),
    case when tg_op <> 'DELETE' then new.updated_by else null end,
    old.updated_by,
    case when tg_op <> 'DELETE' then new.created_by else null end,
    old.created_by
  );
begin
  insert into public.logs_auditoria(
    empresa_id, usuario_id, modulo, acao, registro_id, valor_anterior, novo_valor
  ) values (
    v_empresa_id,
    v_actor,
    'permissoes',
    case tg_op when 'INSERT' then 'permissao_concedida'
      when 'UPDATE' then 'permissao_alterada'
      else 'permissao_revogada' end,
    v_usuario_id,
    v_old,
    jsonb_build_object('permissao', coalesce(v_new ->> 'permissao_codigo', v_old ->> 'permissao_codigo'), 'registro', v_new)
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_permissoes_usuario_audit on public.permissoes_usuario_empresa;
create trigger trg_permissoes_usuario_audit
after insert or update or delete on public.permissoes_usuario_empresa
for each row execute function public.audit_permission_change();

create index if not exists idx_logs_permissoes_empresa_data
  on public.logs_auditoria(empresa_id, created_at desc)
  where modulo = 'permissoes';

-- 3. Anexos permanecem privados e passam por validação local de assinatura.
-- Nenhum documento confidencial é enviado para um antivírus de terceiros.
alter table public.anexos
  add column if not exists scan_status text not null default 'pending',
  add column if not exists scan_engine text,
  add column if not exists scan_sha256 text,
  add column if not exists scan_completed_at timestamptz;

alter table public.anexos drop constraint if exists anexos_scan_status_check;
alter table public.anexos add constraint anexos_scan_status_check
  check (scan_status in ('pending', 'clean', 'rejected', 'error', 'legacy_unverified'));

update public.anexos
set scan_status = 'legacy_unverified',
    scan_engine = coalesce(scan_engine, 'pre-security-controls')
where scan_status = 'pending' and scan_completed_at is null;

create index if not exists idx_anexos_scan_status
  on public.anexos(empresa_id, scan_status, created_at desc);

-- 4. Saúde detalhada do Stripe para o Admin Master. O payload é agregado e
-- não contém informações de clientes ou conteúdo de checkout.
create or replace function public.api_master_stripe_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_total_24h bigint;
  v_failed_24h bigint;
  v_pending bigint;
  v_last_failure timestamptz;
  v_last_success timestamptz;
  v_rate numeric;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;

  select count(*) into v_total_24h
  from public.eventos_webhook_pagamento
  where recebido_at >= now() - interval '24 hours';

  select count(*) into v_failed_24h
  from public.eventos_webhook_pagamento
  where not processado and recebido_at >= now() - interval '24 hours';

  select count(*) into v_pending
  from public.eventos_webhook_pagamento
  where not processado;

  select max(recebido_at) into v_last_failure
  from public.eventos_webhook_pagamento
  where not processado;

  select max(processado_at) into v_last_success
  from public.eventos_webhook_pagamento
  where processado;

  v_rate := case when v_total_24h = 0 then 1
    else round(((v_total_24h - v_failed_24h)::numeric / v_total_24h), 4) end;

  return jsonb_build_object(
    'status', case when v_failed_24h = 0 then 'healthy'
      when v_failed_24h >= 10 or v_rate < 0.90 then 'critical' else 'degraded' end,
    'total_24h', v_total_24h,
    'failed_24h', v_failed_24h,
    'pending_total', v_pending,
    'success_rate_24h', v_rate,
    'last_failure_at', v_last_failure,
    'last_success_at', v_last_success,
    'checked_at', now()
  );
end;
$$;

revoke all on function public.api_master_stripe_health() from public, anon;
grant execute on function public.api_master_stripe_health() to authenticated;

-- A central de saúde também exige AAL2 para evitar leitura de telemetria
-- operacional por uma sessão Master que ainda não concluiu o segundo fator.
create or replace function public.api_master_saude_sistema()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  return jsonb_build_object(
    'components', coalesce((select jsonb_agg(to_jsonb(x) order by x.componente) from (
      select distinct on (componente) componente, status, latencia_ms, detalhes_json, checked_at
      from public.verificacoes_saude_sistema order by componente, checked_at desc
    ) x), '[]'::jsonb),
    'open_alerts', coalesce((select jsonb_agg(to_jsonb(a) order by a.ultima_ocorrencia_at desc)
      from public.alertas_operacionais_sistema a where a.status = 'open'), '[]'::jsonb),
    'webhook_failures_24h', (select count(*) from public.eventos_webhook_pagamento
      where not processado and recebido_at >= now() - interval '24 hours'),
    'client_errors_24h', (select coalesce(sum(ocorrencias), 0) from public.eventos_erro_sistema
      where ultima_ocorrencia_at >= now() - interval '24 hours' and resolvido_at is null),
    'notification_failures_24h', (select count(*) from public.entregas_notificacao
      where status = 'failed' and created_at >= now() - interval '24 hours'),
    'scheduled_report_failures_24h', (select count(*) from public.execucoes_relatorios_agendados
      where status = 'failed' and created_at >= now() - interval '24 hours'),
    'data_quality_critical', (select count(*) from public.achados_qualidade_dados
      where severidade = 'critical' and resolvido_at is null),
    'last_restore_test', (select to_jsonb(r) from public.ensaios_restauracao_backup r order by initiated_at desc limit 1),
    'last_deployment', (select to_jsonb(d) from public.implantacoes_sistema d where ambiente = 'production' order by iniciado_at desc limit 1),
    'pending_dunning', (select count(*) from public.tentativas_cobranca where status in ('queued', 'processing'))
  );
end;
$$;

revoke all on function public.api_master_saude_sistema() from public, anon;
grant execute on function public.api_master_saude_sistema() to authenticated;

-- 5. Sandbox exclusivo do Admin Master que o criou. O ambiente é um tenant
-- separado, sem assinatura e sem dados de produção.
alter table public.empresas
  add column if not exists is_sandbox boolean not null default false;

create table if not exists public.sandbox_ambientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id),
  owner_user_id uuid not null references public.usuarios(id),
  nome text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  created_by uuid references public.usuarios(id)
);

create index if not exists idx_sandbox_owner_status
  on public.sandbox_ambientes(owner_user_id, status, created_at desc);

alter table public.sandbox_ambientes enable row level security;
revoke all on public.sandbox_ambientes from anon, authenticated;

create or replace function public.can_view_sandbox_company(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select not coalesce((select e.is_sandbox from public.empresas e where e.id = p_empresa_id), false)
    or exists (
      select 1 from public.sandbox_ambientes s
      where s.empresa_id = p_empresa_id
        and s.owner_user_id = auth.uid()
        and s.status = 'active'
    )
$$;

-- Mesmo o Admin Master precisa passar pelo filtro de proprietário quando o
-- tenant for um Sandbox. Assim, um UUID conhecido não libera seus módulos.
create or replace function public.has_company_membership(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_view_sandbox_company(p_empresa_id)
    and (public.is_master() or exists (
      select 1
      from public.usuarios_empresas ue
      join public.usuarios u on u.id = ue.usuario_id
      join public.empresas e on e.id = ue.empresa_id
      where ue.usuario_id = auth.uid()
        and ue.empresa_id = p_empresa_id
        and ue.ativo and ue.deleted_at is null
        and u.status = 'ativo' and u.deleted_at is null
        and e.deleted_at is null
    ))
$$;

create or replace function public.has_company_access(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_view_sandbox_company(p_empresa_id)
    and (public.is_master() or exists (
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
    ))
$$;

revoke all on function public.has_company_membership(uuid) from public, anon;
revoke all on function public.has_company_access(uuid) from public, anon;
grant execute on function public.has_company_membership(uuid) to authenticated, service_role;
grant execute on function public.has_company_access(uuid) to authenticated, service_role;

create or replace function public.api_master_listar_sandbox()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'empresa_id', s.empresa_id,
    'nome', s.nome,
    'status', s.status,
    'created_at', s.created_at,
    'archived_at', s.archived_at,
    'empresa', jsonb_build_object('nome_fantasia', e.nome_fantasia, 'cnpj', e.cnpj)
  ) order by s.created_at desc), '[]'::jsonb)
  from public.sandbox_ambientes s
  join public.empresas e on e.id = s.empresa_id
  where public.is_master()
    and public.session_has_aal2()
    and s.owner_user_id = auth.uid()
    and s.status = 'active'
$$;

create or replace function public.api_master_criar_sandbox(p_nome text default 'Ambiente de testes')
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_empresa public.empresas;
  v_sandbox public.sandbox_ambientes;
  v_plan uuid;
  v_nome text := left(coalesce(nullif(trim(p_nome), ''), 'Ambiente de testes'), 80);
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  select p.id into v_plan from public.planos p
  where p.ativo and p.codigo in ('profissional', 'completo', 'essencial')
  order by case p.codigo when 'profissional' then 1 when 'completo' then 2 else 3 end
  limit 1;

  insert into public.empresas(
    razao_social, nome_fantasia, cnpj, plano_id, status, tipo_conta,
    access_status, verification_status, verified_at, verification_method,
    is_sandbox, observacoes
  ) values (
    'Sandbox — ' || v_nome,
    'Sandbox — ' || v_nome,
    'SBX-' || upper(replace(substr(gen_random_uuid()::text, 1, 18), '-', '')),
    v_plan, 'ativa', 'direta', 'provisional', 'verified', now(), 'admin_master_sandbox', true,
    'Ambiente isolado para testes do Admin Master. Não representa uma empresa cliente.'
  ) returning * into v_empresa;

  insert into public.usuarios_empresas(usuario_id, empresa_id, perfil, ativo)
  values (auth.uid(), v_empresa.id, 'administrador', true);

  insert into public.sandbox_ambientes(empresa_id, owner_user_id, nome, created_by)
  values (v_empresa.id, auth.uid(), v_nome, auth.uid())
  returning * into v_sandbox;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, novo_valor)
  values (v_empresa.id, auth.uid(), 'sandbox', 'sandbox_criado', v_sandbox.id,
    jsonb_build_object('sandbox_id', v_sandbox.id, 'owner_user_id', auth.uid(), 'nome', v_nome));

  return jsonb_build_object('id', v_sandbox.id, 'empresa_id', v_empresa.id, 'nome', v_nome, 'status', 'active');
end;
$$;

create or replace function public.api_master_arquivar_sandbox(p_sandbox_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_sandbox public.sandbox_ambientes;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  update public.sandbox_ambientes
  set status = 'archived', archived_at = now()
  where id = p_sandbox_id and owner_user_id = auth.uid() and status = 'active'
  returning * into v_sandbox;
  if not found then raise exception 'SANDBOX_NOT_FOUND'; end if;
  update public.empresas
  set status = 'cancelada', access_status = 'blocked', deleted_at = now(), updated_at = now()
  where id = v_sandbox.empresa_id and is_sandbox;
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, novo_valor)
  values (v_sandbox.empresa_id, auth.uid(), 'sandbox', 'sandbox_arquivado', v_sandbox.id,
    jsonb_build_object('sandbox_id', v_sandbox.id));
  return jsonb_build_object('ok', true, 'id', v_sandbox.id, 'status', 'archived');
end;
$$;

revoke all on function public.can_view_sandbox_company(uuid) from public, anon;
revoke all on function public.api_master_listar_sandbox() from public, anon;
revoke all on function public.api_master_criar_sandbox(text) from public, anon;
revoke all on function public.api_master_arquivar_sandbox(uuid) from public, anon;
grant execute on function public.can_view_sandbox_company(uuid) to authenticated, service_role;
grant execute on function public.api_master_listar_sandbox() to authenticated;
grant execute on function public.api_master_criar_sandbox(text) to authenticated;
grant execute on function public.api_master_arquivar_sandbox(uuid) to authenticated;

-- Oculta sandbox de outros Admin Masters no contexto de empresas permitido.
create or replace function public.api_contexto_usuario()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
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
      'is_sandbox', coalesce(e.is_sandbox, false),
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
  left join public.empresas e on e.deleted_at is null
    and public.can_view_sandbox_company(e.id)
    and (u.is_master or public.has_company_membership(e.id))
  left join public.planos p on p.id = e.plano_id and p.ativo
  where u.id = auth.uid() and u.deleted_at is null
  group by u.id;
  if v_result is null then raise exception 'Perfil não encontrado'; end if;
  return v_result;
end;
$$;

revoke all on function public.api_contexto_usuario() from public, anon;
grant execute on function public.api_contexto_usuario() to authenticated;
