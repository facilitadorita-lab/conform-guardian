-- Conform Flow — máquina de estados e operações seguras de verificação.

create or replace function public.verification_transition_allowed(
  p_previous text,
  p_next text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_previous = p_next then true
    when p_previous = 'email_confirmation_pending' and p_next = 'pending_review' then true
    when p_previous = 'pending_review' and p_next in (
      'additional_information_required',
      'verified',
      'rejected'
    ) then true
    when p_previous = 'additional_information_required' and p_next in (
      'pending_review',
      'rejected'
    ) then true
    when p_previous = 'verified' and p_next = 'reverification_required' then true
    when p_previous = 'reverification_required' and p_next in (
      'additional_information_required',
      'verified',
      'rejected'
    ) then true
    else false
  end
$$;

create or replace function public.append_company_verification_event(
  p_empresa_id uuid,
  p_solicitacao_id uuid,
  p_event_type text,
  p_previous_status text,
  p_new_status text,
  p_performed_by_type text,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.eventos_verificacao_empresa(
    empresa_id,
    solicitacao_verificacao_id,
    event_type,
    previous_status,
    new_status,
    performed_by,
    performed_by_type,
    message,
    metadata_json
  )
  values (
    p_empresa_id,
    p_solicitacao_id,
    p_event_type,
    p_previous_status,
    p_new_status,
    auth.uid(),
    p_performed_by_type,
    nullif(trim(p_message), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end $$;

create or replace function public.create_deduplicated_notification(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_audience text,
  p_tipo text,
  p_titulo text,
  p_mensagem text,
  p_action_url text,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notificacoes(
    empresa_id,
    usuario_id,
    audience,
    tipo,
    titulo,
    mensagem,
    action_url,
    dedupe_key
  )
  values (
    p_empresa_id,
    p_usuario_id,
    p_audience,
    p_tipo,
    p_titulo,
    p_mensagem,
    p_action_url,
    p_dedupe_key
  )
  on conflict do nothing;
end $$;

-- Chamado no primeiro login após a confirmação do e-mail.
create or replace function public.api_conceder_acesso_provisorio(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_company public.empresas;
  v_request public.solicitacoes_verificacao_empresa;
  v_config public.configuracoes_limites_provisorios;
  v_email_confirmed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid()
      and ue.empresa_id = p_empresa_id
      and ue.perfil = 'administrador_provisorio'
      and ue.ativo
      and ue.deleted_at is null
  ) then
    raise exception 'VERIFICATION_ACTION_NOT_ALLOWED' using errcode = '42501';
  end if;

  select au.email_confirmed_at
  into v_email_confirmed_at
  from auth.users au
  where au.id = auth.uid();

  if v_email_confirmed_at is null then
    raise exception 'EMAIL_CONFIRMATION_REQUIRED' using errcode = '42501';
  end if;

  select * into v_company
  from public.empresas
  where id = p_empresa_id and deleted_at is null
  for update;

  if v_company.id is null then
    raise exception 'Empresa não encontrada';
  end if;

  select * into v_request
  from public.solicitacoes_verificacao_empresa
  where empresa_id = p_empresa_id
  order by created_at desc
  limit 1
  for update;

  if v_request.id is null then
    raise exception 'Solicitação de verificação não encontrada';
  end if;

  if v_company.verification_status = 'pending_review'
    and v_company.access_status = 'provisional'
  then
    return public.get_effective_company_permissions(p_empresa_id);
  end if;

  if not public.verification_transition_allowed(
    v_company.verification_status,
    'pending_review'
  ) then
    raise exception 'VERIFICATION_ACTION_NOT_ALLOWED' using errcode = '42501';
  end if;

  select * into v_config
  from public.configuracoes_limites_provisorios
  where id;

  update public.empresas
  set
    verification_status = 'pending_review',
    access_status = 'provisional',
    status = 'ativa',
    provisional_started_at = coalesce(provisional_started_at, now()),
    provisional_expires_at = coalesce(
      provisional_expires_at,
      now() + make_interval(days => v_config.trial_days)
    ),
    updated_at = now()
  where id = p_empresa_id;

  update public.solicitacoes_verificacao_empresa
  set
    status = 'pending_review',
    submitted_at = coalesce(submitted_at, now()),
    updated_at = now()
  where id = v_request.id;

  insert into public.limites_acesso_empresa(
    empresa_id,
    source_type,
    max_users,
    max_units,
    max_documents,
    max_equipment,
    max_pending_tasks,
    max_storage_mb,
    max_reports,
    allow_exports,
    allow_integrations,
    allow_bulk_import
  )
  select
    p_empresa_id,
    'provisional',
    v_config.max_users,
    v_config.max_units,
    v_config.max_documents,
    v_config.max_equipment,
    v_config.max_pending_tasks,
    v_config.max_storage_mb,
    v_config.max_reports,
    v_config.allow_exports,
    v_config.allow_integrations,
    v_config.allow_bulk_import
  where not exists (
    select 1
    from public.limites_acesso_empresa l
    where l.empresa_id = p_empresa_id
      and l.source_type = 'provisional'
      and l.effective_until is null
  );

  perform public.append_company_verification_event(
    p_empresa_id,
    v_request.id,
    'email_confirmed',
    'email_confirmation_pending',
    'pending_review',
    'user',
    'E-mail confirmado pelo responsável da solicitação.'
  );

  perform public.append_company_verification_event(
    p_empresa_id,
    v_request.id,
    'provisional_access_granted',
    'blocked',
    'provisional',
    'system',
    'Ambiente provisório liberado após a confirmação do e-mail.'
  );

  perform public.create_deduplicated_notification(
    p_empresa_id,
    auth.uid(),
    'user',
    'provisional_access_granted',
    'Seu ambiente provisório está disponível',
    'Você já pode configurar informações iniciais enquanto analisamos o cadastro da empresa.',
    '/verificacao-empresa',
    'provisional-access:' || v_request.id::text
  );

  perform public.create_deduplicated_notification(
    p_empresa_id,
    null,
    'master',
    'company_pending_review',
    'Nova empresa aguardando análise',
    v_company.nome_fantasia || ' enviou uma solicitação de verificação.',
    '/master/verificacoes-empresas/' || v_request.id::text,
    'verification-pending:' || v_request.id::text
  );

  insert into public.logs_auditoria(
    empresa_id,
    usuario_id,
    modulo,
    acao,
    registro_id,
    novo_valor
  )
  values (
    p_empresa_id,
    auth.uid(),
    'verificacao_empresa',
    'acesso_provisorio_liberado',
    v_request.id,
    jsonb_build_object(
      'verification_status', 'pending_review',
      'access_status', 'provisional'
    )
  );

  return public.get_effective_company_permissions(p_empresa_id);
end $$;

create or replace function public.api_status_verificacao_empresa(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.has_company_membership(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'empresa', jsonb_build_object(
      'id', e.id,
      'nome', e.nome_fantasia,
      'cnpj_mascarado', left(e.cnpj_normalizado, 2) || '.***.***/****-' || right(e.cnpj_normalizado, 2),
      'situacao_cadastral', e.status_cadastral,
      'verification_status', e.verification_status,
      'access_status', e.access_status,
      'subscription_status', public.subscription_status_normalized(e.id),
      'provisional_started_at', e.provisional_started_at,
      'provisional_expires_at', e.provisional_expires_at
    ),
    'solicitacao', (
      select to_jsonb(r) - array[
        'solicitante_documento',
        'idempotency_key',
        'review_notes',
        'analista_responsavel_id',
        'reviewed_by'
      ]
      from public.solicitacoes_verificacao_empresa r
      where r.empresa_id = e.id
      order by r.created_at desc
      limit 1
    ),
    'evidencias', (
      select coalesce(jsonb_agg(
        to_jsonb(ev) - 'file_path'
        order by ev.uploaded_at desc
      ), '[]'::jsonb)
      from public.evidencias_verificacao_empresa ev
      where ev.empresa_id = e.id
    ),
    'eventos', (
      select coalesce(jsonb_agg(to_jsonb(evt) order by evt.created_at), '[]'::jsonb)
      from public.eventos_verificacao_empresa evt
      where evt.empresa_id = e.id
        and (
          public.is_master()
          or evt.event_type <> 'internal_note_added'
        )
    ),
    'acesso_efetivo', public.get_effective_company_permissions(e.id)
  )
  into v_result
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null;

  return v_result;
end $$;

create or replace function public.api_master_fila_verificacoes(
  p_filtros jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce((p_filtros ->> 'limit')::integer, 50), 1), 100);
  v_offset integer := greatest(coalesce((p_filtros ->> 'offset')::integer, 0), 0);
  v_result jsonb;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  with filtered as (
    select
      r.id,
      r.empresa_id,
      e.razao_social,
      e.nome_fantasia,
      e.cnpj,
      e.segmento,
      e.status_cadastral,
      r.solicitante_nome,
      r.solicitante_email,
      r.solicitante_cargo,
      r.status,
      r.nivel_risco,
      r.submitted_at,
      r.created_at,
      r.analista_responsavel_id,
      analyst.nome analista_nome
    from public.solicitacoes_verificacao_empresa r
    join public.empresas e on e.id = r.empresa_id and e.deleted_at is null
    left join public.usuarios analyst on analyst.id = r.analista_responsavel_id
    where (nullif(p_filtros ->> 'status', '') is null or r.status = p_filtros ->> 'status')
      and (nullif(p_filtros ->> 'risco', '') is null or r.nivel_risco = p_filtros ->> 'risco')
      and (nullif(p_filtros ->> 'analista_id', '') is null or r.analista_responsavel_id = (p_filtros ->> 'analista_id')::uuid)
      and (nullif(p_filtros ->> 'data_inicio', '') is null or r.created_at::date >= (p_filtros ->> 'data_inicio')::date)
      and (nullif(p_filtros ->> 'data_fim', '') is null or r.created_at::date <= (p_filtros ->> 'data_fim')::date)
      and (
        nullif(p_filtros ->> 'busca', '') is null
        or e.razao_social ilike '%' || (p_filtros ->> 'busca') || '%'
        or e.nome_fantasia ilike '%' || (p_filtros ->> 'busca') || '%'
        or e.cnpj_normalizado = public.normalize_cnpj(p_filtros ->> 'busca')
        or r.solicitante_nome ilike '%' || (p_filtros ->> 'busca') || '%'
        or r.solicitante_email ilike '%' || (p_filtros ->> 'busca') || '%'
      )
  ), page as (
    select *
    from filtered
    order by
      case status
        when 'pending_review' then 0
        when 'additional_information_required' then 1
        when 'reverification_required' then 2
        else 3
      end,
      coalesce(submitted_at, created_at)
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'indicators', jsonb_build_object(
      'pending_review', (
        select count(*) from public.solicitacoes_verificacao_empresa where status = 'pending_review'
      ),
      'additional_information_required', (
        select count(*) from public.solicitacoes_verificacao_empresa where status = 'additional_information_required'
      ),
      'verified', (
        select count(*) from public.solicitacoes_verificacao_empresa where status = 'verified'
      ),
      'rejected', (
        select count(*) from public.solicitacoes_verificacao_empresa where status = 'rejected'
      ),
      'average_review_hours', (
        select round(avg(extract(epoch from (reviewed_at - submitted_at)) / 3600)::numeric, 1)
        from public.solicitacoes_verificacao_empresa
        where reviewed_at is not null and submitted_at is not null
      )
    ),
    'items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'limit', v_limit,
    'offset', v_offset
  ) into v_result;

  return v_result;
end $$;

create or replace function public.api_master_detalhe_verificacao(p_solicitacao_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_result jsonb;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  select empresa_id into v_empresa_id
  from public.solicitacoes_verificacao_empresa
  where id = p_solicitacao_id;

  if v_empresa_id is null then
    raise exception 'Solicitação não encontrada';
  end if;

  select jsonb_build_object(
    'empresa', to_jsonb(e),
    'solicitacao', to_jsonb(r) - 'idempotency_key',
    'evidencias', (
      select coalesce(jsonb_agg(
        to_jsonb(ev) - 'file_path'
        order by ev.uploaded_at desc
      ), '[]'::jsonb)
      from public.evidencias_verificacao_empresa ev
      where ev.solicitacao_verificacao_id = r.id
    ),
    'historico', (
      select coalesce(jsonb_agg(to_jsonb(evt) order by evt.created_at), '[]'::jsonb)
      from public.eventos_verificacao_empresa evt
      where evt.solicitacao_verificacao_id = r.id
    ),
    'ambiente_provisorio', public.get_company_usage_limits(e.id),
    'atividades_recentes', (
      select coalesce(jsonb_agg(to_jsonb(logs) order by logs.created_at desc), '[]'::jsonb)
      from (
        select id, usuario_id, modulo, acao, registro_id, created_at
        from public.logs_auditoria
        where empresa_id = e.id
        order by created_at desc
        limit 50
      ) logs
    )
  )
  into v_result
  from public.solicitacoes_verificacao_empresa r
  join public.empresas e on e.id = r.empresa_id
  where r.id = p_solicitacao_id;

  return v_result;
end $$;

create or replace function public.api_master_assumir_verificacao(p_solicitacao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.solicitacoes_verificacao_empresa;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  update public.solicitacoes_verificacao_empresa
  set analista_responsavel_id = auth.uid(), updated_at = now()
  where id = p_solicitacao_id
    and status in ('pending_review', 'additional_information_required', 'reverification_required')
    and (analista_responsavel_id is null or analista_responsavel_id = auth.uid())
  returning * into v_request;

  if v_request.id is null then
    raise exception 'Solicitação indisponível para assumir.' using errcode = 'P0001';
  end if;

  perform public.append_company_verification_event(
    v_request.empresa_id,
    v_request.id,
    'analyst_assigned',
    v_request.status,
    v_request.status,
    'master',
    'Análise assumida pelo Admin Master.'
  );

  return to_jsonb(v_request);
end $$;

create or replace function public.api_master_solicitar_informacoes_verificacao(
  p_solicitacao_id uuid,
  p_message text,
  p_items jsonb default '[]'::jsonb,
  p_due_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.solicitacoes_verificacao_empresa;
  v_previous text;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  if nullif(trim(p_message), '') is null then
    raise exception 'Informe o que precisa ser enviado.' using errcode = '22023';
  end if;

  select * into v_request
  from public.solicitacoes_verificacao_empresa
  where id = p_solicitacao_id
  for update;

  if v_request.id is null
    or not public.verification_transition_allowed(
      v_request.status,
      'additional_information_required'
    )
  then
    raise exception 'VERIFICATION_ACTION_NOT_ALLOWED' using errcode = '42501';
  end if;

  v_previous := v_request.status;

  update public.solicitacoes_verificacao_empresa
  set
    status = 'additional_information_required',
    additional_information_message = trim(p_message),
    additional_information_items = coalesce(p_items, '[]'::jsonb),
    additional_information_due_at = p_due_at,
    analista_responsavel_id = coalesce(analista_responsavel_id, auth.uid()),
    updated_at = now()
  where id = v_request.id
  returning * into v_request;

  update public.empresas
  set verification_status = 'additional_information_required', updated_at = now()
  where id = v_request.empresa_id;

  perform public.append_company_verification_event(
    v_request.empresa_id,
    v_request.id,
    'information_requested',
    v_previous,
    'additional_information_required',
    'master',
    p_message,
    jsonb_build_object('items', coalesce(p_items, '[]'::jsonb), 'due_at', p_due_at)
  );

  perform public.create_deduplicated_notification(
    v_request.empresa_id,
    v_request.solicitante_usuario_id,
    'user',
    'verification_information_required',
    'Precisamos de informações adicionais',
    trim(p_message),
    '/verificacao-empresa',
    'verification-info-request:' || v_request.id::text || ':' || v_request.updated_at::text
  );

  insert into public.logs_auditoria(
    empresa_id, usuario_id, modulo, acao, registro_id, novo_valor
  ) values (
    v_request.empresa_id,
    auth.uid(),
    'verificacao_empresa',
    'informacoes_solicitadas',
    v_request.id,
    jsonb_build_object('message', trim(p_message), 'items', coalesce(p_items, '[]'::jsonb))
  );

  return to_jsonb(v_request);
end $$;

create or replace function public.api_enviar_informacoes_verificacao(
  p_solicitacao_id uuid,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.solicitacoes_verificacao_empresa;
begin
  select * into v_request
  from public.solicitacoes_verificacao_empresa
  where id = p_solicitacao_id
  for update;

  if v_request.id is null
    or v_request.solicitante_usuario_id <> auth.uid()
    or v_request.status <> 'additional_information_required'
  then
    raise exception 'VERIFICATION_ACTION_NOT_ALLOWED' using errcode = '42501';
  end if;

  update public.solicitacoes_verificacao_empresa
  set
    status = 'pending_review',
    resubmitted_at = now(),
    updated_at = now()
  where id = v_request.id
  returning * into v_request;

  update public.empresas
  set verification_status = 'pending_review', updated_at = now()
  where id = v_request.empresa_id;

  perform public.append_company_verification_event(
    v_request.empresa_id,
    v_request.id,
    'information_submitted',
    'additional_information_required',
    'pending_review',
    'user',
    p_comment
  );

  perform public.create_deduplicated_notification(
    v_request.empresa_id,
    null,
    'master',
    'verification_information_submitted',
    'Informações adicionais recebidas',
    'O responsável respondeu à solicitação de informações.',
    '/master/verificacoes-empresas/' || v_request.id::text,
    'verification-info-submitted:' || v_request.id::text || ':' || v_request.resubmitted_at::text
  );

  return to_jsonb(v_request);
end $$;

create or replace function public.api_master_aprovar_empresa(
  p_solicitacao_id uuid,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.solicitacoes_verificacao_empresa;
  v_company public.empresas;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  select * into v_request
  from public.solicitacoes_verificacao_empresa
  where id = p_solicitacao_id
  for update;

  if v_request.id is null then
    raise exception 'Solicitação não encontrada';
  end if;

  if v_request.status = 'verified' then
    return public.get_effective_company_permissions(v_request.empresa_id);
  end if;

  if not public.verification_transition_allowed(v_request.status, 'verified') then
    raise exception 'VERIFICATION_ACTION_NOT_ALLOWED' using errcode = '42501';
  end if;

  select * into v_company
  from public.empresas
  where id = v_request.empresa_id
  for update;

  update public.solicitacoes_verificacao_empresa
  set
    status = 'verified',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    analista_responsavel_id = coalesce(analista_responsavel_id, auth.uid()),
    review_notes = nullif(trim(p_review_notes), ''),
    updated_at = now()
  where id = v_request.id;

  update public.empresas
  set
    verification_status = 'verified',
    access_status = case
      when public.subscription_status_normalized(id) in ('past_due', 'canceled', 'expired') then 'restricted'
      else 'active'
    end,
    status = case
      when public.subscription_status_normalized(id) in ('past_due', 'canceled', 'expired') then 'bloqueada'
      else 'ativa'
    end,
    verified_at = now(),
    verified_by = auth.uid(),
    verification_method = 'manual_admin_review',
    updated_at = now()
  where id = v_request.empresa_id;

  update public.usuarios_empresas
  set perfil = 'administrador', updated_at = now()
  where empresa_id = v_request.empresa_id
    and usuario_id = v_request.solicitante_usuario_id
    and perfil = 'administrador_provisorio'
    and ativo
    and deleted_at is null;

  update public.limites_acesso_empresa
  set effective_until = now(), updated_at = now()
  where empresa_id = v_request.empresa_id
    and source_type = 'provisional'
    and effective_until is null;

  perform public.append_company_verification_event(
    v_request.empresa_id,
    v_request.id,
    'request_approved',
    v_request.status,
    'verified',
    'master',
    p_review_notes
  );

  perform public.create_deduplicated_notification(
    v_request.empresa_id,
    v_request.solicitante_usuario_id,
    'user',
    'company_verified',
    'Empresa verificada com sucesso',
    'Os recursos disponíveis no plano contratado já estão liberados.',
    '/dashboard',
    'company-verified:' || v_request.id::text
  );

  insert into public.logs_auditoria(
    empresa_id,
    usuario_id,
    modulo,
    acao,
    registro_id,
    valor_anterior,
    novo_valor
  ) values (
    v_request.empresa_id,
    auth.uid(),
    'verificacao_empresa',
    'empresa_aprovada',
    v_request.id,
    jsonb_build_object(
      'verification_status', v_company.verification_status,
      'access_status', v_company.access_status
    ),
    jsonb_build_object(
      'verification_status', 'verified',
      'access_status', 'active'
    )
  );

  return public.get_effective_company_permissions(v_request.empresa_id);
end $$;

create or replace function public.api_master_rejeitar_empresa(
  p_solicitacao_id uuid,
  p_category text,
  p_reason text,
  p_review_notes text default null,
  p_block_access boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.solicitacoes_verificacao_empresa;
  v_previous_access text;
  v_new_access text;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  if p_category not in (
    'cnpj_invalido',
    'empresa_inativa',
    'duplicidade',
    'responsavel_nao_autorizado',
    'informacoes_inconsistentes',
    'suspeita_fraude',
    'documentos_insuficientes',
    'solicitacao_cancelada',
    'outro'
  ) or nullif(trim(p_reason), '') is null then
    raise exception 'Informe categoria e motivo válidos.' using errcode = '22023';
  end if;

  select * into v_request
  from public.solicitacoes_verificacao_empresa
  where id = p_solicitacao_id
  for update;

  if v_request.id is null
    or not public.verification_transition_allowed(v_request.status, 'rejected')
  then
    raise exception 'VERIFICATION_ACTION_NOT_ALLOWED' using errcode = '42501';
  end if;

  select access_status into v_previous_access
  from public.empresas
  where id = v_request.empresa_id
  for update;

  v_new_access := case when p_block_access then 'blocked' else 'restricted' end;

  update public.solicitacoes_verificacao_empresa
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    analista_responsavel_id = coalesce(analista_responsavel_id, auth.uid()),
    rejection_category = p_category,
    rejection_reason = trim(p_reason),
    review_notes = nullif(trim(p_review_notes), ''),
    updated_at = now()
  where id = v_request.id;

  update public.empresas
  set
    verification_status = 'rejected',
    access_status = v_new_access,
    status = 'bloqueada',
    updated_at = now()
  where id = v_request.empresa_id;

  perform public.append_company_verification_event(
    v_request.empresa_id,
    v_request.id,
    'request_rejected',
    v_request.status,
    'rejected',
    'master',
    p_reason,
    jsonb_build_object('category', p_category)
  );

  perform public.append_company_verification_event(
    v_request.empresa_id,
    v_request.id,
    case when p_block_access then 'access_blocked' else 'access_restricted' end,
    v_previous_access,
    v_new_access,
    'master',
    'Acesso atualizado após a decisão da verificação.'
  );

  perform public.create_deduplicated_notification(
    v_request.empresa_id,
    v_request.solicitante_usuario_id,
    'user',
    'company_verification_rejected',
    'Atualização sobre o cadastro da sua empresa',
    trim(p_reason),
    '/verificacao-empresa',
    'company-rejected:' || v_request.id::text
  );

  insert into public.logs_auditoria(
    empresa_id, usuario_id, modulo, acao, registro_id, novo_valor
  ) values (
    v_request.empresa_id,
    auth.uid(),
    'verificacao_empresa',
    'empresa_rejeitada',
    v_request.id,
    jsonb_build_object(
      'category', p_category,
      'access_status', v_new_access
    )
  );

  return jsonb_build_object(
    'verification_status', 'rejected',
    'access_status', v_new_access
  );
end $$;

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
    raise exception 'Status e motivo são obrigatórios.' using errcode = '22023';
  end if;

  select * into v_company
  from public.empresas
  where id = p_empresa_id and deleted_at is null
  for update;

  if v_company.id is null then
    raise exception 'Empresa não encontrada';
  end if;

  if p_access_status = 'active'
    and v_company.verification_status <> 'verified'
  then
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
    jsonb_build_object('access_status', p_access_status, 'reason', trim(p_reason))
  );

  return jsonb_build_object(
    'empresa_id', p_empresa_id,
    'access_status', p_access_status
  );
end $$;

create or replace function public.api_solicitar_acesso_empresa_existente(
  p_cnpj text,
  p_message text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_user public.usuarios;
begin
  if auth.uid() is null or nullif(trim(p_idempotency_key), '') is null then
    raise exception 'Sessão ou chave de idempotência inválida.' using errcode = '28000';
  end if;

  select * into v_user
  from public.usuarios
  where id = auth.uid() and status = 'ativo' and deleted_at is null;

  select id into v_empresa_id
  from public.empresas
  where cnpj_normalizado = public.normalize_cnpj(p_cnpj)
    and deleted_at is null;

  -- Resposta intencionalmente genérica para evitar enumeração de empresas.
  if v_empresa_id is null then
    return jsonb_build_object(
      'received', true,
      'message', 'Se a empresa estiver cadastrada, a solicitação será encaminhada para análise.'
    );
  end if;

  if exists (
    select 1 from public.usuarios_empresas
    where usuario_id = auth.uid()
      and empresa_id = v_empresa_id
      and ativo
      and deleted_at is null
  ) then
    return jsonb_build_object(
      'received', true,
      'message', 'Se a empresa estiver cadastrada, a solicitação será encaminhada para análise.'
    );
  end if;

  insert into public.solicitacoes_acesso_empresa(
    empresa_id,
    solicitante_usuario_id,
    solicitante_nome,
    solicitante_email,
    solicitante_telefone,
    solicitante_cargo,
    message,
    idempotency_key
  ) values (
    v_empresa_id,
    v_user.id,
    v_user.nome,
    v_user.email,
    v_user.telefone,
    v_user.cargo,
    nullif(trim(p_message), ''),
    trim(p_idempotency_key)
  )
  on conflict do nothing;

  return jsonb_build_object(
    'received', true,
    'message', 'Se a empresa estiver cadastrada, a solicitação será encaminhada para análise.'
  );
end $$;

create or replace function public.api_master_salvar_limites_provisorios(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.configuracoes_limites_provisorios;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  update public.configuracoes_limites_provisorios
  set
    max_users = coalesce((p_payload ->> 'max_users')::integer, max_users),
    max_units = coalesce((p_payload ->> 'max_units')::integer, max_units),
    max_documents = coalesce((p_payload ->> 'max_documents')::integer, max_documents),
    max_equipment = coalesce((p_payload ->> 'max_equipment')::integer, max_equipment),
    max_pending_tasks = coalesce((p_payload ->> 'max_pending_tasks')::integer, max_pending_tasks),
    max_storage_mb = coalesce((p_payload ->> 'max_storage_mb')::integer, max_storage_mb),
    max_reports = coalesce((p_payload ->> 'max_reports')::integer, max_reports),
    trial_days = coalesce((p_payload ->> 'trial_days')::integer, trial_days),
    allow_exports = coalesce((p_payload ->> 'allow_exports')::boolean, allow_exports),
    allow_integrations = coalesce((p_payload ->> 'allow_integrations')::boolean, allow_integrations),
    allow_bulk_import = coalesce((p_payload ->> 'allow_bulk_import')::boolean, allow_bulk_import),
    updated_at = now(),
    updated_by = auth.uid()
  where id
  returning * into v_result;

  insert into public.logs_auditoria(
    usuario_id, modulo, acao, novo_valor
  ) values (
    auth.uid(),
    'verificacao_empresa',
    'limites_provisorios_atualizados',
    to_jsonb(v_result) - 'updated_by'
  );

  return to_jsonb(v_result);
end $$;

create or replace function public.api_marcar_notificacao_lida(p_notificacao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notificacoes
  set lida_at = coalesce(lida_at, now())
  where id = p_notificacao_id
    and usuario_id = auth.uid();
end $$;

revoke all on function public.append_company_verification_event(uuid, uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.create_deduplicated_notification(uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.api_conceder_acesso_provisorio(uuid) from public, anon;
revoke all on function public.api_status_verificacao_empresa(uuid) from public, anon;
revoke all on function public.api_master_fila_verificacoes(jsonb) from public, anon;
revoke all on function public.api_master_detalhe_verificacao(uuid) from public, anon;
revoke all on function public.api_master_assumir_verificacao(uuid) from public, anon;
revoke all on function public.api_master_solicitar_informacoes_verificacao(uuid, text, jsonb, timestamptz) from public, anon;
revoke all on function public.api_enviar_informacoes_verificacao(uuid, text) from public, anon;
revoke all on function public.api_master_aprovar_empresa(uuid, text) from public, anon;
revoke all on function public.api_master_rejeitar_empresa(uuid, text, text, text, boolean) from public, anon;
revoke all on function public.api_master_alterar_acesso_empresa(uuid, text, text) from public, anon;
revoke all on function public.api_solicitar_acesso_empresa_existente(text, text, text) from public, anon;
revoke all on function public.api_master_salvar_limites_provisorios(jsonb) from public, anon;
revoke all on function public.api_marcar_notificacao_lida(uuid) from public, anon;

grant execute on function public.api_conceder_acesso_provisorio(uuid) to authenticated;
grant execute on function public.api_status_verificacao_empresa(uuid) to authenticated;
grant execute on function public.api_master_fila_verificacoes(jsonb) to authenticated;
grant execute on function public.api_master_detalhe_verificacao(uuid) to authenticated;
grant execute on function public.api_master_assumir_verificacao(uuid) to authenticated;
grant execute on function public.api_master_solicitar_informacoes_verificacao(uuid, text, jsonb, timestamptz) to authenticated;
grant execute on function public.api_enviar_informacoes_verificacao(uuid, text) to authenticated;
grant execute on function public.api_master_aprovar_empresa(uuid, text) to authenticated;
grant execute on function public.api_master_rejeitar_empresa(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.api_master_alterar_acesso_empresa(uuid, text, text) to authenticated;
grant execute on function public.api_solicitar_acesso_empresa_existente(text, text, text) to authenticated;
grant execute on function public.api_master_salvar_limites_provisorios(jsonb) to authenticated;
grant execute on function public.api_marcar_notificacao_lida(uuid) to authenticated;
