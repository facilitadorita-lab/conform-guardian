-- Conform Flow — motor central de acesso efetivo e limites.

create or replace function public.subscription_status_normalized(p_empresa_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case a.status
      when 'trial' then 'trialing'
      when 'ativa' then 'active'
      when 'pagamento_pendente' then 'payment_pending'
      when 'inadimplente' then 'past_due'
      when 'bloqueada' then 'past_due'
      when 'cancelada' then 'canceled'
      else 'expired'
    end
    from public.assinaturas_empresas a
    where a.empresa_id = p_empresa_id
      and a.deleted_at is null
    limit 1
  ), 'trialing')
$$;

-- Cobrança pode restringir o acesso, mas nunca aprova uma empresa automaticamente.
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
    access_status = case
      when new.status = 'inadimplente' then 'restricted'
      when new.status in ('bloqueada', 'cancelada') then 'blocked'
      when e.verification_status = 'verified'
        and e.access_status not in ('blocked', 'suspended') then 'active'
      when e.verification_status in (
        'pending_review',
        'additional_information_required',
        'reverification_required'
      ) and e.access_status <> 'suspended' then 'provisional'
      else e.access_status
    end,
    -- Compatibilidade temporária com telas anteriores.
    status = case
      when new.status in ('inadimplente', 'bloqueada', 'cancelada') then 'bloqueada'
      when e.verification_status = 'verified'
        and e.access_status not in ('blocked', 'suspended') then 'ativa'
      else e.status
    end,
    updated_at = now()
  where e.id = new.empresa_id;

  return new;
end $$;

-- Leitura operacional exige vínculo e um estado que permita abrir os módulos.
create or replace function public.has_company_access(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_master() or exists (
    select 1
    from public.usuarios_empresas ue
    join public.usuarios u on u.id = ue.usuario_id
    join public.empresas e on e.id = ue.empresa_id
    where ue.usuario_id = auth.uid()
      and ue.empresa_id = p_empresa_id
      and ue.ativo
      and ue.deleted_at is null
      and u.status = 'ativo'
      and u.deleted_at is null
      and e.access_status in ('provisional', 'active')
      and e.deleted_at is null
  )
$$;

create or replace function public.company_role(p_empresa_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_master() then 'master'
    else (
      select ue.perfil
      from public.usuarios_empresas ue
      where ue.usuario_id = auth.uid()
        and ue.empresa_id = p_empresa_id
        and ue.ativo
        and ue.deleted_at is null
      limit 1
    )
  end
$$;

create or replace function public.company_billing_allows_write(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
      when e.access_status = 'provisional' then true
      when a.id is null then true
      else a.status in ('trial', 'ativa', 'pagamento_pendente')
    end
    from public.empresas e
    left join public.assinaturas_empresas a
      on a.empresa_id = e.id
      and a.deleted_at is null
    where e.id = p_empresa_id
      and e.deleted_at is null
    limit 1
  ), false)
$$;

-- Durante a análise, um catálogo controlado libera somente recursos de experimentação.
create or replace function public.plan_feature_enabled(p_empresa_id uuid, p_recurso text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_access_status text;
  v_verification_status text;
  v_enabled boolean;
begin
  if public.is_master() then
    return true;
  end if;

  select e.access_status, e.verification_status
  into v_access_status, v_verification_status
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null;

  if v_access_status = 'provisional'
    and v_verification_status in (
      'pending_review',
      'additional_information_required',
      'reverification_required'
    )
  then
    return p_recurso in (
      'assistente_ia',
      'vencimentos',
      'documentos',
      'equipamentos',
      'calibracoes',
      'qualificacoes',
      'manutencoes',
      'pendencias',
      'alertas',
      'usuarios',
      'anexos'
    );
  end if;

  select coalesce((p.recursos ->> p_recurso)::boolean, false)
  into v_enabled
  from public.empresas e
  join public.planos p on p.id = e.plano_id
  where e.id = p_empresa_id
    and e.deleted_at is null
    and p.ativo;

  return coalesce(v_enabled, false);
end $$;

create or replace function public.assert_plan_feature(p_empresa_id uuid, p_recurso text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.plan_feature_enabled(p_empresa_id, p_recurso) then
    raise exception 'PLAN_FEATURE_NOT_AVAILABLE'
      using errcode = '42501',
        detail = format('O recurso %s não está disponível para esta empresa.', p_recurso);
  end if;
end $$;

create or replace function public.can_write_company(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.has_company_access(p_empresa_id)
    and public.company_role(p_empresa_id) in (
      'master',
      'administrador_provisorio',
      'administrador',
      'responsavel_tecnico',
      'colaborador'
    )
    and public.company_billing_allows_write(p_empresa_id),
    false
  )
$$;

create or replace function public.can_admin_company(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.has_company_access(p_empresa_id)
    and public.company_role(p_empresa_id) in (
      'master',
      'administrador_provisorio',
      'administrador'
    ),
    false
  )
$$;

-- Retorna um limite numérico já considerando provisório, customização e plano.
create or replace function public.effective_company_limit(
  p_empresa_id uuid,
  p_limit_name text
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_access_status text;
  v_limit public.limites_acesso_empresa;
  v_config public.configuracoes_limites_provisorios;
  v_value integer;
begin
  if p_limit_name not in (
    'max_users',
    'max_units',
    'max_documents',
    'max_equipment',
    'max_pending_tasks',
    'max_storage_mb',
    'max_reports'
  ) then
    raise exception 'Limite desconhecido: %', p_limit_name;
  end if;

  select e.access_status
  into v_access_status
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null;

  select l.*
  into v_limit
  from public.limites_acesso_empresa l
  where l.empresa_id = p_empresa_id
    and l.effective_from <= now()
    and (l.effective_until is null or l.effective_until > now())
    and (
      l.source_type = 'custom'
      or (v_access_status = 'provisional' and l.source_type = 'provisional')
    )
  order by
    case l.source_type when 'custom' then 0 else 1 end,
    l.effective_from desc
  limit 1;

  if found then
    v_value := case p_limit_name
      when 'max_users' then v_limit.max_users
      when 'max_units' then v_limit.max_units
      when 'max_documents' then v_limit.max_documents
      when 'max_equipment' then v_limit.max_equipment
      when 'max_pending_tasks' then v_limit.max_pending_tasks
      when 'max_storage_mb' then v_limit.max_storage_mb
      when 'max_reports' then v_limit.max_reports
    end;

    if v_value is not null then
      return v_value;
    end if;
  end if;

  if v_access_status = 'provisional' then
    select c.* into v_config
    from public.configuracoes_limites_provisorios c
    where c.id;

    return case p_limit_name
      when 'max_users' then v_config.max_users
      when 'max_units' then v_config.max_units
      when 'max_documents' then v_config.max_documents
      when 'max_equipment' then v_config.max_equipment
      when 'max_pending_tasks' then v_config.max_pending_tasks
      when 'max_storage_mb' then v_config.max_storage_mb
      when 'max_reports' then v_config.max_reports
    end;
  end if;

  select case p_limit_name
    when 'max_users' then p.limite_usuarios
    when 'max_units' then nullif(p.recursos ->> 'limite_unidades', '')::integer
    when 'max_documents' then p.limite_documentos
    when 'max_equipment' then p.limite_equipamentos
    when 'max_pending_tasks' then nullif(p.recursos ->> 'limite_pendencias', '')::integer
    when 'max_storage_mb' then p.limite_storage_mb
    when 'max_reports' then nullif(p.recursos ->> 'limite_relatorios', '')::integer
  end
  into v_value
  from public.empresas e
  join public.planos p on p.id = e.plano_id
  where e.id = p_empresa_id
    and e.deleted_at is null;

  return v_value;
end $$;

create or replace function public.company_access_flag(
  p_empresa_id uuid,
  p_flag_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_access_status text;
  v_limit public.limites_acesso_empresa;
  v_config public.configuracoes_limites_provisorios;
  v_recursos jsonb;
begin
  if p_flag_name not in ('allow_exports', 'allow_integrations', 'allow_bulk_import') then
    raise exception 'Permissão desconhecida: %', p_flag_name;
  end if;

  select e.access_status, p.recursos
  into v_access_status, v_recursos
  from public.empresas e
  left join public.planos p on p.id = e.plano_id
  where e.id = p_empresa_id
    and e.deleted_at is null;

  select l.*
  into v_limit
  from public.limites_acesso_empresa l
  where l.empresa_id = p_empresa_id
    and l.effective_from <= now()
    and (l.effective_until is null or l.effective_until > now())
    and (
      l.source_type = 'custom'
      or (v_access_status = 'provisional' and l.source_type = 'provisional')
    )
  order by
    case l.source_type when 'custom' then 0 else 1 end,
    l.effective_from desc
  limit 1;

  if found then
    return case p_flag_name
      when 'allow_exports' then v_limit.allow_exports
      when 'allow_integrations' then v_limit.allow_integrations
      when 'allow_bulk_import' then v_limit.allow_bulk_import
    end;
  end if;

  if v_access_status = 'provisional' then
    select c.* into v_config
    from public.configuracoes_limites_provisorios c
    where c.id;

    return case p_flag_name
      when 'allow_exports' then v_config.allow_exports
      when 'allow_integrations' then v_config.allow_integrations
      when 'allow_bulk_import' then v_config.allow_bulk_import
    end;
  end if;

  return case p_flag_name
    when 'allow_exports' then coalesce((v_recursos ->> 'exportacoes')::boolean, false)
    when 'allow_integrations' then coalesce((v_recursos ->> 'integracoes')::boolean, false)
    when 'allow_bulk_import' then coalesce((v_recursos ->> 'importacao_massa')::boolean, false)
  end;
end $$;

create or replace function public.get_company_usage_limits(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_documents bigint;
  v_equipment bigint;
  v_users bigint;
  v_pending bigint;
  v_storage_bytes bigint;
begin
  if not public.has_company_membership(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select count(*) into v_documents
  from public.documentos
  where empresa_id = p_empresa_id and deleted_at is null;

  select count(*) into v_equipment
  from public.equipamentos
  where empresa_id = p_empresa_id and deleted_at is null;

  select count(*) into v_users
  from public.usuarios_empresas
  where empresa_id = p_empresa_id and ativo and deleted_at is null;

  select count(*) into v_pending
  from public.pendencias
  where empresa_id = p_empresa_id
    and status in ('pendente', 'em_andamento')
    and deleted_at is null;

  select coalesce(sum(bytes), 0)
  into v_storage_bytes
  from (
    select a.tamanho_bytes::bigint bytes
    from public.anexos a
    where a.empresa_id = p_empresa_id
      and a.status = 'ativo'
      and a.deleted_at is null
    union all
    select e.file_size::bigint bytes
    from public.evidencias_verificacao_empresa e
    where e.empresa_id = p_empresa_id
      and e.review_status <> 'replaced'
  ) used_storage;

  return jsonb_build_object(
    'max_users', public.effective_company_limit(p_empresa_id, 'max_users'),
    'max_units', public.effective_company_limit(p_empresa_id, 'max_units'),
    'max_documents', public.effective_company_limit(p_empresa_id, 'max_documents'),
    'max_equipment', public.effective_company_limit(p_empresa_id, 'max_equipment'),
    'max_pending_tasks', public.effective_company_limit(p_empresa_id, 'max_pending_tasks'),
    'max_storage_mb', public.effective_company_limit(p_empresa_id, 'max_storage_mb'),
    'max_reports', public.effective_company_limit(p_empresa_id, 'max_reports'),
    'allow_exports', public.company_access_flag(p_empresa_id, 'allow_exports'),
    'allow_integrations', public.company_access_flag(p_empresa_id, 'allow_integrations'),
    'allow_bulk_import', public.company_access_flag(p_empresa_id, 'allow_bulk_import'),
    'usage', jsonb_build_object(
      'users', v_users,
      'units', 0,
      'documents', v_documents,
      'equipment', v_equipment,
      'pending_tasks', v_pending,
      'storage_bytes', v_storage_bytes
    )
  );
end $$;

create or replace function public.check_company_permission(
  p_empresa_id uuid,
  p_recurso text,
  p_acao text default 'read'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_company_membership(p_empresa_id) then
    return false;
  end if;

  if public.is_master() then
    return true;
  end if;

  if p_acao = 'read' then
    return public.has_company_access(p_empresa_id)
      and public.plan_feature_enabled(p_empresa_id, p_recurso);
  elsif p_acao = 'write' then
    return public.can_write_company(p_empresa_id)
      and public.plan_feature_enabled(p_empresa_id, p_recurso);
  elsif p_acao = 'admin' then
    return public.can_admin_company(p_empresa_id)
      and public.can_write_company(p_empresa_id)
      and public.plan_feature_enabled(p_empresa_id, p_recurso);
  elsif p_acao = 'export' then
    return public.has_company_access(p_empresa_id)
      and public.company_access_flag(p_empresa_id, 'allow_exports');
  end if;

  return false;
end $$;

create or replace function public.get_effective_company_permissions(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company public.empresas;
  v_subscription_status text;
  v_role text;
  v_reason_code text;
begin
  if not public.has_company_membership(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select * into v_company
  from public.empresas
  where id = p_empresa_id and deleted_at is null;

  v_subscription_status := public.subscription_status_normalized(p_empresa_id);
  v_role := public.company_role(p_empresa_id);

  v_reason_code := case
    when v_company.access_status = 'blocked' then 'COMPANY_ACCESS_BLOCKED'
    when v_company.access_status = 'suspended' then 'COMPANY_ACCESS_SUSPENDED'
    when v_company.access_status = 'restricted' then 'COMPANY_ACCESS_RESTRICTED'
    when v_company.verification_status = 'email_confirmation_pending' then 'EMAIL_CONFIRMATION_REQUIRED'
    when v_subscription_status = 'past_due' then 'SUBSCRIPTION_PAST_DUE'
    when v_subscription_status in ('canceled', 'expired') then 'SUBSCRIPTION_REQUIRED'
    else null
  end;

  return jsonb_build_object(
    'empresa_id', v_company.id,
    'verification_status', v_company.verification_status,
    'access_status', v_company.access_status,
    'subscription_status', v_subscription_status,
    'role', v_role,
    'can_open_operational_modules', public.has_company_access(p_empresa_id),
    'can_write', public.can_write_company(p_empresa_id),
    'can_admin_company', public.can_admin_company(p_empresa_id),
    'reason_code', v_reason_code,
    'limits', public.get_company_usage_limits(p_empresa_id),
    'features', jsonb_build_object(
      'assistente_ia', public.plan_feature_enabled(p_empresa_id, 'assistente_ia'),
      'vencimentos', public.plan_feature_enabled(p_empresa_id, 'vencimentos'),
      'documentos', public.plan_feature_enabled(p_empresa_id, 'documentos'),
      'equipamentos', public.plan_feature_enabled(p_empresa_id, 'equipamentos'),
      'calibracoes', public.plan_feature_enabled(p_empresa_id, 'calibracoes'),
      'qualificacoes', public.plan_feature_enabled(p_empresa_id, 'qualificacoes'),
      'manutencoes', public.plan_feature_enabled(p_empresa_id, 'manutencoes'),
      'pendencias', public.plan_feature_enabled(p_empresa_id, 'pendencias'),
      'alertas', public.plan_feature_enabled(p_empresa_id, 'alertas'),
      'relatorios', public.plan_feature_enabled(p_empresa_id, 'relatorios'),
      'auditoria', public.plan_feature_enabled(p_empresa_id, 'auditoria'),
      'usuarios', public.plan_feature_enabled(p_empresa_id, 'usuarios'),
      'anexos', public.plan_feature_enabled(p_empresa_id, 'anexos'),
      'multi_unidades', public.plan_feature_enabled(p_empresa_id, 'multi_unidades')
    )
  );
end $$;

-- Limites de criação passam a usar a fonte efetiva.
create or replace function public.validate_plan_record_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_current bigint;
  v_code text;
begin
  if tg_table_name = 'documentos' then
    perform public.assert_plan_feature(new.empresa_id, 'documentos');
    v_limit := public.effective_company_limit(new.empresa_id, 'max_documents');
    select count(*) into v_current
    from public.documentos
    where empresa_id = new.empresa_id and deleted_at is null;
  elsif tg_table_name = 'equipamentos' then
    perform public.assert_plan_feature(new.empresa_id, 'equipamentos');
    v_limit := public.effective_company_limit(new.empresa_id, 'max_equipment');
    select count(*) into v_current
    from public.equipamentos
    where empresa_id = new.empresa_id and deleted_at is null;
  end if;

  if v_limit is not null and v_current >= v_limit then
    select case when access_status = 'provisional'
      then 'PROVISIONAL_LIMIT_REACHED'
      else 'PLAN_LIMIT_REACHED'
    end into v_code
    from public.empresas where id = new.empresa_id;

    raise exception '%', v_code
      using errcode = 'P0001',
        detail = format('Limite atingido para %s.', tg_table_name);
  end if;

  return new;
end $$;

create or replace function public.validate_user_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_current bigint;
  v_code text;
begin
  if new.ativo and new.deleted_at is null then
    perform public.assert_plan_feature(new.empresa_id, 'usuarios');
    v_limit := public.effective_company_limit(new.empresa_id, 'max_users');

    select count(*) into v_current
    from public.usuarios_empresas ue
    where ue.empresa_id = new.empresa_id
      and ue.ativo
      and ue.deleted_at is null
      and (tg_op = 'INSERT' or ue.id <> new.id);

    if v_limit is not null and v_current >= v_limit then
      select case when access_status = 'provisional'
        then 'PROVISIONAL_LIMIT_REACHED'
        else 'PLAN_LIMIT_REACHED'
      end into v_code
      from public.empresas where id = new.empresa_id;

      raise exception '%', v_code
        using errcode = 'P0001', detail = 'Limite de usuários atingido.';
    end if;
  end if;

  return new;
end $$;

create or replace function public.validate_plan_feature_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_current bigint;
  v_code text;
begin
  if tg_table_name = 'calibracoes' then
    perform public.assert_plan_feature(new.empresa_id, 'calibracoes');
  elsif tg_table_name = 'qualificacoes' then
    perform public.assert_plan_feature(new.empresa_id, 'qualificacoes');
  elsif tg_table_name = 'manutencoes' then
    perform public.assert_plan_feature(new.empresa_id, 'manutencoes');
  elsif tg_table_name = 'pendencias' then
    perform public.assert_plan_feature(new.empresa_id, 'pendencias');

    if tg_op = 'INSERT' then
      v_limit := public.effective_company_limit(new.empresa_id, 'max_pending_tasks');
      select count(*) into v_current
      from public.pendencias
      where empresa_id = new.empresa_id
        and status in ('pendente', 'em_andamento')
        and deleted_at is null;

      if v_limit is not null and v_current >= v_limit then
        select case when access_status = 'provisional'
          then 'PROVISIONAL_LIMIT_REACHED'
          else 'PLAN_LIMIT_REACHED'
        end into v_code
        from public.empresas where id = new.empresa_id;

        raise exception '%', v_code
          using errcode = 'P0001', detail = 'Limite de pendências atingido.';
      end if;
    end if;
  elsif tg_table_name = 'alertas' then
    perform public.assert_plan_feature(new.empresa_id, 'alertas');
  elsif tg_table_name = 'anexos' then
    perform public.assert_plan_feature(new.empresa_id, 'anexos');
  end if;

  return new;
end $$;

create or replace function public.api_verificar_limite_storage(
  p_empresa_id uuid,
  p_novos_bytes bigint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit_mb integer;
  v_used_bytes bigint;
  v_limit_bytes bigint;
begin
  if not public.has_company_access(p_empresa_id)
    or not public.can_write_company(p_empresa_id)
  then
    raise exception 'COMPANY_ACCESS_RESTRICTED' using errcode = '42501';
  end if;

  if p_novos_bytes <= 0 or p_novos_bytes > 20971520 then
    raise exception 'INVALID_FILE_SIZE' using errcode = '22023';
  end if;

  v_limit_mb := public.effective_company_limit(p_empresa_id, 'max_storage_mb');

  select coalesce(sum(tamanho_bytes), 0)
  into v_used_bytes
  from public.anexos
  where empresa_id = p_empresa_id
    and status = 'ativo'
    and deleted_at is null;

  v_limit_bytes := case when v_limit_mb is null then null else v_limit_mb::bigint * 1024 * 1024 end;

  if v_limit_bytes is not null and v_used_bytes + p_novos_bytes > v_limit_bytes then
    raise exception '%', case when (
      select access_status = 'provisional' from public.empresas where id = p_empresa_id
    ) then 'PROVISIONAL_LIMIT_REACHED' else 'PLAN_LIMIT_REACHED' end
      using errcode = 'P0001', detail = 'Limite de armazenamento atingido.';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'used_bytes', v_used_bytes,
    'new_bytes', p_novos_bytes,
    'limit_bytes', v_limit_bytes
  );
end $$;

-- Contexto único consumido pelo frontend. Campos legados permanecem por compatibilidade.
create or replace function public.api_contexto_usuario()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida' using errcode = '28000';
  end if;

  select jsonb_build_object(
    'usuario', jsonb_build_object(
      'id', u.id,
      'nome', u.nome,
      'email', u.email,
      'cargo', u.cargo,
      'is_master', u.is_master,
      'status', u.status
    ),
    'empresas', coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id,
      'nome_fantasia', e.nome_fantasia,
      'razao_social', e.razao_social,
      'cnpj', e.cnpj,
      'status', e.status,
      'verification_status', e.verification_status,
      'access_status', e.access_status,
      'subscription_status', public.subscription_status_normalized(e.id),
      'perfil', case when u.is_master then 'master' else ue.perfil end,
      'plano', case when p.id is null then null else jsonb_build_object(
        'id', p.id,
        'nome', p.nome,
        'codigo', p.codigo,
        'recursos', p.recursos,
        'limite_usuarios', p.limite_usuarios,
        'limite_documentos', p.limite_documentos,
        'limite_equipamentos', p.limite_equipamentos,
        'limite_storage_mb', p.limite_storage_mb
      ) end
    ) order by e.nome_fantasia) filter (where e.id is not null), '[]'::jsonb)
  )
  into v_result
  from public.usuarios u
  left join public.empresas e
    on e.deleted_at is null
    and (
      u.is_master
      or exists (
        select 1
        from public.usuarios_empresas allowed
        where allowed.usuario_id = u.id
          and allowed.empresa_id = e.id
          and allowed.ativo
          and allowed.deleted_at is null
      )
    )
  left join public.planos p on p.id = e.plano_id and p.ativo
  left join public.usuarios_empresas ue
    on ue.usuario_id = u.id
    and ue.empresa_id = e.id
    and ue.ativo
    and ue.deleted_at is null
  where u.id = auth.uid()
    and u.deleted_at is null
  group by u.id;

  if v_result is null then
    raise exception 'Perfil não encontrado';
  end if;

  return v_result;
end $$;

-- Empresas restritas ainda precisam consultar assinatura e faturas para regularização.
drop policy if exists assinaturas_company_read on public.assinaturas_empresas;
create policy assinaturas_company_read
on public.assinaturas_empresas
for select to authenticated
using (public.has_company_membership(empresa_id));

drop policy if exists faturas_company_read on public.faturas;
create policy faturas_company_read
on public.faturas
for select to authenticated
using (public.has_company_membership(empresa_id));

revoke all on function public.subscription_status_normalized(uuid) from public, anon;
revoke all on function public.company_billing_allows_write(uuid) from public, anon;
revoke all on function public.plan_feature_enabled(uuid, text) from public, anon;
revoke all on function public.assert_plan_feature(uuid, text) from public, anon;
revoke all on function public.effective_company_limit(uuid, text) from public, anon;
revoke all on function public.company_access_flag(uuid, text) from public, anon;
revoke all on function public.get_company_usage_limits(uuid) from public, anon;
revoke all on function public.check_company_permission(uuid, text, text) from public, anon;
revoke all on function public.get_effective_company_permissions(uuid) from public, anon;
revoke all on function public.api_verificar_limite_storage(uuid, bigint) from public, anon;
revoke all on function public.api_contexto_usuario() from public, anon;

grant execute on function public.subscription_status_normalized(uuid) to authenticated;
grant execute on function public.company_billing_allows_write(uuid) to authenticated;
grant execute on function public.plan_feature_enabled(uuid, text) to authenticated;
grant execute on function public.get_company_usage_limits(uuid) to authenticated;
grant execute on function public.check_company_permission(uuid, text, text) to authenticated;
grant execute on function public.get_effective_company_permissions(uuid) to authenticated;
grant execute on function public.api_verificar_limite_storage(uuid, bigint) to authenticated;
grant execute on function public.api_contexto_usuario() to authenticated;
