-- Conform Flow — contratos complementares da multiunidade.
-- Fecha APIs que, por serem SECURITY DEFINER, precisam validar a unidade
-- explicitamente e não podem depender somente das policies das tabelas.

create or replace function public.get_company_usage_limits(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_documents bigint;
  v_equipment bigint;
  v_users bigint;
  v_units bigint;
  v_pending bigint;
  v_storage_bytes bigint;
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'COMPANY_ACCESS_REQUIRED' using errcode = '42501';
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

  select count(*) into v_units
  from public.unidades
  where empresa_id = p_empresa_id
    and deleted_at is null
    and status in ('ativa', 'inativa', 'em_implantacao');

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
    'max_units', public.effective_unit_limit(p_empresa_id),
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
      'units', v_units,
      'documents', v_documents,
      'equipment', v_equipment,
      'pending_tasks', v_pending,
      'storage_bytes', v_storage_bytes
    )
  );
end
$$;

create or replace function public.api_obter_acessos_usuarios_unidades(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.can_admin_company(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'usuario_id', ue.usuario_id,
        'acesso_todas_unidades', ue.acesso_todas_unidades,
        'unidade_principal_id', ue.unidade_principal_id,
        'unidade_ids', coalesce((
          select jsonb_agg(uu.unidade_id order by u.is_matriz desc, u.nome)
          from public.usuarios_unidades uu
          join public.unidades u on u.id = uu.unidade_id
          where uu.usuario_id = ue.usuario_id
            and uu.empresa_id = ue.empresa_id
            and uu.ativo
            and uu.deleted_at is null
        ), '[]'::jsonb)
      )
      order by ue.usuario_id
    )
    from public.usuarios_empresas ue
    where ue.empresa_id = p_empresa_id
      and ue.ativo
      and ue.deleted_at is null
  ), '[]'::jsonb);
end
$$;

create or replace function public.api_atualizar_usuario_empresa_multiunit(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_payload jsonb,
  p_acesso_todas_unidades boolean,
  p_unidade_ids uuid[] default '{}',
  p_unidade_principal_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_profile jsonb;
  v_units jsonb;
begin
  -- As duas alterações ficam na mesma transação: se a validação de unidade
  -- falhar, o perfil também não é parcialmente alterado.
  v_profile := public.api_atualizar_usuario_empresa(
    p_empresa_id,
    p_usuario_id,
    p_payload
  );
  v_units := public.api_salvar_acesso_usuario_unidades(
    p_empresa_id,
    p_usuario_id,
    p_acesso_todas_unidades,
    p_unidade_ids,
    p_unidade_principal_id
  );
  return jsonb_build_object('perfil', v_profile, 'unidades', v_units);
end
$$;

create or replace function public.api_atualizar_documento(
  p_empresa_id uuid,
  p_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_current public.documentos;
  v_saved public.documentos;
  v_scope text;
  v_unit uuid;
begin
  select * into v_current
  from public.documentos
  where id = p_id and empresa_id = p_empresa_id and deleted_at is null
  for update;

  if not found then raise exception 'DOCUMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.can_write_company(p_empresa_id)
    or (v_current.unidade_id is not null and not public.can_write_unit(p_empresa_id, v_current.unidade_id))
  then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_scope := case when p_payload ? 'escopo_documento'
    then coalesce(nullif(p_payload ->> 'escopo_documento', ''), 'corporativo')
    else v_current.escopo_documento end;
  v_unit := case
    when v_scope = 'corporativo' then null
    when p_payload ? 'unidade_id' then nullif(p_payload ->> 'unidade_id', '')::uuid
    else v_current.unidade_id
  end;

  if v_scope not in ('corporativo', 'unidade') then
    raise exception 'INVALID_DOCUMENT_SCOPE' using errcode = '23514';
  end if;
  if v_scope = 'unidade' and (v_unit is null or not public.can_write_unit(p_empresa_id, v_unit)) then
    raise exception 'UNIT_REQUIRED_OR_FORBIDDEN' using errcode = '42501';
  end if;

  update public.documentos d set
    nome = case when p_payload ? 'nome' then trim(p_payload ->> 'nome') else d.nome end,
    categoria_id = case when p_payload ? 'categoria_id' then nullif(p_payload ->> 'categoria_id', '')::uuid else d.categoria_id end,
    tipo_documento_id = case when p_payload ? 'tipo_documento_id' then nullif(p_payload ->> 'tipo_documento_id', '')::uuid else d.tipo_documento_id end,
    numero_documento = case when p_payload ? 'numero_documento' then nullif(p_payload ->> 'numero_documento', '') else d.numero_documento end,
    orgao_emissor = case when p_payload ? 'orgao_emissor' then nullif(p_payload ->> 'orgao_emissor', '') else d.orgao_emissor end,
    responsavel_id = case when p_payload ? 'responsavel_id' then nullif(p_payload ->> 'responsavel_id', '')::uuid else d.responsavel_id end,
    data_emissao = case when p_payload ? 'data_emissao' then nullif(p_payload ->> 'data_emissao', '')::date else d.data_emissao end,
    data_vencimento = case when p_payload ? 'data_vencimento' then nullif(p_payload ->> 'data_vencimento', '')::date else d.data_vencimento end,
    exige_anexo = case when p_payload ? 'exige_anexo' then (p_payload ->> 'exige_anexo')::boolean else d.exige_anexo end,
    setor_unidade = case when p_payload ? 'setor_unidade' then nullif(p_payload ->> 'setor_unidade', '') else d.setor_unidade end,
    observacoes = case when p_payload ? 'observacoes' then nullif(p_payload ->> 'observacoes', '') else d.observacoes end,
    escopo_documento = v_scope,
    unidade_id = v_unit
  where d.id = p_id and d.empresa_id = p_empresa_id
  returning * into v_saved;

  if nullif(v_saved.nome, '') is null then
    raise exception 'DOCUMENT_NAME_REQUIRED' using errcode = '23514';
  end if;
  return to_jsonb(v_saved);
end
$$;

create or replace function public.api_atualizar_equipamento(
  p_empresa_id uuid,
  p_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_saved public.equipamentos;
  v_unit uuid;
begin
  select unidade_id into v_unit
  from public.equipamentos
  where id = p_id and empresa_id = p_empresa_id and deleted_at is null
  for update;
  if v_unit is null then raise exception 'EQUIPMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.can_write_unit(p_empresa_id, v_unit) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.equipamentos e set
    nome = case when p_payload ? 'nome' then trim(p_payload ->> 'nome') else e.nome end,
    tipo_equipamento_id = case when p_payload ? 'tipo_equipamento_id' then nullif(p_payload ->> 'tipo_equipamento_id', '')::uuid else e.tipo_equipamento_id end,
    codigo_interno = case when p_payload ? 'codigo_interno' then nullif(p_payload ->> 'codigo_interno', '') else e.codigo_interno end,
    numero_serie = case when p_payload ? 'numero_serie' then nullif(p_payload ->> 'numero_serie', '') else e.numero_serie end,
    fabricante = case when p_payload ? 'fabricante' then nullif(p_payload ->> 'fabricante', '') else e.fabricante end,
    modelo = case when p_payload ? 'modelo' then nullif(p_payload ->> 'modelo', '') else e.modelo end,
    setor = case when p_payload ? 'setor' then nullif(p_payload ->> 'setor', '') else e.setor end,
    localizacao = case when p_payload ? 'localizacao' then nullif(p_payload ->> 'localizacao', '') else e.localizacao end,
    criticidade = case when p_payload ? 'criticidade' then p_payload ->> 'criticidade' else e.criticidade end,
    status = case when p_payload ? 'status' then p_payload ->> 'status' else e.status end,
    responsavel_id = case when p_payload ? 'responsavel_id' then nullif(p_payload ->> 'responsavel_id', '')::uuid else e.responsavel_id end,
    observacoes = case when p_payload ? 'observacoes' then nullif(p_payload ->> 'observacoes', '') else e.observacoes end
  where e.id = p_id and e.empresa_id = p_empresa_id
  returning * into v_saved;

  if nullif(v_saved.nome, '') is null then
    raise exception 'EQUIPMENT_NAME_REQUIRED' using errcode = '23514';
  end if;
  return to_jsonb(v_saved);
end
$$;

create or replace function public.assert_record_unit_write(
  p_empresa_id uuid,
  p_table_name text,
  p_record_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unit uuid;
begin
  case p_table_name
    when 'calibracoes' then
      select unidade_id into v_unit from public.calibracoes
      where id = p_record_id and empresa_id = p_empresa_id and deleted_at is null;
    when 'qualificacoes' then
      select unidade_id into v_unit from public.qualificacoes
      where id = p_record_id and empresa_id = p_empresa_id and deleted_at is null;
    when 'manutencoes' then
      select unidade_id into v_unit from public.manutencoes
      where id = p_record_id and empresa_id = p_empresa_id and deleted_at is null;
    else
      raise exception 'INVALID_RECORD_TYPE' using errcode = '22023';
  end case;

  if v_unit is null then raise exception 'RECORD_NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.can_write_unit(p_empresa_id, v_unit) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return v_unit;
end
$$;

create or replace function public.api_atualizar_calibracao(
  p_empresa_id uuid,
  p_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_saved public.calibracoes;
begin
  perform public.assert_record_unit_write(p_empresa_id, 'calibracoes', p_id);
  update public.calibracoes c set
    data_calibracao = case when p_payload ? 'data_calibracao' then (p_payload ->> 'data_calibracao')::date else c.data_calibracao end,
    data_vencimento = case when p_payload ? 'data_vencimento' then nullif(p_payload ->> 'data_vencimento', '')::date else c.data_vencimento end,
    numero_certificado = case when p_payload ? 'numero_certificado' then nullif(p_payload ->> 'numero_certificado', '') else c.numero_certificado end,
    laboratorio_responsavel = case when p_payload ? 'laboratorio_responsavel' then nullif(p_payload ->> 'laboratorio_responsavel', '') else c.laboratorio_responsavel end,
    resultado = case when p_payload ? 'resultado' then p_payload ->> 'resultado' else c.resultado end,
    responsavel_id = case when p_payload ? 'responsavel_id' then nullif(p_payload ->> 'responsavel_id', '')::uuid else c.responsavel_id end,
    observacoes = case when p_payload ? 'observacoes' then nullif(p_payload ->> 'observacoes', '') else c.observacoes end
  where c.id = p_id and c.empresa_id = p_empresa_id and c.deleted_at is null
  returning * into v_saved;
  return to_jsonb(v_saved);
end
$$;

create or replace function public.api_atualizar_qualificacao(
  p_empresa_id uuid,
  p_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_saved public.qualificacoes;
begin
  perform public.assert_record_unit_write(p_empresa_id, 'qualificacoes', p_id);
  update public.qualificacoes q set
    tipo = case when p_payload ? 'tipo' then p_payload ->> 'tipo' else q.tipo end,
    data_qualificacao = case when p_payload ? 'data_qualificacao' then (p_payload ->> 'data_qualificacao')::date else q.data_qualificacao end,
    data_vencimento = case when p_payload ? 'data_vencimento' then nullif(p_payload ->> 'data_vencimento', '')::date else q.data_vencimento end,
    resultado = case when p_payload ? 'resultado' then p_payload ->> 'resultado' else q.resultado end,
    responsavel_tecnico_id = case when p_payload ? 'responsavel_tecnico_id' then nullif(p_payload ->> 'responsavel_tecnico_id', '')::uuid else q.responsavel_tecnico_id end,
    empresa_executora = case when p_payload ? 'empresa_executora' then nullif(p_payload ->> 'empresa_executora', '') else q.empresa_executora end,
    observacoes = case when p_payload ? 'observacoes' then nullif(p_payload ->> 'observacoes', '') else q.observacoes end
  where q.id = p_id and q.empresa_id = p_empresa_id and q.deleted_at is null
  returning * into v_saved;
  return to_jsonb(v_saved);
end
$$;

create or replace function public.api_atualizar_manutencao(
  p_empresa_id uuid,
  p_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_saved public.manutencoes;
  v_current public.manutencoes;
  v_target_equipment uuid;
  v_target_unit uuid;
begin
  select * into v_current
  from public.manutencoes
  where id = p_id and empresa_id = p_empresa_id and deleted_at is null
  for update;
  if not found then raise exception 'MAINTENANCE_NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.can_write_unit(p_empresa_id, v_current.unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_target_equipment := case when p_payload ? 'equipamento_id'
    then nullif(p_payload ->> 'equipamento_id', '')::uuid
    else v_current.equipamento_id end;
  if v_target_equipment is not null then
    select unidade_id into v_target_unit
    from public.equipamentos
    where id = v_target_equipment and empresa_id = p_empresa_id and deleted_at is null;
    if v_target_unit is null or not public.can_write_unit(p_empresa_id, v_target_unit) then
      raise exception 'EQUIPMENT_UNIT_FORBIDDEN' using errcode = '42501';
    end if;
  else
    v_target_unit := case when p_payload ? 'unidade_id'
      then nullif(p_payload ->> 'unidade_id', '')::uuid
      else v_current.unidade_id end;
    if v_target_unit is null or not public.can_write_unit(p_empresa_id, v_target_unit) then
      raise exception 'UNIT_REQUIRED_OR_FORBIDDEN' using errcode = '42501';
    end if;
  end if;

  update public.manutencoes m set
    equipamento_id = v_target_equipment,
    unidade_id = v_target_unit,
    nome_servico = case when p_payload ? 'nome_servico' then nullif(p_payload ->> 'nome_servico', '') else m.nome_servico end,
    natureza = case when p_payload ? 'natureza' then p_payload ->> 'natureza' else m.natureza end,
    tipo_servico = case when p_payload ? 'tipo_servico' then p_payload ->> 'tipo_servico' else m.tipo_servico end,
    status_execucao = case when p_payload ? 'status_execucao' then p_payload ->> 'status_execucao' else m.status_execucao end,
    data_manutencao = case when p_payload ? 'data_manutencao' then (p_payload ->> 'data_manutencao')::date else m.data_manutencao end,
    proxima_manutencao = case when p_payload ? 'proxima_manutencao' then nullif(p_payload ->> 'proxima_manutencao', '')::date else m.proxima_manutencao end,
    periodicidade_meses = case when p_payload ? 'periodicidade_meses' then nullif(p_payload ->> 'periodicidade_meses', '')::integer else m.periodicidade_meses end,
    empresa_responsavel = case when p_payload ? 'empresa_responsavel' then nullif(p_payload ->> 'empresa_responsavel', '') else m.empresa_responsavel end,
    tecnico_responsavel = case when p_payload ? 'tecnico_responsavel' then nullif(p_payload ->> 'tecnico_responsavel', '') else m.tecnico_responsavel end,
    numero_ordem_servico = case when p_payload ? 'numero_ordem_servico' then nullif(p_payload ->> 'numero_ordem_servico', '') else m.numero_ordem_servico end,
    responsavel_interno_id = case when p_payload ? 'responsavel_interno_id' then nullif(p_payload ->> 'responsavel_interno_id', '')::uuid else m.responsavel_interno_id end,
    falha_apresentada = case when p_payload ? 'falha_apresentada' then nullif(p_payload ->> 'falha_apresentada', '') else m.falha_apresentada end,
    prioridade = case when p_payload ? 'prioridade' then nullif(p_payload ->> 'prioridade', '') else m.prioridade end,
    diagnostico = case when p_payload ? 'diagnostico' then nullif(p_payload ->> 'diagnostico', '') else m.diagnostico end,
    causa_raiz = case when p_payload ? 'causa_raiz' then nullif(p_payload ->> 'causa_raiz', '') else m.causa_raiz end,
    acao_realizada = case when p_payload ? 'acao_realizada' then nullif(p_payload ->> 'acao_realizada', '') else m.acao_realizada end,
    equipamento_parado_desde = case when p_payload ? 'equipamento_parado_desde' then nullif(p_payload ->> 'equipamento_parado_desde', '')::timestamptz else m.equipamento_parado_desde end,
    retorno_operacao_at = case when p_payload ? 'retorno_operacao_at' then nullif(p_payload ->> 'retorno_operacao_at', '')::timestamptz else m.retorno_operacao_at end,
    observacoes = case when p_payload ? 'observacoes' then nullif(p_payload ->> 'observacoes', '') else m.observacoes end
  where m.id = p_id and m.empresa_id = p_empresa_id
  returning * into v_saved;

  if v_saved.natureza = 'corretiva' and v_saved.equipamento_id is null then
    raise exception 'CORRECTIVE_MAINTENANCE_REQUIRES_EQUIPMENT' using errcode = '23514';
  end if;
  if v_saved.natureza = 'corretiva' and nullif(trim(v_saved.falha_apresentada), '') is null then
    raise exception 'FAILURE_DESCRIPTION_REQUIRED' using errcode = '23514';
  end if;
  return to_jsonb(v_saved);
end
$$;

create or replace function public.api_listar_relatorios_agendados_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if p_unidade_id is null and not public.can_use_consolidated_view(p_empresa_id) then
    raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
  elsif p_unidade_id is not null and not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'agendamentos', coalesce((
      select jsonb_agg(to_jsonb(r) || jsonb_build_object('unidade_nome', u.nome) order by r.nome)
      from public.relatorios_agendados r
      left join public.unidades u on u.id = r.unidade_id
      where r.empresa_id = p_empresa_id
        and (
          (p_unidade_id is null and (r.unidade_id is null or public.can_read_unit(p_empresa_id, r.unidade_id)))
          or r.unidade_id = p_unidade_id
        )
    ), '[]'::jsonb),
    'ultimas_execucoes', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from (
        select x.*
        from public.execucoes_relatorios_agendados x
        where x.empresa_id = p_empresa_id
          and (
            (p_unidade_id is null and (x.unidade_id is null or public.can_read_unit(p_empresa_id, x.unidade_id)))
            or x.unidade_id = p_unidade_id
          )
        order by x.created_at desc
        limit 20
      ) e
    ), '[]'::jsonb)
  );
end
$$;

create or replace function public.api_salvar_relatorio_agendado_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_saved public.relatorios_agendados;
  v_freq text;
  v_recipients text[];
begin
  if not public.has_company_permission(p_empresa_id, 'relatorios.agendar') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_unidade_id is null and not public.can_use_consolidated_view(p_empresa_id) then
    raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
  elsif p_unidade_id is not null and not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_freq := coalesce(nullif(p_payload ->> 'frequencia', ''), 'semanal');
  v_recipients := array(
    select lower(trim(x))
    from jsonb_array_elements_text(coalesce(p_payload -> 'destinatarios', '[]'::jsonb)) x
    where x like '%@%'
  );
  if coalesce(array_length(v_recipients, 1), 0) = 0 then
    raise exception 'REPORT_RECIPIENT_REQUIRED' using errcode = '23514';
  end if;

  insert into public.relatorios_agendados (
    id, empresa_id, unidade_id, nome, tipo_relatorio, frequencia, dia_semana,
    dia_mes, horario, timezone, destinatarios, filtros_json, ativo,
    proxima_execucao_at, created_by, updated_by
  )
  values (
    coalesce(nullif(p_payload ->> 'id', '')::uuid, gen_random_uuid()),
    p_empresa_id,
    p_unidade_id,
    trim(p_payload ->> 'nome'),
    coalesce(nullif(p_payload ->> 'tipo_relatorio', ''), 'executivo_ia'),
    v_freq,
    nullif(p_payload ->> 'dia_semana', '')::integer,
    nullif(p_payload ->> 'dia_mes', '')::integer,
    coalesce(nullif(p_payload ->> 'horario', '')::time, '08:00'::time),
    coalesce(nullif(p_payload ->> 'timezone', ''), 'America/Sao_Paulo'),
    v_recipients,
    coalesce(p_payload -> 'filtros', '{}'::jsonb),
    coalesce((p_payload ->> 'ativo')::boolean, true),
    case when v_freq = 'mensal' then now() + interval '1 month' else now() + interval '7 days' end,
    auth.uid(),
    auth.uid()
  )
  on conflict (id) do update set
    unidade_id = excluded.unidade_id,
    nome = excluded.nome,
    tipo_relatorio = excluded.tipo_relatorio,
    frequencia = excluded.frequencia,
    dia_semana = excluded.dia_semana,
    dia_mes = excluded.dia_mes,
    horario = excluded.horario,
    timezone = excluded.timezone,
    destinatarios = excluded.destinatarios,
    filtros_json = excluded.filtros_json,
    ativo = excluded.ativo,
    updated_by = auth.uid(),
    updated_at = now()
  where public.relatorios_agendados.empresa_id = p_empresa_id
    and (
      public.relatorios_agendados.unidade_id is null
      or public.can_read_unit(p_empresa_id, public.relatorios_agendados.unidade_id)
    )
  returning * into v_saved;

  if v_saved.id is null then
    raise exception 'REPORT_NOT_FOUND_OR_FORBIDDEN' using errcode = '42501';
  end if;
  return to_jsonb(v_saved);
end
$$;

create or replace function public.api_relatorio_executivo_ia_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_empresa public.empresas;
  v_unidade public.unidades;
  v_dashboard jsonb;
  v_matriz jsonb;
  v_onboarding jsonb;
  v_indice numeric;
  v_risco text;
  v_steps integer;
begin
  if p_unidade_id is null then
    if not public.can_use_consolidated_view(p_empresa_id) then
      raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
    end if;
    return public.api_relatorio_executivo_ia(p_empresa_id);
  end if;
  if not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform public.assert_plan_feature(p_empresa_id, 'relatorios');
  perform public.assert_plan_feature(p_empresa_id, 'assistente_ia');

  select * into v_empresa
  from public.empresas
  where id = p_empresa_id and deleted_at is null;
  select * into v_unidade
  from public.unidades
  where id = p_unidade_id and empresa_id = p_empresa_id and deleted_at is null;
  if v_empresa.id is null or v_unidade.id is null then
    raise exception 'UNIT_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_dashboard := public.api_dashboard_unidade(p_empresa_id, p_unidade_id);
  v_indice := coalesce((v_dashboard ->> 'conformidade_percentual')::numeric, 0);
  v_risco := case
    when v_indice >= 95 then 'baixo'
    when v_indice >= 85 then 'moderado'
    when v_indice >= 70 then 'alto'
    else 'crítico'
  end;

  select jsonb_build_object(
    'empresa', jsonb_build_object(
      'id', v_empresa.id,
      'nome', v_empresa.nome_fantasia,
      'unidade_id', v_unidade.id,
      'unidade', v_unidade.nome
    ),
    'chaves', jsonb_build_array('corporativo', v_unidade.codigo),
    'resumo', jsonb_build_object('exigidos', count(*), 'cadastrados', count(*)),
    'itens', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'nome', d.nome,
        'segmento_chave', case
          when d.unidade_id is null then 'Corporativo'
          else v_unidade.nome
        end,
        'status', d.status_calculado
      )
      order by d.data_vencimento nulls last, d.nome
    ), '[]'::jsonb)
  )
  into v_matriz
  from public.vw_documentos_status d
  where d.empresa_id = p_empresa_id
    and (d.unidade_id is null or d.unidade_id = p_unidade_id);

  v_steps :=
    (case when coalesce((v_dashboard -> 'documentos' ->> 'total')::integer, 0) > 0 then 1 else 0 end)
    + (case when coalesce((v_dashboard -> 'equipamentos' ->> 'total')::integer, 0) > 0 then 1 else 0 end)
    + (case when coalesce((v_dashboard -> 'manutencoes' ->> 'vencidas')::integer, 0)
      + coalesce((v_dashboard -> 'manutencoes' ->> 'a_vencer')::integer, 0) > 0 then 1 else 0 end)
    + (case when coalesce((v_dashboard -> 'pendencias' ->> 'abertas')::integer, 0) = 0 then 1 else 0 end);

  v_onboarding := jsonb_build_object(
    'progresso_percentual', round(v_steps * 25.0),
    'concluidos', v_steps,
    'total', 4,
    'itens', jsonb_build_array(
      jsonb_build_object(
        'id', 'documentos',
        'titulo', 'Documentos cadastrados',
        'descricao', 'Cadastre os documentos aplicáveis à unidade.',
        'concluido', coalesce((v_dashboard -> 'documentos' ->> 'total')::integer, 0) > 0
      ),
      jsonb_build_object(
        'id', 'equipamentos',
        'titulo', 'Equipamentos mapeados',
        'descricao', 'Mantenha o inventário operacional da unidade.',
        'concluido', coalesce((v_dashboard -> 'equipamentos' ->> 'total')::integer, 0) > 0
      ),
      jsonb_build_object(
        'id', 'manutencoes',
        'titulo', 'Rotina de manutenção',
        'descricao', 'Registre a programação de manutenção da unidade.',
        'concluido', coalesce((v_dashboard -> 'manutencoes' ->> 'vencidas')::integer, 0)
          + coalesce((v_dashboard -> 'manutencoes' ->> 'a_vencer')::integer, 0) > 0
      ),
      jsonb_build_object(
        'id', 'pendencias',
        'titulo', 'Pendências controladas',
        'descricao', 'Trate as pendências abertas da unidade.',
        'concluido', coalesce((v_dashboard -> 'pendencias' ->> 'abertas')::integer, 0) = 0
      )
    )
  );

  return jsonb_build_object(
    'empresa', jsonb_build_object(
      'id', v_empresa.id,
      'razao_social', v_empresa.razao_social,
      'nome_fantasia', v_empresa.nome_fantasia,
      'cnpj', v_empresa.cnpj,
      'tipo_estabelecimento', v_empresa.tipo_estabelecimento,
      'segmento', v_empresa.segmento
    ),
    'unidade', jsonb_build_object(
      'id', v_unidade.id,
      'codigo', v_unidade.codigo,
      'nome', v_unidade.nome
    ),
    'gerado_em', now(),
    'politica_ia', jsonb_build_object(
      'tipo', 'IA estruturada segura',
      'leu_anexos', false,
      'fonte', 'dados estruturados da unidade selecionada e documentos corporativos'
    ),
    'resumo', jsonb_build_object(
      'indice_conformidade', v_indice,
      'risco_operacional', v_risco,
      'documentos_vencidos', coalesce((v_dashboard -> 'documentos' ->> 'vencidos')::integer, 0),
      'vencendo_30_dias', coalesce((v_dashboard -> 'documentos' ->> 'a_vencer_30')::integer, 0),
      'equipamentos_atencao', coalesce((v_dashboard -> 'equipamentos' ->> 'atencao')::integer, 0),
      'manutencoes_vencidas', coalesce((v_dashboard -> 'manutencoes' ->> 'vencidas')::integer, 0),
      'pendencias_abertas', coalesce((v_dashboard -> 'pendencias' ->> 'abertas')::integer, 0),
      'onboarding_percentual', round(v_steps * 25.0),
      'matriz_exigidos', coalesce((v_matriz -> 'resumo' ->> 'exigidos')::integer, 0),
      'matriz_cadastrados', coalesce((v_matriz -> 'resumo' ->> 'cadastrados')::integer, 0)
    ),
    'analise_ia', jsonb_build_array(
      format('A análise considera a unidade %s e os documentos corporativos aplicáveis.', v_unidade.nome),
      case
        when v_indice >= 95 then 'A unidade apresenta boa maturidade operacional. Mantenha a rotina de acompanhamento.'
        when v_indice >= 85 then 'A unidade está estável, mas possui itens que merecem acompanhamento preventivo.'
        else 'A unidade precisa de um plano de ação priorizando vencidos, pendências e responsáveis.'
      end,
      'Nenhum anexo, PDF ou imagem confidencial foi lido.'
    ),
    'recomendacoes', jsonb_build_array(
      'Priorize registros vencidos antes dos itens apenas a vencer.',
      'Atribua responsáveis e prazos às pendências abertas.',
      'Revise mensalmente o inventário e as evidências da unidade.'
    ),
    'itens_criticos', coalesce(v_dashboard -> 'pendencias_criticas', '[]'::jsonb),
    'matriz_documental', v_matriz,
    'onboarding', v_onboarding
  );
end
$$;

create or replace function public.api_master_resumo_multiunidade()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_master() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'resumo', jsonb_build_object(
      'empresas_com_multiunidade', (
        select count(*)
        from (
          select u.empresa_id
          from public.unidades u
          where u.deleted_at is null and u.status <> 'arquivada'
          group by u.empresa_id
          having count(*) > 1
        ) multi
      ),
      'unidades_ativas', (
        select count(*) from public.unidades
        where deleted_at is null and status = 'ativa'
      ),
      'unidades_em_implantacao', (
        select count(*) from public.unidades
        where deleted_at is null and status = 'em_implantacao'
      )
    ),
    'empresas', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'empresa_id', e.id,
          'empresa', e.nome_fantasia,
          'tipo_conta', e.tipo_conta,
          'unidades_utilizadas', counts.utilizadas,
          'unidades_ativas', counts.ativas,
          'limite_unidades', public.effective_unit_limit(e.id),
          'em_excesso', counts.utilizadas > public.effective_unit_limit(e.id)
        )
        order by counts.utilizadas desc, e.nome_fantasia
      )
      from public.empresas e
      cross join lateral (
        select
          count(*) filter (where u.status in ('ativa', 'inativa', 'em_implantacao'))::integer utilizadas,
          count(*) filter (where u.status = 'ativa')::integer ativas
        from public.unidades u
        where u.empresa_id = e.id and u.deleted_at is null
      ) counts
      where e.deleted_at is null
    ), '[]'::jsonb)
  );
end
$$;

revoke all on function public.get_company_usage_limits(uuid) from public, anon;
revoke all on function public.api_obter_acessos_usuarios_unidades(uuid) from public, anon;
revoke all on function public.api_atualizar_usuario_empresa_multiunit(uuid, uuid, jsonb, boolean, uuid[], uuid) from public, anon;
revoke all on function public.assert_record_unit_write(uuid, text, uuid) from public, anon;
revoke all on function public.api_atualizar_documento(uuid, uuid, jsonb) from public, anon;
revoke all on function public.api_atualizar_equipamento(uuid, uuid, jsonb) from public, anon;
revoke all on function public.api_atualizar_calibracao(uuid, uuid, jsonb) from public, anon;
revoke all on function public.api_atualizar_qualificacao(uuid, uuid, jsonb) from public, anon;
revoke all on function public.api_atualizar_manutencao(uuid, uuid, jsonb) from public, anon;
revoke all on function public.api_listar_relatorios_agendados_unidade(uuid, uuid) from public, anon;
revoke all on function public.api_salvar_relatorio_agendado_unidade(uuid, uuid, jsonb) from public, anon;
revoke all on function public.api_relatorio_executivo_ia_unidade(uuid, uuid) from public, anon;
revoke all on function public.api_master_resumo_multiunidade() from public, anon;

grant execute on function public.get_company_usage_limits(uuid) to authenticated, service_role;
grant execute on function public.api_obter_acessos_usuarios_unidades(uuid) to authenticated;
grant execute on function public.api_atualizar_usuario_empresa_multiunit(uuid, uuid, jsonb, boolean, uuid[], uuid) to authenticated;
grant execute on function public.assert_record_unit_write(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.api_atualizar_documento(uuid, uuid, jsonb) to authenticated;
grant execute on function public.api_atualizar_equipamento(uuid, uuid, jsonb) to authenticated;
grant execute on function public.api_atualizar_calibracao(uuid, uuid, jsonb) to authenticated;
grant execute on function public.api_atualizar_qualificacao(uuid, uuid, jsonb) to authenticated;
grant execute on function public.api_atualizar_manutencao(uuid, uuid, jsonb) to authenticated;
grant execute on function public.api_listar_relatorios_agendados_unidade(uuid, uuid) to authenticated;
grant execute on function public.api_salvar_relatorio_agendado_unidade(uuid, uuid, jsonb) to authenticated;
grant execute on function public.api_relatorio_executivo_ia_unidade(uuid, uuid) to authenticated;
grant execute on function public.api_master_resumo_multiunidade() to authenticated;
