-- Conform Flow — passaporte do equipamento, carteira do parceiro, integridade
-- das evidências, centro de ações e modo fiscalização.
--
-- Todas as APIs abaixo validam o contexto de empresa no banco. Nenhuma delas
-- entrega conteúdo de anexos, URLs de Storage ou dados de outra empresa.

create or replace function public.api_auditoria_integridade(
  p_empresa_id uuid,
  p_unidade_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_total integer := 0;
  v_legacy integer := 0;
  v_broken_links integer := 0;
  v_invalid_hashes integer := 0;
  v_missing_attachment_hashes integer := 0;
  v_last_event_at timestamptz;
  v_status text;
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform public.assert_plan_feature(p_empresa_id, 'auditoria');

  if p_unidade_id is null then
    if not public.can_use_consolidated_view(p_empresa_id) then
      raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
    end if;
  elsif not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'UNIT_ACCESS_DENIED' using errcode = '42501';
  end if;

  with eventos as (
    select
      l.*,
      row_number() over (order by l.created_at, l.id) as posicao,
      lag(l.event_hash) over (order by l.created_at, l.id) as hash_anterior_esperado
    from public.logs_auditoria l
    where l.empresa_id = p_empresa_id
      and public.unit_scope_allows(p_empresa_id, l.unidade_id, p_unidade_id, true)
  )
  select
    count(*)::integer,
    count(*) filter (where posicao > 1 and previous_hash is null)::integer,
    count(*) filter (
      where posicao > 1
        and previous_hash is not null
        and previous_hash is distinct from hash_anterior_esperado
    )::integer,
    count(*) filter (
      where previous_hash is not null
        and event_hash is distinct from encode(
          extensions.digest(
            concat_ws(
              '|',
              id::text,
              coalesce(empresa_id::text, ''),
              coalesce(usuario_id::text, ''),
              modulo,
              acao,
              coalesce(registro_id::text, ''),
              coalesce(previous_hash, ''),
              coalesce(valor_anterior::text, ''),
              coalesce(novo_valor::text, ''),
              created_at::text
            ),
            'sha256'
          ),
          'hex'
        )
    )::integer,
    max(created_at)
  into v_total, v_legacy, v_broken_links, v_invalid_hashes, v_last_event_at
  from eventos;

  select count(*)::integer
  into v_missing_attachment_hashes
  from public.anexos a
  where a.empresa_id = p_empresa_id
    and a.deleted_at is null
    and a.status = 'ativo'
    and nullif(a.scan_sha256, '') is null
    and public.unit_scope_allows(
      p_empresa_id,
      coalesce(
        (select d.unidade_id from public.documentos d where d.id = a.registro_id and a.modulo = 'documentos'),
        (select e.unidade_id from public.equipamentos e where e.id = a.registro_id and a.modulo = 'equipamentos'),
        (select c.unidade_id from public.calibracoes c where c.id = a.registro_id and a.modulo = 'calibracoes'),
        (select q.unidade_id from public.qualificacoes q where q.id = a.registro_id and a.modulo = 'qualificacoes'),
        (select m.unidade_id from public.manutencoes m where m.id = a.registro_id and a.modulo = 'manutencoes'),
        null
      ),
      p_unidade_id,
      true
    );

  v_status := case
    when v_broken_links > 0 or v_invalid_hashes > 0 then 'invalida'
    when v_legacy > 0 then 'parcial'
    else 'verificada'
  end;

  return jsonb_build_object(
    'status', v_status,
    'eventos_verificados', coalesce(v_total, 0) - coalesce(v_legacy, 0),
    'eventos_legado', coalesce(v_legacy, 0),
    'elos_inconsistentes', coalesce(v_broken_links, 0),
    'hashes_invalidos', coalesce(v_invalid_hashes, 0),
    'anexos_sem_hash', coalesce(v_missing_attachment_hashes, 0),
    'ultimo_evento_em', v_last_event_at,
    'politica', jsonb_build_object(
      'trilha_imutavel', true,
      'conteudo_anexo_exposto', false,
      'algoritmo', 'SHA-256'
    )
  );
end;
$$;

create or replace function public.api_copiloto_proximas_acoes(
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
  if not public.has_company_access(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform public.assert_plan_feature(p_empresa_id, 'assistente_ia');

  if p_unidade_id is null then
    if not public.can_use_consolidated_view(p_empresa_id) then
      raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
    end if;
  elsif not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'UNIT_ACCESS_DENIED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'politica_ia', jsonb_build_object(
      'leu_anexos', false,
      'fonte', 'dados estruturados do ambiente autorizado',
      'execucao_automatica', false
    ),
    'acoes', coalesce((
      with candidatos as (
        select
          'documentos:' || d.id::text as id,
          'documentos'::text as modulo,
          d.nome as titulo,
          case
            when d.status_calculado = 'vencido' then 'O documento está vencido e precisa de regularização.'
            when d.status_calculado in ('critico', 'vence_hoje') then 'O documento exige ação imediata.'
            else 'O documento entra na janela preventiva de renovação.'
          end as descricao,
          d.data_vencimento as prazo,
          case when d.status_calculado = 'vencido' then 'critica' when d.status_calculado in ('critico', 'vence_hoje') then 'alta' else 'media' end as prioridade,
          '/documentos?registro=' || d.id::text as destino,
          case when d.status_calculado = 'vencido' then 100 when d.status_calculado in ('critico', 'vence_hoje') then 90 else 70 end as peso
        from public.vw_documentos_status d
        where d.empresa_id = p_empresa_id
          and d.status_calculado in ('vencido', 'critico', 'vence_hoje', 'a_vencer', 'pendente_anexo')
          and public.unit_scope_allows(p_empresa_id, d.unidade_id, p_unidade_id, true)

        union all

        select
          'manutencoes:' || m.id::text,
          'manutencoes',
          coalesce(m.nome_servico, 'Manutenção programada'),
          case when m.status_calculado = 'vencido' then 'A manutenção está vencida.' else 'A manutenção precisa entrar na programação.' end,
          coalesce(m.proxima_manutencao, m.data_manutencao),
          case when m.status_calculado = 'vencido' then 'critica' else 'alta' end,
          '/manutencoes',
          case when m.status_calculado = 'vencido' then 95 else 75 end
        from public.vw_manutencoes_status m
        where m.empresa_id = p_empresa_id
          and m.status_calculado in ('vencido', 'critico', 'vence_hoje', 'a_vencer', 'pendente_evidencia')
          and public.unit_scope_allows(p_empresa_id, m.unidade_id, p_unidade_id, true)

        union all

        select
          'calibracoes:' || c.id::text,
          'equipamentos',
          'Calibração: ' || coalesce(e.nome, c.numero_certificado, 'equipamento'),
          case when c.status_calculado = 'vencido' then 'A calibração está vencida.' else 'A calibração se aproxima do prazo.' end,
          c.data_vencimento,
          case when c.status_calculado = 'vencido' then 'critica' else 'alta' end,
          '/equipamentos/' || c.equipamento_id::text || '?tab=Calibrações',
          case when c.status_calculado = 'vencido' then 92 else 74 end
        from public.vw_calibracoes_status c
        join public.equipamentos e on e.id = c.equipamento_id and e.empresa_id = c.empresa_id
        where c.empresa_id = p_empresa_id
          and c.vigente
          and c.status_calculado in ('vencido', 'critico', 'vence_hoje', 'a_vencer', 'sem_certificado')
          and public.unit_scope_allows(p_empresa_id, c.unidade_id, p_unidade_id, true)

        union all

        select
          'qualificacoes:' || q.id::text,
          'equipamentos',
          'Qualificação: ' || coalesce(e.nome, q.tipo, 'equipamento'),
          case when q.status_calculado = 'vencido' then 'A qualificação está vencida.' else 'A qualificação exige acompanhamento.' end,
          q.data_vencimento,
          case when q.status_calculado = 'vencido' then 'critica' else 'alta' end,
          '/equipamentos/' || q.equipamento_id::text || '?tab=Qualificações',
          case when q.status_calculado = 'vencido' then 91 else 72 end
        from public.vw_qualificacoes_status q
        join public.equipamentos e on e.id = q.equipamento_id and e.empresa_id = q.empresa_id
        where q.empresa_id = p_empresa_id
          and q.vigente
          and q.status_calculado in ('vencido', 'critico', 'vence_hoje', 'a_vencer', 'pendente_relatorio')
          and public.unit_scope_allows(p_empresa_id, q.unidade_id, p_unidade_id, true)

        union all

        select
          'pendencias:' || p.id::text,
          'pendencias',
          p.titulo,
          'A pendência está aberta e precisa de tratativa.',
          p.prazo,
          case when p.prazo < current_date then 'critica' else 'alta' end,
          '/pendencias',
          case when p.prazo < current_date then 97 else 78 end
        from public.pendencias p
        where p.empresa_id = p_empresa_id
          and p.deleted_at is null
          and p.status in ('pendente', 'em_andamento')
          and public.unit_scope_allows(p_empresa_id, p.unidade_id, p_unidade_id, true)
      )
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'modulo', modulo,
          'titulo', titulo,
          'descricao', descricao,
          'prazo', prazo,
          'prioridade', prioridade,
          'destino', destino
        ) order by peso desc, prazo nulls last, titulo
      )
      from (select * from candidatos order by peso desc, prazo nulls last, titulo limit 6) priorizadas
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.api_registrar_acao_copiloto(
  p_empresa_id uuid,
  p_acao_id text,
  p_destino text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if nullif(trim(p_acao_id), '') is null or nullif(trim(p_destino), '') is null then
    raise exception 'COPILOT_ACTION_REQUIRED' using errcode = '23514';
  end if;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, novo_valor)
  values (
    p_empresa_id,
    auth.uid(),
    'copiloto_ia',
    'acao_recomendada_aberta',
    jsonb_build_object('acao_id', left(trim(p_acao_id), 160), 'destino', left(trim(p_destino), 240))
  );
end;
$$;

create or replace function public.api_painel_fiscalizacao(
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
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform public.assert_plan_feature(p_empresa_id, 'auditoria');

  if p_unidade_id is null then
    if not public.can_use_consolidated_view(p_empresa_id) then
      raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
    end if;
  elsif not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'UNIT_ACCESS_DENIED' using errcode = '42501';
  end if;

  select * into v_empresa
  from public.empresas
  where id = p_empresa_id and deleted_at is null;
  if not found then
    raise exception 'COMPANY_NOT_FOUND' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'empresa', jsonb_build_object(
      'nome', v_empresa.nome_fantasia,
      'razao_social', v_empresa.razao_social,
      'cnpj', v_empresa.cnpj,
      'responsavel_legal', v_empresa.responsavel_legal,
      'responsavel_tecnico', v_empresa.responsavel_tecnico
    ),
    'gerado_em', now(),
    'escopo', case when p_unidade_id is null then 'consolidado' else 'unidade' end,
    'documentos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'nome', d.nome,
        'numero', d.numero_documento,
        'vencimento', d.data_vencimento,
        'status', d.status_calculado,
        'possui_anexo', public.tem_anexo_ativo(d.empresa_id, 'documentos', d.id)
      ) order by d.data_vencimento nulls last, d.nome)
      from (
        select * from public.vw_documentos_status
        where empresa_id = p_empresa_id
          and public.unit_scope_allows(p_empresa_id, unidade_id, p_unidade_id, true)
        order by data_vencimento nulls last, nome
        limit 20
      ) d
    ), '[]'::jsonb),
    'equipamentos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'nome', e.nome,
        'codigo', e.codigo_interno,
        'setor', e.setor,
        'criticidade', e.criticidade,
        'status', e.status_consolidado,
        'calibracao', e.status_calibracao,
        'qualificacao', e.status_qualificacao,
        'manutencao', e.status_manutencao
      ) order by case e.status_consolidado when 'vencido' then 0 when 'critico' then 1 when 'atencao' then 2 else 3 end, e.nome)
      from (
        select * from public.vw_equipamentos_conformidade
        where empresa_id = p_empresa_id
          and public.unit_scope_allows(p_empresa_id, unidade_id, p_unidade_id, true)
        order by nome
        limit 20
      ) e
    ), '[]'::jsonb),
    'evidencias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nome', a.nome_original,
        'modulo', a.modulo,
        'versao', a.versao,
        'hash', a.scan_sha256,
        'enviado_em', a.created_at,
        'status', a.status
      ) order by a.created_at desc)
      from (
        select a.* from public.anexos a
        where a.empresa_id = p_empresa_id
          and a.deleted_at is null
          and a.status = 'ativo'
          and public.unit_scope_allows(p_empresa_id, a.unidade_id, p_unidade_id, true)
        order by a.created_at desc
        limit 12
      ) a
    ), '[]'::jsonb),
    'politica', jsonb_build_object(
      'somente_leitura', true,
      'anexos_nao_expostos', true,
      'acesso_requer_sessao', true
    )
  );
end;
$$;

create or replace function public.api_registrar_acesso_fiscalizacao(
  p_empresa_id uuid,
  p_unidade_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform public.assert_plan_feature(p_empresa_id, 'auditoria');
  if p_unidade_id is not null and not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'UNIT_ACCESS_DENIED' using errcode = '42501';
  end if;

  insert into public.logs_auditoria(empresa_id, unidade_id, usuario_id, modulo, acao)
  values (p_empresa_id, p_unidade_id, auth.uid(), 'fiscalizacao', 'painel_consultado');
end;
$$;

create or replace function public.api_partner_carteira_saude(p_parceiro_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_master() and not exists (
    select 1
    from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid()
      and ue.empresa_id = p_parceiro_empresa_id
      and ue.ativo
      and ue.deleted_at is null
      and ue.perfil in ('administrador', 'parceiro_administrador')
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'resumo', (
      with carteira as (
        select c.id
        from public.relacionamentos_parceiro_clientes rpc
        join public.empresas c on c.id = rpc.cliente_empresa_id and c.deleted_at is null
        where rpc.parceiro_empresa_id = p_parceiro_empresa_id
          and rpc.status <> 'encerrado'
      )
      select jsonb_build_object(
        'clientes', count(*),
        'clientes_em_risco', count(*) filter (where risco = 'alto'),
        'clientes_em_atencao', count(*) filter (where risco = 'medio'),
        'vencimentos_30d', coalesce(sum(vencimentos_30d), 0),
        'pendencias_criticas', coalesce(sum(pendencias_criticas), 0)
      )
      from (
        select
          c.id,
          (select count(*) from public.vw_documentos_status d where d.empresa_id = c.id and d.status_calculado in ('vencido', 'critico', 'vence_hoje', 'a_vencer'))::integer as vencimentos_30d,
          (select count(*) from public.pendencias p where p.empresa_id = c.id and p.deleted_at is null and p.status in ('pendente', 'em_andamento') and (p.prazo is null or p.prazo <= current_date + 30))::integer as pendencias_criticas,
          case
            when exists (select 1 from public.vw_documentos_status d where d.empresa_id = c.id and d.status_calculado in ('vencido', 'critico', 'vence_hoje'))
              or exists (select 1 from public.pendencias p where p.empresa_id = c.id and p.deleted_at is null and p.status in ('pendente', 'em_andamento') and p.prazo < current_date) then 'alto'
            when exists (select 1 from public.vw_documentos_status d where d.empresa_id = c.id and d.status_calculado in ('a_vencer', 'pendente_anexo')) then 'medio'
            else 'baixo'
          end as risco
        from carteira c
      ) indicadores
    ),
    'clientes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'empresa_id', x.empresa_id,
        'nome', x.nome,
        'cnpj', x.cnpj,
        'risco', x.risco,
        'vencimentos_30d', x.vencimentos_30d,
        'pendencias_criticas', x.pendencias_criticas,
        'proximo_vencimento', x.proximo_vencimento
      ) order by case x.risco when 'alto' then 0 when 'medio' then 1 else 2 end, x.proximo_vencimento nulls last, x.nome)
      from (
        select
          c.id as empresa_id,
          c.nome_fantasia as nome,
          c.cnpj,
          (select count(*) from public.vw_documentos_status d where d.empresa_id = c.id and d.status_calculado in ('vencido', 'critico', 'vence_hoje', 'a_vencer'))::integer as vencimentos_30d,
          (select count(*) from public.pendencias p where p.empresa_id = c.id and p.deleted_at is null and p.status in ('pendente', 'em_andamento') and (p.prazo is null or p.prazo <= current_date + 30))::integer as pendencias_criticas,
          (select min(d.data_vencimento) from public.vw_documentos_status d where d.empresa_id = c.id and d.data_vencimento >= current_date) as proximo_vencimento,
          case
            when exists (select 1 from public.vw_documentos_status d where d.empresa_id = c.id and d.status_calculado in ('vencido', 'critico', 'vence_hoje'))
              or exists (select 1 from public.pendencias p where p.empresa_id = c.id and p.deleted_at is null and p.status in ('pendente', 'em_andamento') and p.prazo < current_date) then 'alto'
            when exists (select 1 from public.vw_documentos_status d where d.empresa_id = c.id and d.status_calculado in ('a_vencer', 'pendente_anexo')) then 'medio'
            else 'baixo'
          end as risco
        from public.relacionamentos_parceiro_clientes rpc
        join public.empresas c on c.id = rpc.cliente_empresa_id and c.deleted_at is null
        where rpc.parceiro_empresa_id = p_parceiro_empresa_id
          and rpc.status <> 'encerrado'
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.api_auditoria_integridade(uuid, uuid) from public, anon;
revoke all on function public.api_copiloto_proximas_acoes(uuid, uuid) from public, anon;
revoke all on function public.api_registrar_acao_copiloto(uuid, text, text) from public, anon;
revoke all on function public.api_painel_fiscalizacao(uuid, uuid) from public, anon;
revoke all on function public.api_registrar_acesso_fiscalizacao(uuid, uuid) from public, anon;
revoke all on function public.api_partner_carteira_saude(uuid) from public, anon;

grant execute on function public.api_auditoria_integridade(uuid, uuid) to authenticated;
grant execute on function public.api_copiloto_proximas_acoes(uuid, uuid) to authenticated;
grant execute on function public.api_registrar_acao_copiloto(uuid, text, text) to authenticated;
grant execute on function public.api_painel_fiscalizacao(uuid, uuid) to authenticated;
grant execute on function public.api_registrar_acesso_fiscalizacao(uuid, uuid) to authenticated;
grant execute on function public.api_partner_carteira_saude(uuid) to authenticated;
