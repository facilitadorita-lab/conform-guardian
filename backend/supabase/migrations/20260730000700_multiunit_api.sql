-- Conform Flow — API controlada e consultas com escopo de unidade.

create or replace function public.unit_scope_allows(
  p_empresa_id uuid,
  p_record_unidade_id uuid,
  p_selected_unidade_id uuid,
  p_include_corporate boolean default true
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select case
    when p_selected_unidade_id is null then
      public.can_use_consolidated_view(p_empresa_id)
      and (
        p_record_unidade_id is null
        or public.can_read_unit(p_empresa_id, p_record_unidade_id)
      )
    else
      public.can_read_unit(p_empresa_id, p_selected_unidade_id)
      and (
        p_record_unidade_id = p_selected_unidade_id
        or (p_include_corporate and p_record_unidade_id is null)
      )
  end
$$;

create or replace function public.api_listar_unidades(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'items',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', u.id,
          'empresa_id', u.empresa_id,
          'codigo', u.codigo,
          'nome', u.nome,
          'tipo', u.tipo,
          'descricao', u.descricao,
          'cnpj', u.cnpj,
          'telefone', u.telefone,
          'email', u.email,
          'responsavel_id', u.responsavel_id,
          'endereco', u.endereco,
          'numero', u.numero,
          'complemento', u.complemento,
          'bairro', u.bairro,
          'cidade', u.cidade,
          'estado', u.estado,
          'cep', u.cep,
          'timezone', u.timezone,
          'is_matriz', u.is_matriz,
          'status', u.status,
          'observacoes', u.observacoes,
          'created_at', u.created_at,
          'updated_at', u.updated_at,
          'usuarios', (
            select count(*)
            from public.usuarios_unidades uu
            where uu.unidade_id = u.id
              and uu.ativo
              and uu.deleted_at is null
          ),
          'documentos', (
            select count(*)
            from public.documentos d
            where d.unidade_id = u.id and d.deleted_at is null
          ),
          'equipamentos', (
            select count(*)
            from public.equipamentos e
            where e.unidade_id = u.id and e.deleted_at is null
          )
        )
        order by u.is_matriz desc, u.nome
      )
      from public.unidades u
      where u.empresa_id = p_empresa_id
        and u.deleted_at is null
        and public.can_read_unit(p_empresa_id, u.id)
    ), '[]'::jsonb),
    'pode_visualizar_consolidado', public.can_use_consolidated_view(p_empresa_id),
    'pode_administrar', public.can_admin_company(p_empresa_id),
    'limites', jsonb_build_object(
      'utilizadas', public.active_company_unit_count(p_empresa_id),
      'limite', public.effective_unit_limit(p_empresa_id),
      'disponiveis', greatest(
        public.effective_unit_limit(p_empresa_id)
          - public.active_company_unit_count(p_empresa_id),
        0
      ),
      'em_excesso',
        public.active_company_unit_count(p_empresa_id)
          > public.effective_unit_limit(p_empresa_id),
      'multiunidade_habilitada',
        public.plan_feature_enabled(p_empresa_id, 'multi_unidades')
    )
  );
end
$$;

create or replace function public.api_obter_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select to_jsonb(u)
  into v_result
  from public.unidades u
  where u.id = p_unidade_id
    and u.empresa_id = p_empresa_id
    and u.deleted_at is null;

  if v_result is null then
    raise exception 'UNIT_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_result;
end
$$;

create or replace function public.api_criar_unidade(
  p_empresa_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unit public.unidades;
begin
  if not public.can_admin_company(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not public.plan_feature_enabled(p_empresa_id, 'multi_unidades') then
    raise exception 'MULTIUNIT_NOT_AVAILABLE'
      using errcode = '42501',
        detail = 'A criação de unidades adicionais exige o recurso multiunidade.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_empresa_id::text, 93471));

  if public.active_company_unit_count(p_empresa_id)
    >= public.effective_unit_limit(p_empresa_id)
  then
    raise exception 'UNIT_LIMIT_REACHED'
      using errcode = 'P0001',
        detail = format(
          'A empresa utiliza %s de %s unidades contratadas.',
          public.active_company_unit_count(p_empresa_id),
          public.effective_unit_limit(p_empresa_id)
        );
  end if;

  insert into public.unidades (
    empresa_id,
    codigo,
    nome,
    tipo,
    descricao,
    cnpj,
    telefone,
    email,
    responsavel_id,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    timezone,
    is_matriz,
    status,
    observacoes
  )
  values (
    p_empresa_id,
    upper(btrim(p_payload ->> 'codigo')),
    btrim(p_payload ->> 'nome'),
    nullif(btrim(p_payload ->> 'tipo'), ''),
    nullif(btrim(p_payload ->> 'descricao'), ''),
    nullif(regexp_replace(p_payload ->> 'cnpj', '\D', '', 'g'), ''),
    nullif(btrim(p_payload ->> 'telefone'), ''),
    nullif(lower(btrim(p_payload ->> 'email')), ''),
    nullif(p_payload ->> 'responsavel_id', '')::uuid,
    nullif(btrim(p_payload ->> 'endereco'), ''),
    nullif(btrim(p_payload ->> 'numero'), ''),
    nullif(btrim(p_payload ->> 'complemento'), ''),
    nullif(btrim(p_payload ->> 'bairro'), ''),
    nullif(btrim(p_payload ->> 'cidade'), ''),
    nullif(upper(btrim(p_payload ->> 'estado')), ''),
    nullif(regexp_replace(p_payload ->> 'cep', '\D', '', 'g'), ''),
    coalesce(nullif(btrim(p_payload ->> 'timezone'), ''), 'America/Sao_Paulo'),
    false,
    coalesce(nullif(p_payload ->> 'status', ''), 'em_implantacao'),
    nullif(btrim(p_payload ->> 'observacoes'), '')
  )
  returning * into v_unit;

  return to_jsonb(v_unit);
end
$$;

create or replace function public.api_atualizar_unidade(
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
  v_unit public.unidades;
begin
  if not public.can_admin_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.unidades u
  set
    codigo = case
      when p_payload ? 'codigo' then upper(btrim(p_payload ->> 'codigo'))
      else u.codigo
    end,
    nome = case
      when p_payload ? 'nome' then btrim(p_payload ->> 'nome')
      else u.nome
    end,
    tipo = case
      when p_payload ? 'tipo' then nullif(btrim(p_payload ->> 'tipo'), '')
      else u.tipo
    end,
    descricao = case
      when p_payload ? 'descricao' then nullif(btrim(p_payload ->> 'descricao'), '')
      else u.descricao
    end,
    cnpj = case
      when p_payload ? 'cnpj'
        then nullif(regexp_replace(p_payload ->> 'cnpj', '\D', '', 'g'), '')
      else u.cnpj
    end,
    telefone = case
      when p_payload ? 'telefone' then nullif(btrim(p_payload ->> 'telefone'), '')
      else u.telefone
    end,
    email = case
      when p_payload ? 'email' then nullif(lower(btrim(p_payload ->> 'email')), '')
      else u.email
    end,
    responsavel_id = case
      when p_payload ? 'responsavel_id'
        then nullif(p_payload ->> 'responsavel_id', '')::uuid
      else u.responsavel_id
    end,
    endereco = case
      when p_payload ? 'endereco' then nullif(btrim(p_payload ->> 'endereco'), '')
      else u.endereco
    end,
    numero = case
      when p_payload ? 'numero' then nullif(btrim(p_payload ->> 'numero'), '')
      else u.numero
    end,
    complemento = case
      when p_payload ? 'complemento' then nullif(btrim(p_payload ->> 'complemento'), '')
      else u.complemento
    end,
    bairro = case
      when p_payload ? 'bairro' then nullif(btrim(p_payload ->> 'bairro'), '')
      else u.bairro
    end,
    cidade = case
      when p_payload ? 'cidade' then nullif(btrim(p_payload ->> 'cidade'), '')
      else u.cidade
    end,
    estado = case
      when p_payload ? 'estado' then nullif(upper(btrim(p_payload ->> 'estado')), '')
      else u.estado
    end,
    cep = case
      when p_payload ? 'cep'
        then nullif(regexp_replace(p_payload ->> 'cep', '\D', '', 'g'), '')
      else u.cep
    end,
    timezone = case
      when p_payload ? 'timezone' then btrim(p_payload ->> 'timezone')
      else u.timezone
    end,
    observacoes = case
      when p_payload ? 'observacoes' then nullif(btrim(p_payload ->> 'observacoes'), '')
      else u.observacoes
    end
  where u.id = p_unidade_id
    and u.empresa_id = p_empresa_id
    and u.deleted_at is null
  returning * into v_unit;

  if v_unit.id is null then
    raise exception 'UNIT_NOT_FOUND' using errcode = 'P0002';
  end if;

  return to_jsonb(v_unit);
end
$$;

create or replace function public.api_alterar_status_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid,
  p_status text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unit public.unidades;
begin
  if not public.can_admin_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_status not in ('ativa', 'inativa', 'em_implantacao', 'arquivada') then
    raise exception 'INVALID_UNIT_STATUS' using errcode = '22023';
  end if;

  select * into v_unit
  from public.unidades
  where id = p_unidade_id and empresa_id = p_empresa_id and deleted_at is null
  for update;

  if not found then
    raise exception 'UNIT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_unit.is_matriz and p_status in ('inativa', 'arquivada') then
    raise exception 'MATRIX_UNIT_MUST_REMAIN_ACTIVE'
      using errcode = '23514',
        detail = 'Defina outra matriz antes de inativar ou arquivar esta unidade.';
  end if;

  update public.unidades
  set
    status = p_status,
    observacoes = case
      when nullif(btrim(p_motivo), '') is null then observacoes
      else concat_ws(E'\n', observacoes, format('[%s] %s: %s', now(), p_status, p_motivo))
    end
  where id = p_unidade_id
  returning * into v_unit;

  return to_jsonb(v_unit);
end
$$;

create or replace function public.api_definir_unidade_matriz(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unit public.unidades;
begin
  if not public.can_admin_company(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_empresa_id::text, 93472));

  select * into v_unit
  from public.unidades
  where id = p_unidade_id
    and empresa_id = p_empresa_id
    and deleted_at is null
    and status in ('ativa', 'em_implantacao')
  for update;

  if not found then
    raise exception 'UNIT_NOT_AVAILABLE_FOR_MATRIX' using errcode = '23514';
  end if;

  update public.unidades
  set is_matriz = false
  where empresa_id = p_empresa_id
    and is_matriz
    and id <> p_unidade_id
    and deleted_at is null;

  update public.unidades
  set is_matriz = true
  where id = p_unidade_id
  returning * into v_unit;

  insert into public.logs_auditoria(
    empresa_id, unidade_id, usuario_id, modulo, acao, registro_id, novo_valor
  )
  values (
    p_empresa_id,
    p_unidade_id,
    auth.uid(),
    'unidades',
    'definir_matriz',
    p_unidade_id,
    jsonb_build_object('is_matriz', true)
  );

  return to_jsonb(v_unit);
end
$$;

create or replace function public.api_salvar_acesso_usuario_unidades(
  p_empresa_id uuid,
  p_usuario_id uuid,
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
  v_unidade_id uuid;
begin
  if not public.can_admin_company(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresas ue
    where ue.usuario_id = p_usuario_id
      and ue.empresa_id = p_empresa_id
      and ue.ativo
      and ue.deleted_at is null
  ) then
    raise exception 'USER_COMPANY_MEMBERSHIP_REQUIRED' using errcode = '23503';
  end if;

  if not p_acesso_todas_unidades and cardinality(p_unidade_ids) = 0 then
    raise exception 'AT_LEAST_ONE_UNIT_REQUIRED' using errcode = '23514';
  end if;

  if p_unidade_principal_id is not null
    and (
      not public.unit_belongs_to_company(p_empresa_id, p_unidade_principal_id)
      or (
        not p_acesso_todas_unidades
        and not (p_unidade_principal_id = any(p_unidade_ids))
      )
    )
  then
    raise exception 'INVALID_PRIMARY_UNIT' using errcode = '23514';
  end if;

  foreach v_unidade_id in array coalesce(p_unidade_ids, '{}') loop
    if not public.unit_belongs_to_company(p_empresa_id, v_unidade_id) then
      raise exception 'UNIT_COMPANY_MISMATCH' using errcode = '23514';
    end if;
  end loop;

  update public.usuarios_empresas
  set
    acesso_todas_unidades = p_acesso_todas_unidades,
    unidade_principal_id = p_unidade_principal_id,
    updated_at = now()
  where usuario_id = p_usuario_id
    and empresa_id = p_empresa_id
    and deleted_at is null;

  update public.usuarios_unidades
  set ativo = false, principal = false, deleted_at = now(), updated_at = now()
  where usuario_id = p_usuario_id
    and empresa_id = p_empresa_id
    and deleted_at is null;

  if not p_acesso_todas_unidades then
    foreach v_unidade_id in array p_unidade_ids loop
      insert into public.usuarios_unidades (
        empresa_id,
        unidade_id,
        usuario_id,
        ativo,
        principal
      )
      values (
        p_empresa_id,
        v_unidade_id,
        p_usuario_id,
        true,
        v_unidade_id = p_unidade_principal_id
      )
      on conflict (usuario_id, unidade_id)
      do update set
        empresa_id = excluded.empresa_id,
        ativo = true,
        principal = excluded.principal,
        deleted_at = null,
        updated_at = now(),
        updated_by = auth.uid();
    end loop;
  end if;

  insert into public.logs_auditoria(
    empresa_id, unidade_id, usuario_id, modulo, acao, registro_id, novo_valor
  )
  values (
    p_empresa_id,
    p_unidade_principal_id,
    auth.uid(),
    'usuarios_unidades',
    'alterar_acesso_unidades',
    p_usuario_id,
    jsonb_build_object(
      'acesso_todas_unidades', p_acesso_todas_unidades,
      'unidade_ids', coalesce(to_jsonb(p_unidade_ids), '[]'::jsonb),
      'unidade_principal_id', p_unidade_principal_id
    )
  );

  return jsonb_build_object(
    'usuario_id', p_usuario_id,
    'empresa_id', p_empresa_id,
    'acesso_todas_unidades', p_acesso_todas_unidades,
    'unidade_ids', coalesce(to_jsonb(p_unidade_ids), '[]'::jsonb),
    'unidade_principal_id', p_unidade_principal_id
  );
end
$$;

create or replace function public.api_transferir_equipamento_unidade(
  p_empresa_id uuid,
  p_equipamento_id uuid,
  p_unidade_destino_id uuid,
  p_motivo text,
  p_responsavel_id uuid default null,
  p_data_transferencia timestamptz default now(),
  p_observacoes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_equipamento public.equipamentos;
  v_transferencia public.transferencias_unidades;
begin
  select * into v_equipamento
  from public.equipamentos
  where id = p_equipamento_id
    and empresa_id = p_empresa_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'EQUIPMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.can_write_unit(p_empresa_id, v_equipamento.unidade_id)
    or not public.can_write_unit(p_empresa_id, p_unidade_destino_id)
  then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_equipamento.unidade_id = p_unidade_destino_id then
    raise exception 'EQUIPMENT_ALREADY_IN_UNIT' using errcode = '23514';
  end if;
  if nullif(btrim(p_motivo), '') is null then
    raise exception 'TRANSFER_REASON_REQUIRED' using errcode = '23514';
  end if;

  insert into public.transferencias_unidades (
    empresa_id,
    equipamento_id,
    unidade_origem_id,
    unidade_destino_id,
    motivo,
    responsavel_id,
    data_transferencia,
    observacoes,
    created_by
  )
  values (
    p_empresa_id,
    p_equipamento_id,
    v_equipamento.unidade_id,
    p_unidade_destino_id,
    btrim(p_motivo),
    p_responsavel_id,
    coalesce(p_data_transferencia, now()),
    nullif(btrim(p_observacoes), ''),
    auth.uid()
  )
  returning * into v_transferencia;

  update public.equipamentos
  set unidade_id = p_unidade_destino_id
  where id = p_equipamento_id;

  insert into public.logs_auditoria(
    empresa_id,
    unidade_id,
    usuario_id,
    modulo,
    acao,
    registro_id,
    valor_anterior,
    novo_valor
  )
  values (
    p_empresa_id,
    p_unidade_destino_id,
    auth.uid(),
    'equipamentos',
    'transferencia_unidade',
    p_equipamento_id,
    jsonb_build_object('unidade_id', v_equipamento.unidade_id),
    jsonb_build_object(
      'unidade_id', p_unidade_destino_id,
      'motivo', btrim(p_motivo),
      'transferencia_id', v_transferencia.id
    )
  );

  return to_jsonb(v_transferencia);
end
$$;

create or replace function public.api_dashboard_unidade(
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
  v_result jsonb;
begin
  if p_unidade_id is null then
    if not public.can_use_consolidated_view(p_empresa_id) then
      raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
    end if;
  elsif not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'escopo', case
      when p_unidade_id is null then 'consolidado'
      else 'unidade'
    end,
    'unidade_id', p_unidade_id,
    'documentos', jsonb_build_object(
      'total', count(*),
      'em_dia', count(*) filter(where d.status_calculado = 'em_dia'),
      'vencidos', count(*) filter(where d.status_calculado = 'vencido'),
      'criticos', count(*) filter(where d.status_calculado in ('vence_hoje', 'critico')),
      'a_vencer_30', count(*) filter(
        where d.status_calculado in ('vence_hoje', 'critico', 'a_vencer')
      ),
      'pendentes_anexo', count(*) filter(where d.status_calculado = 'pendente_anexo')
    ),
    'equipamentos', (
      select jsonb_build_object(
        'total', count(*),
        'conformes', count(*) filter(where e.status_consolidado = 'em_dia'),
        'atencao', count(*) filter(where e.status_consolidado <> 'em_dia')
      )
      from public.vw_equipamentos_conformidade e
      where e.empresa_id = p_empresa_id
        and public.unit_scope_allows(
          p_empresa_id, e.unidade_id, p_unidade_id, false
        )
    ),
    'manutencoes', (
      select jsonb_build_object(
        'vencidas', count(*) filter(where m.status_calculado = 'vencido'),
        'a_vencer', count(*) filter(
          where m.status_calculado in ('vence_hoje', 'critico', 'a_vencer')
        )
      )
      from public.vw_manutencoes_status m
      where m.empresa_id = p_empresa_id
        and public.unit_scope_allows(
          p_empresa_id, m.unidade_id, p_unidade_id, false
        )
    ),
    'pendencias', (
      select jsonb_build_object(
        'abertas', count(*) filter(where p.status in ('pendente', 'em_andamento')),
        'sem_responsavel', count(*) filter(
          where p.responsavel_id is null
            and p.status in ('pendente', 'em_andamento')
        )
      )
      from public.pendencias p
      where p.empresa_id = p_empresa_id
        and p.deleted_at is null
        and public.unit_scope_allows(
          p_empresa_id, p.unidade_id, p_unidade_id, true
        )
    ),
    'conformidade_percentual',
      case
        when count(*) = 0 then 100
        else round(
          100.0 * count(*) filter(
            where d.status_calculado in ('em_dia', 'sem_validade')
          ) / count(*),
          1
        )
      end,
    'por_unidade', case
      when p_unidade_id is not null then '[]'::jsonb
      else coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'unidade_id', u.id,
            'unidade', u.nome,
            'documentos_total', (
              select count(*) from public.documentos dx
              where dx.unidade_id = u.id and dx.deleted_at is null
            ),
            'documentos_vencidos', (
              select count(*) from public.vw_documentos_status dx
              where dx.unidade_id = u.id and dx.status_calculado = 'vencido'
            ),
            'equipamentos_atencao', (
              select count(*) from public.vw_equipamentos_conformidade ex
              where ex.unidade_id = u.id and ex.status_consolidado <> 'em_dia'
            ),
            'pendencias_abertas', (
              select count(*) from public.pendencias px
              where px.unidade_id = u.id
                and px.status in ('pendente', 'em_andamento')
                and px.deleted_at is null
            )
          )
          order by u.is_matriz desc, u.nome
        )
        from public.unidades u
        where u.empresa_id = p_empresa_id
          and u.deleted_at is null
          and public.can_read_unit(p_empresa_id, u.id)
      ), '[]'::jsonb)
    end,
    'pendencias_criticas', coalesce((
      select jsonb_agg(x.item order by x.prazo nulls last)
      from (
        select
          jsonb_build_object(
            'id', p.id,
            'modulo', p.modulo,
            'registro_id', p.registro_id,
            'titulo', p.titulo,
            'prazo', p.prazo,
            'status', p.status,
            'responsavel_id', p.responsavel_id,
            'unidade_id', p.unidade_id,
            'unidade', u.nome
          ) item,
          p.prazo
        from public.pendencias p
        left join public.unidades u on u.id = p.unidade_id
        where p.empresa_id = p_empresa_id
          and p.deleted_at is null
          and p.status in ('pendente', 'em_andamento')
          and public.unit_scope_allows(
            p_empresa_id, p.unidade_id, p_unidade_id, true
          )
        order by p.prazo nulls last
        limit 8
      ) x
    ), '[]'::jsonb)
  )
  into v_result
  from public.vw_documentos_status d
  where d.empresa_id = p_empresa_id
    and public.unit_scope_allows(
      p_empresa_id, d.unidade_id, p_unidade_id, true
    );

  return v_result;
end
$$;

create or replace function public.api_listar_documentos_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid default null,
  p_busca text default null,
  p_status text default null,
  p_limite integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.assert_plan_feature(p_empresa_id, 'documentos');
  if p_unidade_id is null and not public.can_use_consolidated_view(p_empresa_id) then
    raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
  elsif p_unidade_id is not null and not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  p_limite := least(greatest(p_limite, 1), 100);
  p_offset := greatest(p_offset, 0);

  with filtered as (
    select d.*, u.nome unidade_nome, u.codigo unidade_codigo
    from public.vw_documentos_status d
    left join public.unidades u on u.id = d.unidade_id
    where d.empresa_id = p_empresa_id
      and public.unit_scope_allows(
        p_empresa_id, d.unidade_id, p_unidade_id, true
      )
      and (
        p_busca is null
        or d.nome ilike '%' || p_busca || '%'
        or coalesce(d.numero_documento, '') ilike '%' || p_busca || '%'
      )
      and (p_status is null or d.status_calculado = p_status)
  ),
  page as (
    select * from filtered
    order by data_vencimento nulls last, nome
    limit p_limite offset p_offset
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'limit', p_limite,
    'offset', p_offset
  )
  into v_result;

  return v_result;
end
$$;

create or replace function public.api_listar_equipamentos_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid default null,
  p_busca text default null,
  p_status text default null,
  p_limite integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.assert_plan_feature(p_empresa_id, 'equipamentos');
  if p_unidade_id is null and not public.can_use_consolidated_view(p_empresa_id) then
    raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
  elsif p_unidade_id is not null and not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  p_limite := least(greatest(p_limite, 1), 100);
  p_offset := greatest(p_offset, 0);

  with filtered as (
    select e.*, u.nome unidade_nome, u.codigo unidade_codigo
    from public.vw_equipamentos_conformidade e
    join public.unidades u on u.id = e.unidade_id
    where e.empresa_id = p_empresa_id
      and public.unit_scope_allows(
        p_empresa_id, e.unidade_id, p_unidade_id, false
      )
      and (
        p_busca is null
        or e.nome ilike '%' || p_busca || '%'
        or coalesce(e.codigo_interno, '') ilike '%' || p_busca || '%'
        or coalesce(e.numero_serie, '') ilike '%' || p_busca || '%'
      )
      and (p_status is null or e.status_consolidado = p_status)
  ),
  page as (
    select * from filtered
    order by nome
    limit p_limite offset p_offset
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'limit', p_limite,
    'offset', p_offset
  )
  into v_result;

  return v_result;
end
$$;

create or replace function public.api_listar_manutencoes_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid default null,
  p_busca text default null,
  p_status text default null,
  p_natureza text default null,
  p_equipamento_id uuid default null,
  p_limite integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.assert_plan_feature(p_empresa_id, 'manutencoes');
  if p_unidade_id is null and not public.can_use_consolidated_view(p_empresa_id) then
    raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
  elsif p_unidade_id is not null and not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  p_limite := least(greatest(p_limite, 1), 100);
  p_offset := greatest(p_offset, 0);

  with filtered as (
    select
      m.*,
      e.nome equipamento_nome,
      coalesce(e.nome, m.nome_servico) item_nome,
      u.nome unidade_nome,
      u.codigo unidade_codigo
    from public.vw_manutencoes_status m
    left join public.equipamentos e on e.id = m.equipamento_id
    join public.unidades u on u.id = m.unidade_id
    where m.empresa_id = p_empresa_id
      and public.unit_scope_allows(
        p_empresa_id, m.unidade_id, p_unidade_id, false
      )
      and (
        p_busca is null
        or coalesce(e.nome, m.nome_servico, '') ilike '%' || p_busca || '%'
        or coalesce(m.numero_ordem_servico, '') ilike '%' || p_busca || '%'
      )
      and (p_status is null or m.status_calculado = p_status)
      and (p_natureza is null or m.natureza = p_natureza)
      and (p_equipamento_id is null or m.equipamento_id = p_equipamento_id)
  ),
  page as (
    select * from filtered
    order by proxima_manutencao nulls last
    limit p_limite offset p_offset
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'limit', p_limite,
    'offset', p_offset
  )
  into v_result;

  return v_result;
end
$$;

create or replace function public.api_listar_pendencias_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid default null,
  p_status text default null,
  p_responsavel_id uuid default null,
  p_limite integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.assert_plan_feature(p_empresa_id, 'pendencias');
  if p_unidade_id is null and not public.can_use_consolidated_view(p_empresa_id) then
    raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
  elsif p_unidade_id is not null and not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  p_limite := least(greatest(p_limite, 1), 100);
  p_offset := greatest(p_offset, 0);

  with filtered as (
    select
      p.*,
      usr.nome responsavel_nome,
      u.nome unidade_nome,
      (current_date - p.prazo) dias_atraso
    from public.pendencias p
    left join public.usuarios usr on usr.id = p.responsavel_id
    left join public.unidades u on u.id = p.unidade_id
    where p.empresa_id = p_empresa_id
      and p.deleted_at is null
      and public.unit_scope_allows(
        p_empresa_id, p.unidade_id, p_unidade_id, true
      )
      and (p_status is null or p.status = p_status)
      and (p_responsavel_id is null or p.responsavel_id = p_responsavel_id)
  ),
  page as (
    select * from filtered
    order by prazo nulls last
    limit p_limite offset p_offset
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'limit', p_limite,
    'offset', p_offset
  )
  into v_result;

  return v_result;
end
$$;

create or replace function public.api_listar_alertas_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid default null,
  p_somente_nao_lidos boolean default false,
  p_limite integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.assert_plan_feature(p_empresa_id, 'alertas');
  if p_unidade_id is null and not public.can_use_consolidated_view(p_empresa_id) then
    raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
  elsif p_unidade_id is not null and not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select
      al.id,
      al.modulo,
      al.registro_id,
      al.titulo,
      al.mensagem,
      al.data_vencimento,
      al.status,
      al.unidade_id,
      u.nome unidade_nome,
      al.created_at
    from public.alertas al
    left join public.unidades u on u.id = al.unidade_id
    where al.empresa_id = p_empresa_id
      and al.usuario_id = auth.uid()
      and al.deleted_at is null
      and public.unit_scope_allows(
        p_empresa_id, al.unidade_id, p_unidade_id, true
      )
      and (not p_somente_nao_lidos or al.status = 'nao_lido')
    order by al.created_at desc
    limit least(greatest(p_limite, 1), 100)
  ) a;

  return v_result;
end
$$;

create or replace function public.api_assistente_contexto_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid default null,
  p_escopo text default 'geral',
  p_equipamento_id uuid default null,
  p_setor text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.assert_plan_feature(p_empresa_id, 'assistente_ia');

  if p_unidade_id is null and not public.can_use_consolidated_view(p_empresa_id) then
    raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
  elsif p_unidade_id is not null and not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_equipamento_id is not null and not exists (
    select 1
    from public.equipamentos e
    where e.id = p_equipamento_id
      and e.empresa_id = p_empresa_id
      and e.deleted_at is null
      and public.unit_scope_allows(
        p_empresa_id, e.unidade_id, p_unidade_id, false
      )
  ) then
    raise exception 'EQUIPMENT_NOT_FOUND_IN_SCOPE' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'politica_privacidade', jsonb_build_object(
      'le_anexos', false,
      'usa_storage_path', false,
      'fontes', 'somente metadados estruturados do banco'
    ),
    'escopo_unidade', case
      when p_unidade_id is null then 'consolidado'
      else p_unidade_id::text
    end,
    'equipamentos', case
      when public.plan_feature_enabled(p_empresa_id, 'equipamentos') then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', e.id,
          'nome', e.nome,
          'codigo', e.codigo_interno,
          'setor', e.setor,
          'criticidade', e.criticidade,
          'unidade_id', e.unidade_id,
          'unidade', u.nome,
          'status_consolidado', e.status_consolidado,
          'status_calibracao', e.status_calibracao,
          'status_qualificacao', e.status_qualificacao,
          'status_manutencao', e.status_manutencao
        ) order by u.nome, e.nome), '[]'::jsonb)
        from public.vw_equipamentos_conformidade e
        join public.unidades u on u.id = e.unidade_id
        where e.empresa_id = p_empresa_id
          and public.unit_scope_allows(
            p_empresa_id, e.unidade_id, p_unidade_id, false
          )
          and (p_equipamento_id is null or e.id = p_equipamento_id)
          and (p_setor is null or lower(e.setor) = lower(p_setor))
      )
      else '[]'::jsonb
    end,
    'manutencoes', case
      when public.plan_feature_enabled(p_empresa_id, 'manutencoes') then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', m.id,
          'equipamento_id', m.equipamento_id,
          'equipamento', e.nome,
          'unidade_id', m.unidade_id,
          'unidade', u.nome,
          'setor', e.setor,
          'natureza', m.natureza,
          'tipo_servico', m.tipo_servico,
          'status_execucao', m.status_execucao,
          'data_manutencao', m.data_manutencao,
          'proxima_manutencao', m.proxima_manutencao,
          'status_calculado', m.status_calculado,
          'prioridade', m.prioridade
        ) order by m.proxima_manutencao nulls last), '[]'::jsonb)
        from public.vw_manutencoes_status m
        left join public.equipamentos e on e.id = m.equipamento_id
        join public.unidades u on u.id = m.unidade_id
        where m.empresa_id = p_empresa_id
          and public.unit_scope_allows(
            p_empresa_id, m.unidade_id, p_unidade_id, false
          )
          and (p_equipamento_id is null or m.equipamento_id = p_equipamento_id)
          and (p_setor is null or lower(e.setor) = lower(p_setor))
      )
      else '[]'::jsonb
    end,
    'documentos', case
      when public.plan_feature_enabled(p_empresa_id, 'documentos') then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', d.id,
          'modulo', 'documentos',
          'titulo', d.nome,
          'nome', d.nome,
          'numero_documento', d.numero_documento,
          'orgao_emissor', d.orgao_emissor,
          'setor', d.setor_unidade,
          'escopo_documento', d.escopo_documento,
          'unidade_id', d.unidade_id,
          'unidade', u.nome,
          'data_emissao', d.data_emissao,
          'data_vencimento', d.data_vencimento,
          'status', d.status_calculado,
          'status_calculado', d.status_calculado,
          'tem_anexo', public.tem_anexo_ativo(d.empresa_id, 'documentos', d.id)
        ) order by d.data_vencimento nulls last, d.nome), '[]'::jsonb)
        from public.vw_documentos_status d
        left join public.unidades u on u.id = d.unidade_id
        where d.empresa_id = p_empresa_id
          and public.unit_scope_allows(
            p_empresa_id, d.unidade_id, p_unidade_id, true
          )
          and (p_setor is null or lower(d.setor_unidade) = lower(p_setor))
      )
      else '[]'::jsonb
    end,
    'vencimentos', (
      select coalesce(jsonb_agg(x.item order by x.data_vencimento), '[]'::jsonb)
      from (
        select
          jsonb_build_object(
            'modulo', 'documentos',
            'registro_id', d.id,
            'titulo', d.nome,
            'data_vencimento', d.data_vencimento,
            'status', d.status_calculado,
            'unidade_id', d.unidade_id,
            'unidade', u.nome
          ) item,
          d.data_vencimento
        from public.vw_documentos_status d
        left join public.unidades u on u.id = d.unidade_id
        where d.empresa_id = p_empresa_id
          and d.data_vencimento is not null
          and d.status_calculado in ('vencido', 'vence_hoje', 'critico', 'a_vencer', 'atencao')
          and public.unit_scope_allows(
            p_empresa_id, d.unidade_id, p_unidade_id, true
          )
        union all
        select
          jsonb_build_object(
            'modulo', 'calibracoes',
            'registro_id', c.id,
            'titulo', 'Calibração — ' || e.nome,
            'data_vencimento', c.data_vencimento,
            'status', c.status_calculado,
            'unidade_id', c.unidade_id,
            'unidade', u.nome
          ),
          c.data_vencimento
        from public.vw_calibracoes_status c
        join public.equipamentos e on e.id = c.equipamento_id
        join public.unidades u on u.id = c.unidade_id
        where c.empresa_id = p_empresa_id
          and c.data_vencimento is not null
          and c.status_calculado in ('vencido', 'vence_hoje', 'critico', 'a_vencer', 'atencao')
          and public.unit_scope_allows(
            p_empresa_id, c.unidade_id, p_unidade_id, false
          )
          and (p_equipamento_id is null or c.equipamento_id = p_equipamento_id)
        union all
        select
          jsonb_build_object(
            'modulo', 'qualificacoes',
            'registro_id', q.id,
            'titulo', 'Qualificação — ' || e.nome,
            'data_vencimento', q.data_vencimento,
            'status', q.status_calculado,
            'unidade_id', q.unidade_id,
            'unidade', u.nome
          ),
          q.data_vencimento
        from public.vw_qualificacoes_status q
        join public.equipamentos e on e.id = q.equipamento_id
        join public.unidades u on u.id = q.unidade_id
        where q.empresa_id = p_empresa_id
          and q.data_vencimento is not null
          and q.status_calculado in ('vencido', 'vence_hoje', 'critico', 'a_vencer', 'atencao')
          and public.unit_scope_allows(
            p_empresa_id, q.unidade_id, p_unidade_id, false
          )
          and (p_equipamento_id is null or q.equipamento_id = p_equipamento_id)
      ) x
    ),
    'pendencias', case
      when public.plan_feature_enabled(p_empresa_id, 'pendencias') then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', p.id,
          'modulo', p.modulo,
          'registro_id', p.registro_id,
          'titulo', p.titulo,
          'prazo', p.prazo,
          'status', p.status,
          'unidade_id', p.unidade_id,
          'unidade', u.nome
        ) order by p.prazo nulls last), '[]'::jsonb)
        from public.pendencias p
        left join public.unidades u on u.id = p.unidade_id
        where p.empresa_id = p_empresa_id
          and p.deleted_at is null
          and p.status in ('pendente', 'em_andamento')
          and public.unit_scope_allows(
            p_empresa_id, p.unidade_id, p_unidade_id, true
          )
      )
      else '[]'::jsonb
    end
  );
end
$$;

-- Helper que permite usar expressão SQL sem retornar dados em caso de negação.
create or replace function public.raise_forbidden_json()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth, pg_temp
as $$
begin
  raise exception 'FORBIDDEN' using errcode = '42501';
end
$$;

create or replace function public.api_unidade_indicadores(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select case
    when not public.can_read_unit(p_empresa_id, p_unidade_id)
      then public.raise_forbidden_json()
    else jsonb_build_object(
      'unidade_id', p_unidade_id,
      'documentos', (
        select count(*) from public.documentos
        where empresa_id = p_empresa_id
          and unidade_id = p_unidade_id
          and deleted_at is null
      ),
      'equipamentos', (
        select count(*) from public.equipamentos
        where empresa_id = p_empresa_id
          and unidade_id = p_unidade_id
          and deleted_at is null
      ),
      'manutencoes_abertas', (
        select count(*) from public.manutencoes
        where empresa_id = p_empresa_id
          and unidade_id = p_unidade_id
          and status_execucao in ('programada', 'em_andamento')
          and deleted_at is null
      ),
      'pendencias_abertas', (
        select count(*) from public.pendencias
        where empresa_id = p_empresa_id
          and unidade_id = p_unidade_id
          and status in ('pendente', 'em_andamento')
          and deleted_at is null
      )
    )
  end
$$;

-- As versões legadas passam pelo mesmo escopo. Administradores mantêm a visão
-- consolidada; usuários restritos devem selecionar uma unidade explicitamente.
create or replace function public.api_dashboard(p_empresa_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.api_dashboard_unidade(p_empresa_id, null)
$$;

create or replace function public.api_listar_documentos(
  p_empresa_id uuid,
  p_busca text default null,
  p_status text default null,
  p_limite integer default 25,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.api_listar_documentos_unidade(
    p_empresa_id, null, p_busca, p_status, p_limite, p_offset
  )
$$;

create or replace function public.api_listar_equipamentos(
  p_empresa_id uuid,
  p_busca text default null,
  p_status text default null,
  p_limite integer default 25,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.api_listar_equipamentos_unidade(
    p_empresa_id, null, p_busca, p_status, p_limite, p_offset
  )
$$;

create or replace function public.api_listar_manutencoes(
  p_empresa_id uuid,
  p_busca text default null,
  p_status text default null,
  p_natureza text default null,
  p_equipamento_id uuid default null,
  p_limite integer default 25,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.api_listar_manutencoes_unidade(
    p_empresa_id,
    null,
    p_busca,
    p_status,
    p_natureza,
    p_equipamento_id,
    p_limite,
    p_offset
  )
$$;

create or replace function public.api_listar_pendencias(
  p_empresa_id uuid,
  p_status text default null,
  p_responsavel_id uuid default null,
  p_limite integer default 25,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.api_listar_pendencias_unidade(
    p_empresa_id,
    null,
    p_status,
    p_responsavel_id,
    p_limite,
    p_offset
  )
$$;

create or replace function public.api_listar_alertas(
  p_empresa_id uuid,
  p_somente_nao_lidos boolean default false,
  p_limite integer default 50
)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.api_listar_alertas_unidade(
    p_empresa_id, null, p_somente_nao_lidos, p_limite
  )
$$;

-- CRUD operacional: a unidade é validada no banco e nunca aceita vínculo
-- incompatível com a empresa ou equipamento.
create or replace function public.api_criar_documento(
  p_empresa_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row public.documentos;
  v_scope text := coalesce(nullif(p_payload ->> 'escopo_documento', ''), 'corporativo');
  v_unit uuid := nullif(p_payload ->> 'unidade_id', '')::uuid;
begin
  if not public.can_write_company(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform public.assert_plan_feature(p_empresa_id, 'documentos');
  if v_scope = 'unidade' and not public.can_write_unit(p_empresa_id, v_unit) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.documentos (
    empresa_id,
    nome,
    categoria_id,
    tipo_documento_id,
    numero_documento,
    orgao_emissor,
    responsavel_id,
    data_emissao,
    data_vencimento,
    periodicidade_meses,
    alerta_antecedencia_dias,
    exige_anexo,
    setor_unidade,
    escopo_documento,
    unidade_id,
    observacoes
  )
  values (
    p_empresa_id,
    btrim(p_payload ->> 'nome'),
    nullif(p_payload ->> 'categoria_id', '')::uuid,
    nullif(p_payload ->> 'tipo_documento_id', '')::uuid,
    nullif(p_payload ->> 'numero_documento', ''),
    nullif(p_payload ->> 'orgao_emissor', ''),
    nullif(p_payload ->> 'responsavel_id', '')::uuid,
    nullif(p_payload ->> 'data_emissao', '')::date,
    nullif(p_payload ->> 'data_vencimento', '')::date,
    nullif(p_payload ->> 'periodicidade_meses', '')::integer,
    coalesce(
      array(
        select jsonb_array_elements_text(p_payload -> 'dias_alerta')::integer
      ),
      array[60, 30, 15, 7, 0]
    ),
    coalesce((p_payload ->> 'exige_anexo')::boolean, true),
    nullif(p_payload ->> 'setor_unidade', ''),
    v_scope,
    case when v_scope = 'unidade' then v_unit else null end,
    nullif(p_payload ->> 'observacoes', '')
  )
  returning * into v_row;

  return to_jsonb(v_row);
end
$$;

create or replace function public.api_criar_equipamento(
  p_empresa_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row public.equipamentos;
  v_unit uuid := nullif(p_payload ->> 'unidade_id', '')::uuid;
begin
  if not public.can_write_unit(p_empresa_id, v_unit) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform public.assert_plan_feature(p_empresa_id, 'equipamentos');

  insert into public.equipamentos (
    empresa_id,
    unidade_id,
    nome,
    tipo_equipamento_id,
    codigo_interno,
    numero_serie,
    fabricante,
    modelo,
    setor,
    localizacao,
    criticidade,
    status,
    responsavel_id,
    observacoes
  )
  values (
    p_empresa_id,
    v_unit,
    btrim(p_payload ->> 'nome'),
    nullif(p_payload ->> 'tipo_equipamento_id', '')::uuid,
    nullif(p_payload ->> 'codigo_interno', ''),
    nullif(p_payload ->> 'numero_serie', ''),
    nullif(p_payload ->> 'fabricante', ''),
    nullif(p_payload ->> 'modelo', ''),
    nullif(p_payload ->> 'setor', ''),
    nullif(p_payload ->> 'localizacao', ''),
    coalesce(nullif(p_payload ->> 'criticidade', ''), 'media'),
    coalesce(nullif(p_payload ->> 'status', ''), 'ativo'),
    nullif(p_payload ->> 'responsavel_id', '')::uuid,
    nullif(p_payload ->> 'observacoes', '')
  )
  returning * into v_row;

  return to_jsonb(v_row);
end
$$;

create or replace function public.api_criar_calibracao(
  p_empresa_id uuid,
  p_equipamento_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row public.calibracoes;
  v_unit uuid;
begin
  select unidade_id into v_unit
  from public.equipamentos
  where id = p_equipamento_id
    and empresa_id = p_empresa_id
    and deleted_at is null;
  if not public.can_write_unit(p_empresa_id, v_unit) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform public.assert_plan_feature(p_empresa_id, 'calibracoes');

  insert into public.calibracoes (
    empresa_id,
    unidade_id,
    equipamento_id,
    data_calibracao,
    data_vencimento,
    numero_certificado,
    laboratorio_responsavel,
    resultado,
    responsavel_id,
    observacoes
  )
  values (
    p_empresa_id,
    v_unit,
    p_equipamento_id,
    (p_payload ->> 'data_calibracao')::date,
    nullif(p_payload ->> 'data_vencimento', '')::date,
    nullif(p_payload ->> 'numero_certificado', ''),
    nullif(p_payload ->> 'laboratorio_responsavel', ''),
    p_payload ->> 'resultado',
    nullif(p_payload ->> 'responsavel_id', '')::uuid,
    nullif(p_payload ->> 'observacoes', '')
  )
  returning * into v_row;

  return to_jsonb(v_row);
end
$$;

create or replace function public.api_criar_qualificacao(
  p_empresa_id uuid,
  p_equipamento_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row public.qualificacoes;
  v_unit uuid;
begin
  select unidade_id into v_unit
  from public.equipamentos
  where id = p_equipamento_id
    and empresa_id = p_empresa_id
    and deleted_at is null;
  if not public.can_write_unit(p_empresa_id, v_unit) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform public.assert_plan_feature(p_empresa_id, 'qualificacoes');

  insert into public.qualificacoes (
    empresa_id,
    unidade_id,
    equipamento_id,
    tipo,
    data_qualificacao,
    data_vencimento,
    resultado,
    responsavel_tecnico_id,
    empresa_executora,
    observacoes
  )
  values (
    p_empresa_id,
    v_unit,
    p_equipamento_id,
    p_payload ->> 'tipo',
    (p_payload ->> 'data_qualificacao')::date,
    nullif(p_payload ->> 'data_vencimento', '')::date,
    p_payload ->> 'resultado',
    nullif(p_payload ->> 'responsavel_tecnico_id', '')::uuid,
    nullif(p_payload ->> 'empresa_executora', ''),
    nullif(p_payload ->> 'observacoes', '')
  )
  returning * into v_row;

  return to_jsonb(v_row);
end
$$;

create or replace function public.api_criar_manutencao(
  p_empresa_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row public.manutencoes;
  v_equipment uuid := nullif(p_payload ->> 'equipamento_id', '')::uuid;
  v_unit uuid := nullif(p_payload ->> 'unidade_id', '')::uuid;
begin
  if v_equipment is not null then
    select unidade_id into v_unit
    from public.equipamentos
    where id = v_equipment
      and empresa_id = p_empresa_id
      and deleted_at is null;
  end if;
  if not public.can_write_unit(p_empresa_id, v_unit) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform public.assert_plan_feature(p_empresa_id, 'manutencoes');

  insert into public.manutencoes (
    empresa_id,
    unidade_id,
    equipamento_id,
    nome_servico,
    natureza,
    tipo_servico,
    status_execucao,
    data_manutencao,
    proxima_manutencao,
    periodicidade_meses,
    empresa_responsavel,
    tecnico_responsavel,
    numero_ordem_servico,
    responsavel_interno_id,
    exige_evidencia,
    falha_apresentada,
    prioridade,
    diagnostico,
    causa_raiz,
    acao_realizada,
    observacoes
  )
  values (
    p_empresa_id,
    v_unit,
    v_equipment,
    nullif(p_payload ->> 'nome_servico', ''),
    p_payload ->> 'natureza',
    coalesce(nullif(p_payload ->> 'tipo_servico', ''), 'outro'),
    coalesce(nullif(p_payload ->> 'status_execucao', ''), 'concluida'),
    (p_payload ->> 'data_manutencao')::date,
    nullif(p_payload ->> 'proxima_manutencao', '')::date,
    nullif(p_payload ->> 'periodicidade_meses', '')::integer,
    nullif(p_payload ->> 'empresa_responsavel', ''),
    nullif(p_payload ->> 'tecnico_responsavel', ''),
    nullif(p_payload ->> 'numero_ordem_servico', ''),
    nullif(p_payload ->> 'responsavel_interno_id', '')::uuid,
    coalesce((p_payload ->> 'exige_evidencia')::boolean, true),
    nullif(p_payload ->> 'falha_apresentada', ''),
    nullif(p_payload ->> 'prioridade', ''),
    nullif(p_payload ->> 'diagnostico', ''),
    nullif(p_payload ->> 'causa_raiz', ''),
    nullif(p_payload ->> 'acao_realizada', ''),
    nullif(p_payload ->> 'observacoes', '')
  )
  returning * into v_row;

  return to_jsonb(v_row);
end
$$;

-- QR deriva empresa e unidade do equipamento; UUIDs fornecidos pelo cliente
-- nunca ampliam o acesso.
create or replace function public.api_obter_qr_equipamento(p_equipamento_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_eq public.equipamentos;
  v_unit_name text;
begin
  select * into v_eq
  from public.equipamentos
  where id = p_equipamento_id and deleted_at is null;
  if not found then
    raise exception 'EQUIPMENT_NOT_FOUND';
  end if;
  if not public.can_read_unit(v_eq.empresa_id, v_eq.unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select nome into v_unit_name from public.unidades where id = v_eq.unidade_id;

  insert into public.logs_auditoria(
    empresa_id, unidade_id, usuario_id, modulo, acao, registro_id
  )
  values (
    v_eq.empresa_id, v_eq.unidade_id, auth.uid(), 'equipamentos', 'consultar_qr', v_eq.id
  );

  return jsonb_build_object(
    'empresa_id', v_eq.empresa_id,
    'unidade_id', v_eq.unidade_id,
    'unidade', v_unit_name,
    'equipamento_id', v_eq.id,
    'qr_token', v_eq.qr_token,
    'nome', v_eq.nome,
    'codigo', v_eq.codigo_interno
  );
end
$$;

create or replace function public.api_resolver_qr_equipamento(p_qr_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_eq public.equipamentos;
  v_unit_name text;
begin
  select * into v_eq
  from public.equipamentos
  where qr_token = p_qr_token and deleted_at is null;
  if not found then
    raise exception 'QR_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.can_read_unit(v_eq.empresa_id, v_eq.unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select nome into v_unit_name from public.unidades where id = v_eq.unidade_id;

  insert into public.logs_auditoria(
    empresa_id, unidade_id, usuario_id, modulo, acao, registro_id
  )
  values (
    v_eq.empresa_id, v_eq.unidade_id, auth.uid(), 'equipamentos', 'acesso_por_qr', v_eq.id
  );

  return jsonb_build_object(
    'empresa_id', v_eq.empresa_id,
    'unidade_id', v_eq.unidade_id,
    'unidade', v_unit_name,
    'equipamento', to_jsonb(v_eq)
  );
end
$$;

create or replace function public.api_rotacionar_qr_equipamento(p_equipamento_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_eq public.equipamentos;
begin
  select * into v_eq
  from public.equipamentos
  where id = p_equipamento_id and deleted_at is null
  for update;
  if not found then
    raise exception 'EQUIPMENT_NOT_FOUND';
  end if;
  if not public.can_write_unit(v_eq.empresa_id, v_eq.unidade_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.equipamentos
  set qr_token = gen_random_uuid()
  where id = p_equipamento_id
  returning * into v_eq;

  insert into public.logs_auditoria(
    empresa_id, unidade_id, usuario_id, modulo, acao, registro_id
  )
  values (
    v_eq.empresa_id, v_eq.unidade_id, auth.uid(), 'equipamentos', 'rotacionar_qr', v_eq.id
  );

  return jsonb_build_object(
    'empresa_id', v_eq.empresa_id,
    'unidade_id', v_eq.unidade_id,
    'equipamento_id', v_eq.id,
    'qr_token', v_eq.qr_token
  );
end
$$;

create or replace function public.api_equipamento_detalhe(
  p_empresa_id uuid,
  p_equipamento_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unit uuid;
  v_result jsonb;
begin
  select unidade_id into v_unit
  from public.equipamentos
  where id = p_equipamento_id
    and empresa_id = p_empresa_id
    and deleted_at is null;

  if v_unit is null then
    raise exception 'EQUIPMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.can_read_unit(p_empresa_id, v_unit) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform public.assert_plan_feature(p_empresa_id, 'equipamentos');

  select jsonb_build_object(
    'equipamento', to_jsonb(e) || jsonb_build_object('unidade_nome', u.nome),
    'calibracoes', case
      when public.plan_feature_enabled(p_empresa_id, 'calibracoes') then (
        select coalesce(jsonb_agg(to_jsonb(c) order by c.data_calibracao desc), '[]'::jsonb)
        from public.vw_calibracoes_status c
        where c.empresa_id = p_empresa_id and c.equipamento_id = p_equipamento_id
          and public.can_read_unit(p_empresa_id, c.unidade_id)
      )
      else '[]'::jsonb
    end,
    'qualificacoes', case
      when public.plan_feature_enabled(p_empresa_id, 'qualificacoes') then (
        select coalesce(jsonb_agg(to_jsonb(q) order by q.data_qualificacao desc), '[]'::jsonb)
        from public.vw_qualificacoes_status q
        where q.empresa_id = p_empresa_id and q.equipamento_id = p_equipamento_id
          and public.can_read_unit(p_empresa_id, q.unidade_id)
      )
      else '[]'::jsonb
    end,
    'manutencoes', case
      when public.plan_feature_enabled(p_empresa_id, 'manutencoes') then (
        select coalesce(jsonb_agg(to_jsonb(m) order by m.data_manutencao desc), '[]'::jsonb)
        from public.vw_manutencoes_status m
        where m.empresa_id = p_empresa_id and m.equipamento_id = p_equipamento_id
          and public.can_read_unit(p_empresa_id, m.unidade_id)
      )
      else '[]'::jsonb
    end,
    'anexos', case
      when public.plan_feature_enabled(p_empresa_id, 'anexos') then (
        select coalesce(
          jsonb_agg(to_jsonb(a) - 'storage_path' order by a.created_at desc),
          '[]'::jsonb
        )
        from public.anexos a
        where a.empresa_id = p_empresa_id
          and a.deleted_at is null
          and (a.unidade_id is null or public.can_read_unit(p_empresa_id, a.unidade_id))
          and (
            (a.modulo = 'equipamentos' and a.registro_id = p_equipamento_id)
            or (
              a.modulo = 'calibracoes'
              and a.registro_id in (
                select id from public.calibracoes where equipamento_id = p_equipamento_id
              )
            )
            or (
              a.modulo = 'qualificacoes'
              and a.registro_id in (
                select id from public.qualificacoes where equipamento_id = p_equipamento_id
              )
            )
            or (
              a.modulo = 'manutencoes'
              and a.registro_id in (
                select id from public.manutencoes where equipamento_id = p_equipamento_id
              )
            )
          )
      )
      else '[]'::jsonb
    end,
    'historico', coalesce((
      select jsonb_agg(to_jsonb(h) order by h.data desc)
      from (
        select
          l.id,
          l.created_at data,
          l.modulo,
          l.acao descricao,
          l.registro_id,
          l.valor_anterior,
          l.novo_valor
        from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and (l.unidade_id is null or public.can_read_unit(p_empresa_id, l.unidade_id))
          and (
            l.registro_id = p_equipamento_id
            or l.registro_id in (
              select id from public.calibracoes where equipamento_id = p_equipamento_id
              union all
              select id from public.qualificacoes where equipamento_id = p_equipamento_id
              union all
              select id from public.manutencoes where equipamento_id = p_equipamento_id
            )
          )
        union all
        select
          t.id,
          t.data_transferencia,
          'equipamentos',
          'transferencia_unidade',
          t.equipamento_id,
          jsonb_build_object('unidade_id', t.unidade_origem_id),
          jsonb_build_object(
            'unidade_id', t.unidade_destino_id,
            'motivo', t.motivo
          )
        from public.transferencias_unidades t
        where t.empresa_id = p_empresa_id
          and t.equipamento_id = p_equipamento_id
          and (
            public.can_read_unit(p_empresa_id, t.unidade_origem_id)
            or public.can_read_unit(p_empresa_id, t.unidade_destino_id)
          )
      ) h
    ), '[]'::jsonb)
  )
  into v_result
  from public.vw_equipamentos_conformidade e
  join public.unidades u on u.id = e.unidade_id
  where e.id = p_equipamento_id
    and e.empresa_id = p_empresa_id;

  return v_result;
end
$$;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where conname like '%\_unidade\_empresa\_fk' escape '\'
      and not convalidated
  loop
    execute format(
      'alter table %s validate constraint %I',
      v_constraint.table_name,
      v_constraint.conname
    );
  end loop;
end
$$;

revoke all on function public.unit_scope_allows(uuid, uuid, uuid, boolean) from public, anon;
revoke all on function public.api_listar_unidades(uuid) from public, anon;
revoke all on function public.api_obter_unidade(uuid, uuid) from public, anon;
revoke all on function public.api_criar_unidade(uuid, jsonb) from public, anon;
revoke all on function public.api_atualizar_unidade(uuid, uuid, jsonb) from public, anon;
revoke all on function public.api_alterar_status_unidade(uuid, uuid, text, text) from public, anon;
revoke all on function public.api_definir_unidade_matriz(uuid, uuid) from public, anon;
revoke all on function public.api_salvar_acesso_usuario_unidades(uuid, uuid, boolean, uuid[], uuid) from public, anon;
revoke all on function public.api_transferir_equipamento_unidade(uuid, uuid, uuid, text, uuid, timestamptz, text) from public, anon;
revoke all on function public.api_dashboard_unidade(uuid, uuid) from public, anon;
revoke all on function public.api_listar_documentos_unidade(uuid, uuid, text, text, integer, integer) from public, anon;
revoke all on function public.api_listar_equipamentos_unidade(uuid, uuid, text, text, integer, integer) from public, anon;
revoke all on function public.api_listar_manutencoes_unidade(uuid, uuid, text, text, text, uuid, integer, integer) from public, anon;
revoke all on function public.api_listar_pendencias_unidade(uuid, uuid, text, uuid, integer, integer) from public, anon;
revoke all on function public.api_listar_alertas_unidade(uuid, uuid, boolean, integer) from public, anon;
revoke all on function public.api_assistente_contexto_unidade(uuid, uuid, text, uuid, text) from public, anon;
revoke all on function public.api_unidade_indicadores(uuid, uuid) from public, anon;
revoke all on function public.raise_forbidden_json() from public, anon;
revoke all on function public.api_rotacionar_qr_equipamento(uuid) from public, anon;

grant execute on function public.unit_scope_allows(uuid, uuid, uuid, boolean) to authenticated, service_role;
grant execute on function public.api_listar_unidades(uuid) to authenticated;
grant execute on function public.api_obter_unidade(uuid, uuid) to authenticated;
grant execute on function public.api_criar_unidade(uuid, jsonb) to authenticated;
grant execute on function public.api_atualizar_unidade(uuid, uuid, jsonb) to authenticated;
grant execute on function public.api_alterar_status_unidade(uuid, uuid, text, text) to authenticated;
grant execute on function public.api_definir_unidade_matriz(uuid, uuid) to authenticated;
grant execute on function public.api_salvar_acesso_usuario_unidades(uuid, uuid, boolean, uuid[], uuid) to authenticated;
grant execute on function public.api_transferir_equipamento_unidade(uuid, uuid, uuid, text, uuid, timestamptz, text) to authenticated;
grant execute on function public.api_dashboard_unidade(uuid, uuid) to authenticated;
grant execute on function public.api_listar_documentos_unidade(uuid, uuid, text, text, integer, integer) to authenticated;
grant execute on function public.api_listar_equipamentos_unidade(uuid, uuid, text, text, integer, integer) to authenticated;
grant execute on function public.api_listar_manutencoes_unidade(uuid, uuid, text, text, text, uuid, integer, integer) to authenticated;
grant execute on function public.api_listar_pendencias_unidade(uuid, uuid, text, uuid, integer, integer) to authenticated;
grant execute on function public.api_listar_alertas_unidade(uuid, uuid, boolean, integer) to authenticated;
grant execute on function public.api_assistente_contexto_unidade(uuid, uuid, text, uuid, text) to authenticated;
grant execute on function public.api_unidade_indicadores(uuid, uuid) to authenticated;
grant execute on function public.raise_forbidden_json() to authenticated, service_role;
grant execute on function public.api_rotacionar_qr_equipamento(uuid) to authenticated;
