-- Conform Flow — auditoria avançada, matriz documental, relatório IA e onboarding.

create or replace function public.audit_risk_level(p_acao text, p_modulo text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_acao, '')) similar to '%(exclusao|delete|substituicao|permiss|bloqueio|inadimpl|admin|master)%' then 'alto'
    when lower(coalesce(p_acao, '')) similar to '%(download|visualizacao|upload|alteracao|update)%' then 'medio'
    else 'baixo'
  end
$$;

create or replace function public.audit_category(p_acao text, p_modulo text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_acao, '')) like '%download%' then 'Download'
    when lower(coalesce(p_acao, '')) like '%visualizacao%' then 'Visualização'
    when lower(coalesce(p_acao, '')) like '%upload%' then 'Upload'
    when lower(coalesce(p_acao, '')) like '%substituicao%' then 'Substituição'
    when lower(coalesce(p_acao, '')) like '%exclusao%' then 'Exclusão lógica'
    when lower(coalesce(p_acao, '')) like '%permiss%' then 'Permissões'
    when lower(coalesce(p_modulo, '')) = 'documentos' then 'Documentos'
    when lower(coalesce(p_modulo, '')) = 'anexos' then 'Anexos'
    else initcap(coalesce(p_modulo, 'Sistema'))
  end
$$;

create or replace function public.api_auditoria_avancada(
  p_empresa_id uuid,
  p_limite integer default 150
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  perform public.assert_plan_feature(p_empresa_id, 'auditoria');

  p_limite := least(greatest(coalesce(p_limite, 150), 1), 300);

  return jsonb_build_object(
    'resumo', jsonb_build_object(
      'eventos_30d', (
        select count(*) from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
      ),
      'eventos_alto_risco_30d', (
        select count(*) from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
          and public.audit_risk_level(l.acao, l.modulo) = 'alto'
      ),
      'downloads_30d', (
        select count(*) from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
          and lower(l.acao) like '%download%'
      ),
      'visualizacoes_30d', (
        select count(*) from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
          and lower(l.acao) like '%visualizacao%'
      ),
      'substituicoes_30d', (
        select count(*) from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
          and lower(l.acao) like '%substituicao%'
      )
    ),
    'por_modulo', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.total desc), '[]'::jsonb)
      from (
        select l.modulo, count(*) total
        from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
        group by l.modulo
      ) x
    ),
    'eventos', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (
        select
          l.id,
          l.created_at,
          coalesce(u.nome, 'Sistema') as usuario,
          l.acao,
          l.modulo,
          l.registro_id,
          l.ip::text as ip,
          l.user_agent,
          public.audit_risk_level(l.acao, l.modulo) as risco,
          public.audit_category(l.acao, l.modulo) as categoria,
          l.valor_anterior,
          l.novo_valor
        from public.logs_auditoria l
        left join public.usuarios u on u.id = l.usuario_id
        where l.empresa_id = p_empresa_id
        order by l.created_at desc
        limit p_limite
      ) x
    )
  );
end $$;

create or replace function public.api_matriz_documental_empresa(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_empresa public.empresas;
  v_chaves text[];
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  perform public.assert_plan_feature(p_empresa_id, 'documentos');

  select * into v_empresa
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null;

  if not found then
    raise exception 'Empresa não encontrada' using errcode='P0002';
  end if;

  v_chaves := public.segmento_documental_chaves(v_empresa.tipo_estabelecimento, v_empresa.segmento);

  return jsonb_build_object(
    'empresa', jsonb_build_object(
      'id', v_empresa.id,
      'nome', v_empresa.nome_fantasia,
      'tipo_estabelecimento', v_empresa.tipo_estabelecimento,
      'segmento', v_empresa.segmento
    ),
    'chaves', v_chaves,
    'resumo', jsonb_build_object(
      'exigidos', (
        select count(*)
        from public.modelos_documentos_segmento m
        where m.deleted_at is null
          and m.ativo
          and m.segmento_chave = any(v_chaves)
      ),
      'cadastrados', (
        select count(*)
        from public.modelos_documentos_segmento m
        where m.deleted_at is null
          and m.ativo
          and m.segmento_chave = any(v_chaves)
          and exists (
            select 1 from public.documentos d
            where d.empresa_id = p_empresa_id
              and d.deleted_at is null
              and lower(d.nome) = lower(m.nome)
          )
      )
    ),
    'itens', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'segmento_chave', m.segmento_chave,
        'nome', m.nome,
        'categoria', m.categoria_nome,
        'tipo', m.tipo_documento_nome,
        'orgao', m.orgao_emissor_padrao,
        'periodicidade_meses', m.periodicidade_meses,
        'setor', m.setor_padrao,
        'obrigatorio', m.obrigatorio,
        'observacoes', m.observacoes,
        'documento_id', d.id,
        'status', case when d.id is null then 'pendente_cadastro' else coalesce(vd.status_calculado, 'cadastrado') end
      ) order by case when m.segmento_chave = 'comum' then 0 else 1 end, m.segmento_chave, m.nome), '[]'::jsonb)
      from public.modelos_documentos_segmento m
      left join lateral (
        select d.*
        from public.documentos d
        where d.empresa_id = p_empresa_id
          and d.deleted_at is null
          and lower(d.nome) = lower(m.nome)
        order by d.created_at desc
        limit 1
      ) d on true
      left join public.vw_documentos_status vd on vd.id = d.id
      where m.deleted_at is null
        and m.ativo
        and m.segmento_chave = any(v_chaves)
    )
  );
end $$;

create or replace function public.api_onboarding_empresa(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_docs_total integer;
  v_docs_com_anexo integer;
  v_usuarios integer;
  v_equipamentos integer;
  v_pendencias integer;
  v_matriz jsonb;
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select count(*) into v_docs_total
  from public.documentos d
  where d.empresa_id = p_empresa_id
    and d.deleted_at is null;

  select count(*) into v_docs_com_anexo
  from public.documentos d
  where d.empresa_id = p_empresa_id
    and d.deleted_at is null
    and (not d.exige_anexo or public.tem_anexo_ativo(d.empresa_id, 'documentos', d.id));

  select count(*) into v_usuarios
  from public.usuarios_empresas ue
  join public.usuarios u on u.id = ue.usuario_id
  where ue.empresa_id = p_empresa_id
    and ue.ativo
    and ue.deleted_at is null
    and u.status = 'ativo'
    and u.deleted_at is null;

  select count(*) into v_equipamentos
  from public.equipamentos e
  where e.empresa_id = p_empresa_id
    and e.deleted_at is null;

  select count(*) into v_pendencias
  from public.pendencias p
  where p.empresa_id = p_empresa_id
    and p.deleted_at is null
    and p.status in ('pendente','em_andamento');

  v_matriz := public.api_matriz_documental_empresa(p_empresa_id);

  return (
    with items as (
      select * from (values
        ('dados_empresa', 'Dados da empresa revisados', 'Confirmar CNPJ, e-mail, responsáveis e segmento.', true),
        ('usuarios', 'Usuários cadastrados', 'Cadastrar pelo menos dois usuários ativos para continuidade operacional.', v_usuarios >= 2),
        ('matriz_documental', 'Matriz documental criada', 'Validar documentos exigidos pelo tipo de estabelecimento.', coalesce((v_matriz->'resumo'->>'exigidos')::int, 0) > 0),
        ('documentos', 'Documentos iniciais cadastrados', 'Ter pelo menos um documento estruturado no ambiente.', v_docs_total > 0),
        ('anexos', 'Evidências anexadas', 'Anexar arquivos aos documentos que exigem evidência.', v_docs_total > 0 and v_docs_com_anexo = v_docs_total),
        ('equipamentos', 'Equipamentos avaliados', 'Cadastrar equipamentos se o plano/módulo operacional estiver contratado.', (not public.plan_feature_enabled(p_empresa_id, 'equipamentos')) or v_equipamentos > 0),
        ('pendencias', 'Pendências sob controle', 'Resolver ou atribuir pendências abertas.', v_pendencias = 0)
      ) as t(id, titulo, descricao, concluido)
    )
    select jsonb_build_object(
      'progresso_percentual', round(100.0 * count(*) filter(where concluido) / nullif(count(*), 0)),
      'concluidos', count(*) filter(where concluido),
      'total', count(*),
      'itens', coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'titulo', titulo,
        'descricao', descricao,
        'concluido', concluido
      )), '[]'::jsonb)
    )
    from items
  );
end $$;

create or replace function public.api_relatorio_executivo_ia(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_empresa public.empresas;
  v_dashboard jsonb;
  v_matriz jsonb;
  v_onboarding jsonb;
  v_indice numeric;
  v_risco text;
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  perform public.assert_plan_feature(p_empresa_id, 'relatorios');
  perform public.assert_plan_feature(p_empresa_id, 'assistente_ia');

  select * into v_empresa
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null;

  if not found then
    raise exception 'Empresa não encontrada' using errcode='P0002';
  end if;

  v_dashboard := public.api_dashboard(p_empresa_id);
  v_matriz := public.api_matriz_documental_empresa(p_empresa_id);
  v_onboarding := public.api_onboarding_empresa(p_empresa_id);
  v_indice := coalesce((v_dashboard->>'conformidade_percentual')::numeric, 0);
  v_risco := case
    when v_indice >= 95 then 'baixo'
    when v_indice >= 85 then 'moderado'
    when v_indice >= 70 then 'alto'
    else 'crítico'
  end;

  return jsonb_build_object(
    'empresa', jsonb_build_object(
      'id', v_empresa.id,
      'razao_social', v_empresa.razao_social,
      'nome_fantasia', v_empresa.nome_fantasia,
      'cnpj', v_empresa.cnpj,
      'tipo_estabelecimento', v_empresa.tipo_estabelecimento,
      'segmento', v_empresa.segmento
    ),
    'gerado_em', now(),
    'politica_ia', jsonb_build_object(
      'tipo', 'IA estruturada segura',
      'leu_anexos', false,
      'fonte', 'dados estruturados do banco'
    ),
    'resumo', jsonb_build_object(
      'indice_conformidade', v_indice,
      'risco_operacional', v_risco,
      'documentos_vencidos', coalesce((v_dashboard->'documentos'->>'vencidos')::int, 0),
      'vencendo_30_dias', coalesce((v_dashboard->'documentos'->>'a_vencer_30')::int, 0),
      'equipamentos_atencao', coalesce((v_dashboard->'equipamentos'->>'atencao')::int, 0),
      'manutencoes_vencidas', coalesce((v_dashboard->'manutencoes'->>'vencidas')::int, 0),
      'pendencias_abertas', coalesce((v_dashboard->'pendencias'->>'abertas')::int, 0),
      'onboarding_percentual', coalesce((v_onboarding->>'progresso_percentual')::int, 0),
      'matriz_exigidos', coalesce((v_matriz->'resumo'->>'exigidos')::int, 0),
      'matriz_cadastrados', coalesce((v_matriz->'resumo'->>'cadastrados')::int, 0)
    ),
    'analise_ia', jsonb_build_array(
      case
        when v_indice >= 95 then 'A empresa apresenta boa maturidade operacional. A prioridade é manter rotina de monitoramento e evidências atualizadas.'
        when v_indice >= 85 then 'A empresa está em condição operacional aceitável, mas há itens que podem virar não conformidade se não forem tratados nos próximos ciclos.'
        else 'A empresa exige plano de ação imediato. Priorize vencidos, pendências sem responsável e evidências ausentes.'
      end,
      'A análise usa somente metadados estruturados: datas, status, responsáveis, módulos e histórico. Nenhum PDF ou anexo confidencial foi lido.',
      'A matriz documental deve ser revisada sempre que o tipo de estabelecimento, segmento ou escopo regulatório mudar.'
    ),
    'recomendacoes', (
      select jsonb_agg(recomendacao)
      from (
        select 'Regularizar documentos vencidos antes de tratar itens apenas a vencer.' recomendacao
        where coalesce((v_dashboard->'documentos'->>'vencidos')::int, 0) > 0
        union all
        select 'Atribuir responsáveis para pendências abertas e itens sem dono operacional.'
        where coalesce((v_dashboard->'pendencias'->>'sem_responsavel')::int, 0) > 0
        union all
        select 'Concluir anexos/evidências dos documentos obrigatórios para fortalecer a rastreabilidade.'
        where coalesce((v_dashboard->'documentos'->>'pendentes_anexo')::int, 0) > 0
        union all
        select 'Revisar a matriz documental do segmento e confirmar se todos os documentos exigidos foram cadastrados.'
        where coalesce((v_matriz->'resumo'->>'cadastrados')::int, 0) < coalesce((v_matriz->'resumo'->>'exigidos')::int, 0)
        union all
        select 'Manter rotina mensal de auditoria e exportar este relatório para acompanhamento executivo.'
      ) r
    ),
    'itens_criticos', coalesce(v_dashboard->'pendencias_criticas', '[]'::jsonb),
    'matriz_documental', v_matriz,
    'onboarding', v_onboarding
  );
end $$;

revoke all on function public.audit_risk_level(text,text) from public, anon;
revoke all on function public.audit_category(text,text) from public, anon;
revoke all on function public.api_auditoria_avancada(uuid,integer) from public, anon;
revoke all on function public.api_matriz_documental_empresa(uuid) from public, anon;
revoke all on function public.api_onboarding_empresa(uuid) from public, anon;
revoke all on function public.api_relatorio_executivo_ia(uuid) from public, anon;

grant execute on function public.audit_risk_level(text,text) to authenticated;
grant execute on function public.audit_category(text,text) to authenticated;
grant execute on function public.api_auditoria_avancada(uuid,integer) to authenticated;
grant execute on function public.api_matriz_documental_empresa(uuid) to authenticated;
grant execute on function public.api_onboarding_empresa(uuid) to authenticated;
grant execute on function public.api_relatorio_executivo_ia(uuid) to authenticated;
