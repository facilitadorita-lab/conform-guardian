-- Conform Flow — planos comerciais finais e permissões reais por plano.
-- Regra central: o Supabase decide o que cada empresa pode ler/gravar.

do $$
begin
  update public.planos
  set codigo = 'essencial'
  where nome = 'Essencial' and coalesce(codigo, '') <> 'essencial';

  update public.planos
  set nome = 'Completo', codigo = 'completo'
  where nome = 'Profissional' or codigo = 'profissional';

  update public.planos
  set nome = 'Plano Rede', codigo = 'rede'
  where nome = 'Enterprise' or codigo = 'enterprise';
end $$;

insert into public.planos (
  nome, codigo, descricao, limite_usuarios, limite_documentos, limite_equipamentos,
  limite_storage_mb, valor_mensal_centavos, valor_anual_centavos, moeda, trial_dias,
  disponivel_venda, recursos, ativo, ordem
)
values
  (
    'Essencial',
    'essencial',
    'Dashboard completo, IA, documentos, anexos, vencimentos e alertas. Sem equipamentos, calibrações, qualificações, manutenções e pendências.',
    2,
    200,
    0,
    1024,
    11990,
    119900,
    'BRL',
    7,
    true,
    jsonb_build_object(
      'assistente_ia', true,
      'vencimentos', true,
      'documentos', true,
      'anexos', true,
      'alertas', true,
      'usuarios', true,
      'equipamentos', false,
      'calibracoes', false,
      'qualificacoes', false,
      'manutencoes', false,
      'pendencias', false,
      'relatorios', false,
      'auditoria', false,
      'multi_unidades', false,
      'suporte_prioritario', false
    ),
    true,
    10
  ),
  (
    'Completo',
    'completo',
    'Tudo do Essencial, com equipamentos, calibrações, qualificações, manutenções e pendências.',
    4,
    500,
    150,
    2048,
    15990,
    159900,
    'BRL',
    7,
    true,
    jsonb_build_object(
      'assistente_ia', true,
      'vencimentos', true,
      'documentos', true,
      'anexos', true,
      'alertas', true,
      'usuarios', true,
      'equipamentos', true,
      'calibracoes', true,
      'qualificacoes', true,
      'manutencoes', true,
      'pendencias', true,
      'relatorios', true,
      'auditoria', true,
      'multi_unidades', false,
      'suporte_prioritario', false
    ),
    true,
    20
  ),
  (
    'Plano Rede',
    'rede',
    'Tudo do Completo, com até 3 unidades, visão multiunidade, relatórios por unidade e visão consolidada.',
    8,
    1500,
    500,
    10240,
    28990,
    289900,
    'BRL',
    7,
    true,
    jsonb_build_object(
      'assistente_ia', true,
      'vencimentos', true,
      'documentos', true,
      'anexos', true,
      'alertas', true,
      'usuarios', true,
      'equipamentos', true,
      'calibracoes', true,
      'qualificacoes', true,
      'manutencoes', true,
      'pendencias', true,
      'relatorios', true,
      'auditoria', true,
      'multi_unidades', true,
      'suporte_prioritario', true
    ),
    true,
    30
  )
on conflict (codigo) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  limite_usuarios = excluded.limite_usuarios,
  limite_documentos = excluded.limite_documentos,
  limite_equipamentos = excluded.limite_equipamentos,
  limite_storage_mb = excluded.limite_storage_mb,
  valor_mensal_centavos = excluded.valor_mensal_centavos,
  valor_anual_centavos = excluded.valor_anual_centavos,
  moeda = excluded.moeda,
  trial_dias = excluded.trial_dias,
  disponivel_venda = excluded.disponivel_venda,
  recursos = excluded.recursos,
  ativo = excluded.ativo,
  ordem = excluded.ordem,
  updated_at = now();

update public.assinaturas_empresas a
set
  valor_mensal_centavos = p.valor_mensal_centavos,
  valor_anual_centavos = p.valor_anual_centavos,
  moeda = p.moeda,
  updated_at = now()
from public.planos p
where p.id = a.plano_id
  and a.deleted_at is null
  and a.desconto_centavos = 0
  and a.desconto_percentual = 0;

create or replace function public.api_contexto_usuario()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
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
  ) into result
  from public.usuarios u
  left join public.empresas e on e.deleted_at is null and (u.is_master or exists(
    select 1
    from public.usuarios_empresas allowed
    where allowed.usuario_id = u.id
      and allowed.empresa_id = e.id
      and allowed.ativo
      and allowed.deleted_at is null
  ))
  left join public.planos p on p.id = e.plano_id and p.ativo
  left join public.usuarios_empresas ue on ue.usuario_id = u.id
    and ue.empresa_id = e.id
    and ue.ativo
    and ue.deleted_at is null
  where u.id = auth.uid()
    and u.deleted_at is null
  group by u.id;

  if result is null then
    raise exception 'Perfil não encontrado';
  end if;

  return result;
end $$;

create or replace function public.api_dashboard(p_empresa_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'documentos', jsonb_build_object(
      'total', count(*),
      'em_dia', count(*) filter(where status_calculado = 'em_dia'),
      'vencidos', count(*) filter(where status_calculado = 'vencido'),
      'criticos', count(*) filter(where status_calculado in ('vence_hoje','critico')),
      'a_vencer_30', count(*) filter(where status_calculado in ('vence_hoje','critico','a_vencer')),
      'pendentes_anexo', count(*) filter(where status_calculado = 'pendente_anexo')
    ),
    'equipamentos', case when public.plan_feature_enabled(p_empresa_id, 'equipamentos') then (select jsonb_build_object(
      'total', count(*),
      'conformes', count(*) filter(where status_consolidado = 'em_dia'),
      'atencao', count(*) filter(where status_consolidado <> 'em_dia')
    ) from public.vw_equipamentos_conformidade where empresa_id = p_empresa_id) else jsonb_build_object('total',0,'conformes',0,'atencao',0) end,
    'manutencoes', case when public.plan_feature_enabled(p_empresa_id, 'manutencoes') then (select jsonb_build_object(
      'vencidas', count(*) filter(where status_calculado = 'vencido'),
      'a_vencer', count(*) filter(where status_calculado in ('vence_hoje','critico','a_vencer'))
    ) from public.vw_manutencoes_status where empresa_id = p_empresa_id) else jsonb_build_object('vencidas',0,'a_vencer',0) end,
    'pendencias', case when public.plan_feature_enabled(p_empresa_id, 'pendencias') then (select jsonb_build_object(
      'abertas', count(*) filter(where status in ('pendente','em_andamento')),
      'sem_responsavel', count(*) filter(where responsavel_id is null and status in ('pendente','em_andamento'))
    ) from public.pendencias where empresa_id = p_empresa_id and deleted_at is null) else jsonb_build_object('abertas',0,'sem_responsavel',0) end,
    'conformidade_percentual', case when count(*) = 0 then 100 else round(100.0 * count(*) filter(where status_calculado in ('em_dia','sem_validade')) / count(*), 1) end,
    'pendencias_criticas', case when public.plan_feature_enabled(p_empresa_id, 'pendencias') then (select coalesce(jsonb_agg(x order by x->>'prazo'), '[]'::jsonb) from (
      select jsonb_build_object('id', p.id, 'modulo', p.modulo, 'registro_id', p.registro_id, 'titulo', p.titulo, 'prazo', p.prazo, 'status', p.status, 'responsavel_id', p.responsavel_id) x
      from public.pendencias p
      where p.empresa_id = p_empresa_id
        and p.deleted_at is null
        and p.status in ('pendente','em_andamento')
      order by p.prazo nulls last
      limit 8
    ) critical) else '[]'::jsonb end
  ) into result
  from public.vw_documentos_status
  where empresa_id = p_empresa_id;

  return result;
end $$;

create or replace function public.api_listar_documentos(
  p_empresa_id uuid, p_busca text default null, p_status text default null, p_limite integer default 25, p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  perform public.assert_plan_feature(p_empresa_id, 'documentos');
  p_limite := least(greatest(p_limite, 1), 100);
  p_offset := greatest(p_offset, 0);
  with filtered as (
    select d.* from public.vw_documentos_status d where d.empresa_id = p_empresa_id
      and (p_busca is null or d.nome ilike '%' || p_busca || '%' or coalesce(d.numero_documento, '') ilike '%' || p_busca || '%')
      and (p_status is null or d.status_calculado = p_status)
  ), page as (select * from filtered order by data_vencimento nulls last, nome limit p_limite offset p_offset)
  select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb), 'total', (select count(*) from filtered), 'limit', p_limite, 'offset', p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_equipamentos(
  p_empresa_id uuid, p_busca text default null, p_status text default null, p_limite integer default 25, p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  perform public.assert_plan_feature(p_empresa_id, 'equipamentos');
  p_limite := least(greatest(p_limite, 1), 100);
  p_offset := greatest(p_offset, 0);
  with filtered as (
    select e.* from public.vw_equipamentos_conformidade e where e.empresa_id = p_empresa_id
      and (p_busca is null or e.nome ilike '%' || p_busca || '%' or coalesce(e.codigo_interno, '') ilike '%' || p_busca || '%' or coalesce(e.numero_serie, '') ilike '%' || p_busca || '%')
      and (p_status is null or e.status_consolidado = p_status)
  ), page as (select * from filtered order by nome limit p_limite offset p_offset)
  select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb), 'total', (select count(*) from filtered), 'limit', p_limite, 'offset', p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_manutencoes(
  p_empresa_id uuid, p_busca text default null, p_status text default null, p_natureza text default null,
  p_equipamento_id uuid default null, p_limite integer default 25, p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  perform public.assert_plan_feature(p_empresa_id, 'manutencoes');
  p_limite := least(greatest(p_limite, 1), 100);
  p_offset := greatest(p_offset, 0);
  with filtered as (
    select m.*, e.nome equipamento_nome, coalesce(e.nome, m.nome_servico) item_nome
    from public.vw_manutencoes_status m left join public.equipamentos e on e.id = m.equipamento_id
    where m.empresa_id = p_empresa_id
      and (p_busca is null or coalesce(e.nome, m.nome_servico, '') ilike '%' || p_busca || '%' or coalesce(m.numero_ordem_servico, '') ilike '%' || p_busca || '%')
      and (p_status is null or m.status_calculado = p_status)
      and (p_natureza is null or m.natureza = p_natureza)
      and (p_equipamento_id is null or m.equipamento_id = p_equipamento_id)
  ), page as (select * from filtered order by proxima_manutencao nulls last limit p_limite offset p_offset)
  select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb), 'total', (select count(*) from filtered), 'limit', p_limite, 'offset', p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_pendencias(
  p_empresa_id uuid, p_status text default null, p_responsavel_id uuid default null, p_limite integer default 25, p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  perform public.assert_plan_feature(p_empresa_id, 'pendencias');
  p_limite := least(greatest(p_limite, 1), 100);
  p_offset := greatest(p_offset, 0);
  with filtered as (
    select p.*, u.nome responsavel_nome, (current_date - p.prazo) dias_atraso
    from public.pendencias p left join public.usuarios u on u.id = p.responsavel_id
    where p.empresa_id = p_empresa_id and p.deleted_at is null
      and (p_status is null or p.status = p_status) and (p_responsavel_id is null or p.responsavel_id = p_responsavel_id)
  ), page as (select * from filtered order by prazo nulls last limit p_limite offset p_offset)
  select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb), 'total', (select count(*) from filtered), 'limit', p_limite, 'offset', p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_alertas(p_empresa_id uuid, p_somente_nao_lidos boolean default false, p_limite integer default 50)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  perform public.assert_plan_feature(p_empresa_id, 'alertas');
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) into result from (
    select id, modulo, registro_id, titulo, mensagem, data_vencimento, status, created_at
    from public.alertas
    where empresa_id = p_empresa_id and usuario_id = auth.uid() and deleted_at is null
      and (not p_somente_nao_lidos or status = 'nao_lido')
    order by created_at desc
    limit least(greatest(p_limite, 1), 100)
  ) a;
  return result;
end $$;

create or replace function public.api_equipamento_detalhe(p_empresa_id uuid, p_equipamento_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  perform public.assert_plan_feature(p_empresa_id, 'equipamentos');
  if not exists(select 1 from public.equipamentos where id = p_equipamento_id and empresa_id = p_empresa_id and deleted_at is null) then raise exception 'Equipamento não encontrado'; end if;
  select jsonb_build_object(
    'equipamento', to_jsonb(e),
    'calibracoes', case when public.plan_feature_enabled(p_empresa_id, 'calibracoes') then (select coalesce(jsonb_agg(to_jsonb(c) order by c.data_calibracao desc), '[]'::jsonb) from public.vw_calibracoes_status c where c.empresa_id = p_empresa_id and c.equipamento_id = p_equipamento_id) else '[]'::jsonb end,
    'qualificacoes', case when public.plan_feature_enabled(p_empresa_id, 'qualificacoes') then (select coalesce(jsonb_agg(to_jsonb(q) order by q.data_qualificacao desc), '[]'::jsonb) from public.vw_qualificacoes_status q where q.empresa_id = p_empresa_id and q.equipamento_id = p_equipamento_id) else '[]'::jsonb end,
    'manutencoes', case when public.plan_feature_enabled(p_empresa_id, 'manutencoes') then (select coalesce(jsonb_agg(to_jsonb(m) order by m.data_manutencao desc), '[]'::jsonb) from public.vw_manutencoes_status m where m.empresa_id = p_empresa_id and m.equipamento_id = p_equipamento_id) else '[]'::jsonb end,
    'anexos', case when public.plan_feature_enabled(p_empresa_id, 'anexos') then (select coalesce(jsonb_agg(to_jsonb(a) - 'storage_path' order by a.created_at desc), '[]'::jsonb) from public.anexos a where a.empresa_id = p_empresa_id and a.deleted_at is null and (
      (a.modulo = 'equipamentos' and a.registro_id = p_equipamento_id) or
      (public.plan_feature_enabled(p_empresa_id, 'calibracoes') and a.modulo = 'calibracoes' and a.registro_id in(select id from public.calibracoes where equipamento_id = p_equipamento_id)) or
      (public.plan_feature_enabled(p_empresa_id, 'qualificacoes') and a.modulo = 'qualificacoes' and a.registro_id in(select id from public.qualificacoes where equipamento_id = p_equipamento_id)) or
      (public.plan_feature_enabled(p_empresa_id, 'manutencoes') and a.modulo = 'manutencoes' and a.registro_id in(select id from public.manutencoes where equipamento_id = p_equipamento_id))
    )) else '[]'::jsonb end,
    'historico', case when public.plan_feature_enabled(p_empresa_id, 'auditoria') then (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc), '[]'::jsonb) from (
      select * from public.logs_auditoria where empresa_id = p_empresa_id and (
        (modulo = 'equipamentos' and registro_id = p_equipamento_id) or
        (public.plan_feature_enabled(p_empresa_id, 'calibracoes') and modulo = 'calibracoes' and registro_id in(select id from public.calibracoes where equipamento_id = p_equipamento_id)) or
        (public.plan_feature_enabled(p_empresa_id, 'qualificacoes') and modulo = 'qualificacoes' and registro_id in(select id from public.qualificacoes where equipamento_id = p_equipamento_id)) or
        (public.plan_feature_enabled(p_empresa_id, 'manutencoes') and modulo = 'manutencoes' and registro_id in(select id from public.manutencoes where equipamento_id = p_equipamento_id))
      ) order by created_at desc limit 100
    ) l) else '[]'::jsonb end
  ) into result
  from public.vw_equipamentos_conformidade e
  where e.id = p_equipamento_id and e.empresa_id = p_empresa_id;
  return result;
end $$;

create or replace function public.api_assistente_contexto(
  p_empresa_id uuid,
  p_escopo text default 'geral',
  p_equipamento_id uuid default null,
  p_setor text default null
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

  perform public.assert_plan_feature(p_empresa_id, 'assistente_ia');

  if p_equipamento_id is not null and not public.plan_feature_enabled(p_empresa_id, 'equipamentos') then
    raise exception 'Equipamentos não estão disponíveis no plano contratado.' using errcode = '42501';
  end if;

  if p_equipamento_id is not null and not exists (
    select 1 from public.equipamentos e
    where e.id = p_equipamento_id
      and e.empresa_id = p_empresa_id
      and e.deleted_at is null
  ) then
    raise exception 'Equipamento não encontrado na empresa informada.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'politica_privacidade', jsonb_build_object(
      'le_anexos', false,
      'usa_storage_path', false,
      'fontes', 'somente metadados estruturados do banco'
    ),
    'equipamentos', case when public.plan_feature_enabled(p_empresa_id, 'equipamentos') then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id,
        'nome', e.nome,
        'codigo', e.codigo_interno,
        'setor', e.setor,
        'criticidade', e.criticidade,
        'status_consolidado', ec.status_consolidado,
        'status_calibracao', ec.status_calibracao,
        'status_qualificacao', ec.status_qualificacao,
        'status_manutencao', ec.status_manutencao
      ) order by e.nome), '[]'::jsonb)
      from public.equipamentos e
      left join public.vw_equipamentos_conformidade ec on ec.id = e.id
      where e.empresa_id = p_empresa_id
        and e.deleted_at is null
        and (p_equipamento_id is null or e.id = p_equipamento_id)
        and (p_setor is null or lower(e.setor) = lower(p_setor))
    ) else '[]'::jsonb end,
    'manutencoes', case when public.plan_feature_enabled(p_empresa_id, 'manutencoes') then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'equipamento_id', m.equipamento_id,
        'equipamento', e.nome,
        'setor', e.setor,
        'natureza', m.natureza,
        'tipo_servico', m.tipo_servico,
        'status_execucao', m.status_execucao,
        'data_manutencao', m.data_manutencao,
        'proxima_manutencao', m.proxima_manutencao,
        'status_calculado', vm.status_calculado,
        'prioridade', m.prioridade
      ) order by m.proxima_manutencao nulls last, m.data_manutencao desc), '[]'::jsonb)
      from public.manutencoes m
      left join public.equipamentos e on e.id = m.equipamento_id
      left join public.vw_manutencoes_status vm on vm.id = m.id
      where m.empresa_id = p_empresa_id
        and m.deleted_at is null
        and (p_equipamento_id is null or m.equipamento_id = p_equipamento_id)
        and (p_setor is null or lower(e.setor) = lower(p_setor))
      limit 50
    ) else '[]'::jsonb end,
    'vencimentos', (
      select coalesce(jsonb_agg(item order by item->>'data_vencimento'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'modulo', 'documentos',
          'registro_id', d.id,
          'titulo', d.nome,
          'data_vencimento', d.data_vencimento,
          'status', d.status_calculado
        ) item
        from public.vw_documentos_status d
        where d.empresa_id = p_empresa_id
          and public.plan_feature_enabled(p_empresa_id, 'documentos')
          and d.data_vencimento is not null
          and d.status_calculado in ('vencido','vence_hoje','critico','a_vencer','atencao')
        union all
        select jsonb_build_object(
          'modulo', 'calibracoes',
          'registro_id', c.id,
          'titulo', 'Calibração — ' || e.nome,
          'data_vencimento', c.data_vencimento,
          'status', c.status_calculado
        )
        from public.vw_calibracoes_status c
        join public.equipamentos e on e.id = c.equipamento_id
        where c.empresa_id = p_empresa_id
          and public.plan_feature_enabled(p_empresa_id, 'calibracoes')
          and (p_equipamento_id is null or c.equipamento_id = p_equipamento_id)
          and (p_setor is null or lower(e.setor) = lower(p_setor))
          and c.data_vencimento is not null
          and c.status_calculado in ('vencido','vence_hoje','critico','a_vencer','atencao')
        union all
        select jsonb_build_object(
          'modulo', 'qualificacoes',
          'registro_id', q.id,
          'titulo', 'Qualificação — ' || e.nome,
          'data_vencimento', q.data_vencimento,
          'status', q.status_calculado
        )
        from public.vw_qualificacoes_status q
        join public.equipamentos e on e.id = q.equipamento_id
        where q.empresa_id = p_empresa_id
          and public.plan_feature_enabled(p_empresa_id, 'qualificacoes')
          and (p_equipamento_id is null or q.equipamento_id = p_equipamento_id)
          and (p_setor is null or lower(e.setor) = lower(p_setor))
          and q.data_vencimento is not null
          and q.status_calculado in ('vencido','vence_hoje','critico','a_vencer','atencao')
        limit 50
      ) s
    ),
    'documentos', case when public.plan_feature_enabled(p_empresa_id, 'documentos') then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id,
        'modulo', 'documentos',
        'titulo', d.nome,
        'nome', d.nome,
        'numero_documento', d.numero_documento,
        'orgao_emissor', d.orgao_emissor,
        'setor', d.setor_unidade,
        'data_emissao', d.data_emissao,
        'data_vencimento', d.data_vencimento,
        'status', d.status_calculado,
        'status_calculado', d.status_calculado,
        'categoria', c.nome,
        'tipo', t.nome,
        'responsavel', u.nome,
        'tem_anexo', public.tem_anexo_ativo(d.empresa_id, 'documentos', d.id)
      ) order by d.data_vencimento nulls last, d.nome), '[]'::jsonb)
      from public.vw_documentos_status d
      left join public.categorias_documentos c on c.id = d.categoria_id
      left join public.tipos_documentos t on t.id = d.tipo_documento_id
      left join public.usuarios u on u.id = d.responsavel_id
      where d.empresa_id = p_empresa_id
        and (p_setor is null or lower(d.setor_unidade) = lower(p_setor))
      limit 100
    ) else '[]'::jsonb end,
    'pendencias', case when public.plan_feature_enabled(p_empresa_id, 'pendencias') then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'modulo', p.modulo,
        'registro_id', p.registro_id,
        'titulo', p.titulo,
        'prazo', p.prazo,
        'status', p.status
      ) order by p.prazo nulls last), '[]'::jsonb)
      from public.pendencias p
      where p.empresa_id = p_empresa_id
        and p.deleted_at is null
        and p.status in ('pendente','em_andamento')
    ) else '[]'::jsonb end
  );
end $$;

drop policy if exists logs_read on public.logs_auditoria;
create policy logs_read on public.logs_auditoria
  for select to authenticated using (
    public.has_company_access(empresa_id)
    and (public.is_master() or public.plan_feature_enabled(empresa_id, 'auditoria'))
  );

revoke all on function public.api_contexto_usuario() from public, anon;
revoke all on function public.api_dashboard(uuid) from public, anon;
revoke all on function public.api_listar_documentos(uuid,text,text,integer,integer) from public, anon;
revoke all on function public.api_listar_equipamentos(uuid,text,text,integer,integer) from public, anon;
revoke all on function public.api_listar_manutencoes(uuid,text,text,text,uuid,integer,integer) from public, anon;
revoke all on function public.api_listar_pendencias(uuid,text,uuid,integer,integer) from public, anon;
revoke all on function public.api_listar_alertas(uuid,boolean,integer) from public, anon;
revoke all on function public.api_equipamento_detalhe(uuid,uuid) from public, anon;
revoke all on function public.api_assistente_contexto(uuid,text,uuid,text) from public, anon;

grant execute on function public.api_contexto_usuario() to authenticated;
grant execute on function public.api_dashboard(uuid) to authenticated;
grant execute on function public.api_listar_documentos(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.api_listar_equipamentos(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.api_listar_manutencoes(uuid,text,text,text,uuid,integer,integer) to authenticated;
grant execute on function public.api_listar_pendencias(uuid,text,uuid,integer,integer) to authenticated;
grant execute on function public.api_listar_alertas(uuid,boolean,integer) to authenticated;
grant execute on function public.api_equipamento_detalhe(uuid,uuid) to authenticated;
grant execute on function public.api_assistente_contexto(uuid,text,uuid,text) to authenticated;
