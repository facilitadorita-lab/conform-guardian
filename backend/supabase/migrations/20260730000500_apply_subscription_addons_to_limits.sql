-- Conform Flow - limites efetivos dos add-ons.
-- Usuários e unidades extras só devem liberar capacidade depois que a
-- assinatura ativa correspondente estiver registrada no backend.

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
  -- A função é usada por triggers/jobs internos, mas também possui EXECUTE
  -- para authenticated. Evite que um usuário consulte limites de outro tenant.
  if auth.role() = 'authenticated'
    and not public.has_company_access(p_empresa_id)
  then
    raise exception 'COMPANY_ACCESS_REQUIRED' using errcode = '42501';
  end if;

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

  -- Limites personalizados e provisórios são soberanos. Add-ons só somam
  -- quando a empresa está usando o catálogo de um plano contratado.
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
    select c.*
    into v_config
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
    when 'max_users' then coalesce(p.limite_usuarios, 0) + coalesce(a.usuarios_extras, 0)
    when 'max_units' then case
      when coalesce(p.limite_unidades, nullif(p.recursos ->> 'limite_unidades', '')::integer) is null
        then null
      else coalesce(p.limite_unidades, nullif(p.recursos ->> 'limite_unidades', '')::integer)
        + coalesce(a.unidades_extras, 0)
    end
    when 'max_documents' then p.limite_documentos
    when 'max_equipment' then p.limite_equipamentos
    when 'max_pending_tasks' then nullif(p.recursos ->> 'limite_pendencias', '')::integer
    when 'max_storage_mb' then p.limite_storage_mb
    when 'max_reports' then nullif(p.recursos ->> 'limite_relatorios', '')::integer
  end
  into v_value
  from public.empresas e
  join public.planos p on p.id = e.plano_id
  left join public.assinaturas_empresas a
    on a.empresa_id = e.id
   and a.deleted_at is null
   and a.status in ('trial', 'ativa', 'pagamento_pendente')
  where e.id = p_empresa_id
    and e.deleted_at is null;

  return v_value;
end;
$$;

revoke all on function public.effective_company_limit(uuid, text) from public, anon;
grant execute on function public.effective_company_limit(uuid, text) to authenticated, service_role;
