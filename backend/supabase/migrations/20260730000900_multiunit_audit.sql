-- Conform Flow — auditoria avançada com isolamento por unidade.

-- Mantém os gatilhos de auditoria existentes, mas passa a registrar o contexto
-- operacional da unidade e ações semânticas relevantes para multiunidade.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_payload jsonb;
  v_empresa_id uuid;
  v_registro_id uuid;
  v_unidade_id uuid;
  v_acao text;
begin
  v_old := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_new := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_payload := coalesce(v_new, v_old, '{}'::jsonb);
  v_empresa_id := nullif(v_payload ->> 'empresa_id', '')::uuid;
  v_registro_id := nullif(v_payload ->> 'id', '')::uuid;
  v_unidade_id := case
    when tg_table_name = 'unidades' then v_registro_id
    else nullif(v_payload ->> 'unidade_id', '')::uuid
  end;

  v_acao := case
    when tg_op = 'INSERT' and tg_table_name = 'usuarios_unidades'
      then 'vinculo_usuario_unidade'
    when tg_op = 'INSERT' then 'criacao'
    when tg_op = 'DELETE' then 'exclusao_fisica_bloqueada'
    when (v_old ->> 'deleted_at') is null and (v_new ->> 'deleted_at') is not null
      then 'exclusao_logica'
    when tg_table_name = 'unidades'
      and coalesce(v_old ->> 'status', '') <> 'arquivada'
      and v_new ->> 'status' = 'arquivada'
      then 'arquivamento'
    when tg_table_name = 'unidades'
      and v_old ->> 'status' = 'arquivada'
      and v_new ->> 'status' <> 'arquivada'
      then 'reativacao'
    when tg_table_name = 'unidades'
      and v_old ->> 'status' <> 'inativa'
      and v_new ->> 'status' = 'inativa'
      then 'inativacao'
    when tg_table_name = 'unidades'
      and coalesce((v_old ->> 'is_matriz')::boolean, false) = false
      and coalesce((v_new ->> 'is_matriz')::boolean, false) = true
      then 'definicao_matriz'
    when tg_table_name = 'usuarios_unidades'
      and coalesce((v_old ->> 'ativo')::boolean, false) = true
      and coalesce((v_new ->> 'ativo')::boolean, false) = false
      then 'remocao_vinculo_usuario_unidade'
    else 'edicao'
  end;

  insert into public.logs_auditoria (
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
    v_empresa_id,
    v_unidade_id,
    auth.uid(),
    tg_table_name,
    v_acao,
    v_registro_id,
    v_old,
    v_new
  );

  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create or replace function public.api_registrar_troca_unidade(
  p_empresa_id uuid,
  p_unidade_anterior_id uuid default null,
  p_unidade_atual_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not public.has_company_access(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_unidade_atual_id is null then
    if not public.can_use_consolidated_view(p_empresa_id) then
      raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
    end if;
  elsif not public.can_read_unit(p_empresa_id, p_unidade_atual_id) then
    raise exception 'UNIT_ACCESS_DENIED' using errcode = '42501';
  end if;

  if p_unidade_anterior_id is not null
    and not public.unit_belongs_to_company(p_empresa_id, p_unidade_anterior_id)
  then
    raise exception 'PREVIOUS_UNIT_COMPANY_MISMATCH' using errcode = '23514';
  end if;

  insert into public.logs_auditoria (
    empresa_id,
    unidade_id,
    usuario_id,
    modulo,
    acao,
    novo_valor
  )
  values (
    p_empresa_id,
    p_unidade_atual_id,
    auth.uid(),
    'unidades',
    'troca_unidade',
    jsonb_build_object(
      'unidade_anterior_id', p_unidade_anterior_id,
      'unidade_atual_id', p_unidade_atual_id,
      'visao_consolidada', p_unidade_atual_id is null
    )
  );
end
$$;

create or replace function public.api_auditoria_avancada_unidade(
  p_empresa_id uuid,
  p_unidade_id uuid default null,
  p_limite integer default 150
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

  perform public.assert_plan_feature(p_empresa_id, 'auditoria');

  if p_unidade_id is null then
    if not public.can_use_consolidated_view(p_empresa_id) then
      raise exception 'CONSOLIDATED_VIEW_FORBIDDEN' using errcode = '42501';
    end if;
  elsif not public.can_read_unit(p_empresa_id, p_unidade_id) then
    raise exception 'UNIT_ACCESS_DENIED' using errcode = '42501';
  end if;

  p_limite := least(greatest(coalesce(p_limite, 150), 1), 300);

  return jsonb_build_object(
    'resumo', jsonb_build_object(
      'eventos_30d', (
        select count(*)
        from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
          and public.unit_scope_allows(p_empresa_id, l.unidade_id, p_unidade_id, true)
      ),
      'eventos_alto_risco_30d', (
        select count(*)
        from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
          and public.unit_scope_allows(p_empresa_id, l.unidade_id, p_unidade_id, true)
          and public.audit_risk_level(l.acao, l.modulo) = 'alto'
      ),
      'downloads_30d', (
        select count(*)
        from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
          and public.unit_scope_allows(p_empresa_id, l.unidade_id, p_unidade_id, true)
          and lower(l.acao) like '%download%'
      ),
      'visualizacoes_30d', (
        select count(*)
        from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
          and public.unit_scope_allows(p_empresa_id, l.unidade_id, p_unidade_id, true)
          and lower(l.acao) like '%visualizacao%'
      ),
      'substituicoes_30d', (
        select count(*)
        from public.logs_auditoria l
        where l.empresa_id = p_empresa_id
          and l.created_at >= now() - interval '30 days'
          and public.unit_scope_allows(p_empresa_id, l.unidade_id, p_unidade_id, true)
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
          and public.unit_scope_allows(p_empresa_id, l.unidade_id, p_unidade_id, true)
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
          l.unidade_id,
          un.nome as unidade,
          l.ip::text as ip,
          l.user_agent,
          public.audit_risk_level(l.acao, l.modulo) as risco,
          public.audit_category(l.acao, l.modulo) as categoria,
          l.valor_anterior,
          l.novo_valor
        from public.logs_auditoria l
        left join public.usuarios u on u.id = l.usuario_id
        left join public.unidades un
          on un.id = l.unidade_id
         and un.empresa_id = l.empresa_id
        where l.empresa_id = p_empresa_id
          and public.unit_scope_allows(p_empresa_id, l.unidade_id, p_unidade_id, true)
        order by l.created_at desc
        limit p_limite
      ) x
    )
  );
end
$$;

revoke all on function public.api_auditoria_avancada_unidade(uuid, uuid, integer)
  from public, anon;
grant execute on function public.api_auditoria_avancada_unidade(uuid, uuid, integer)
  to authenticated;

-- A carteira do parceiro mostra capacidade real de cada cliente sem expor
-- registros operacionais de outros clientes.
create or replace function public.api_partner_listar_clientes(p_parceiro_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'razao_social', c.razao_social,
    'nome_fantasia', c.nome_fantasia,
    'cnpj', c.cnpj,
    'email_principal', c.email_principal,
    'status', c.status,
    'access_status', c.access_status,
    'segmento', c.segmento,
    'tipo_estabelecimento', c.tipo_estabelecimento,
    'plano', jsonb_build_object('id', p.id, 'nome', p.nome, 'codigo', p.codigo),
    'relacionamento', jsonb_build_object(
      'id', rpc.id,
      'status', rpc.status,
      'inicio_em', rpc.inicio_em,
      'encerrado_em', rpc.encerrado_em
    ),
    'unidades', jsonb_build_object(
      'utilizadas', public.active_company_unit_count(c.id),
      'ativas', (
        select count(*) from public.unidades u
        where u.empresa_id = c.id
          and u.status = 'ativa'
          and u.deleted_at is null
      ),
      'arquivadas', (
        select count(*) from public.unidades u
        where u.empresa_id = c.id
          and u.status = 'arquivada'
          and u.deleted_at is null
      ),
      'limite', public.effective_unit_limit(c.id),
      'em_excesso',
        public.active_company_unit_count(c.id) > public.effective_unit_limit(c.id)
    ),
    'isencao', case when i.id is null then null else jsonb_build_object(
      'id', i.id,
      'inicio_em', i.inicio_em,
      'termina_em', i.termina_em,
      'meses', i.meses,
      'status', i.status,
      'motivo', i.motivo
    ) end
  ) order by c.nome_fantasia), '[]'::jsonb)
  into v_result
  from public.relacionamentos_parceiro_clientes rpc
  join public.empresas c
    on c.id = rpc.cliente_empresa_id
   and c.deleted_at is null
  join public.planos p on p.id = rpc.plano_servico_id
  left join lateral (
    select exemption.*
    from public.isencoes_parceiro exemption
    where exemption.parceiro_empresa_id = rpc.parceiro_empresa_id
      and exemption.cliente_empresa_id = rpc.cliente_empresa_id
      and exemption.status = 'ativa'
      and current_date between exemption.inicio_em and exemption.termina_em
    order by exemption.created_at desc
    limit 1
  ) i on true
  where rpc.parceiro_empresa_id = p_parceiro_empresa_id
    and rpc.status <> 'encerrado';

  return v_result;
end
$$;

-- Painel executivo do Admin Master: plano base, add-on, utilização, excesso e
-- receita mensal recorrente associada a unidades extras.
create or replace function public.api_master_resumo_multiunidade()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unit_price integer;
begin
  if not public.is_master() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(preco_unidade_extra_centavos, 0)
  into v_unit_price
  from public.configuracoes_comerciais
  where id;

  return jsonb_build_object(
    'resumo', jsonb_build_object(
      'empresas_com_multiunidade', (
        select count(*)
        from (
          select u.empresa_id
          from public.unidades u
          where u.deleted_at is null
            and u.status in ('ativa', 'inativa', 'em_implantacao')
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
      ),
      'unidades_arquivadas', (
        select count(*) from public.unidades
        where deleted_at is null and status = 'arquivada'
      ),
      'empresas_proximas_limite', (
        select count(*)
        from public.empresas e
        where e.deleted_at is null
          and public.active_company_unit_count(e.id)
            >= greatest(1, ceil(public.effective_unit_limit(e.id) * 0.8)::integer)
      ),
      'empresas_em_excesso', (
        select count(*)
        from public.empresas e
        where e.deleted_at is null
          and public.active_company_unit_count(e.id) > public.effective_unit_limit(e.id)
      ),
      'receita_unidades_extras_centavos', (
        select coalesce(sum(coalesce(a.unidades_extras, 0) * v_unit_price), 0)
        from public.assinaturas_empresas a
        where a.deleted_at is null
          and a.status in ('trial', 'ativa', 'pagamento_pendente')
      )
    ),
    'empresas', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'empresa_id', e.id,
          'empresa', e.nome_fantasia,
          'tipo_conta', e.tipo_conta,
          'parceiro_empresa_id', e.parceiro_origem_id,
          'parceiro', parceiro.nome_fantasia,
          'limite_base', coalesce(
            p.limite_unidades,
            nullif(p.recursos ->> 'limite_unidades', '')::integer,
            1
          ),
          'unidades_extras', coalesce(a.unidades_extras, 0),
          'unidades_utilizadas', counts.utilizadas,
          'unidades_ativas', counts.ativas,
          'unidades_arquivadas', counts.arquivadas,
          'limite_unidades', public.effective_unit_limit(e.id),
          'proxima_do_limite',
            counts.utilizadas
              >= greatest(1, ceil(public.effective_unit_limit(e.id) * 0.8)::integer),
          'em_excesso', counts.utilizadas > public.effective_unit_limit(e.id)
        )
        order by
          (counts.utilizadas > public.effective_unit_limit(e.id)) desc,
          counts.utilizadas desc,
          e.nome_fantasia
      )
      from public.empresas e
      left join public.planos p on p.id = e.plano_id
      left join public.assinaturas_empresas a
        on a.empresa_id = e.id
       and a.deleted_at is null
      left join public.empresas parceiro on parceiro.id = e.parceiro_origem_id
      cross join lateral (
        select
          count(*) filter (
            where u.status in ('ativa', 'inativa', 'em_implantacao')
          )::integer utilizadas,
          count(*) filter (where u.status = 'ativa')::integer ativas,
          count(*) filter (where u.status = 'arquivada')::integer arquivadas
        from public.unidades u
        where u.empresa_id = e.id and u.deleted_at is null
      ) counts
      where e.deleted_at is null
    ), '[]'::jsonb)
  );
end
$$;

revoke all on function public.api_partner_listar_clientes(uuid) from public, anon;
revoke all on function public.api_master_resumo_multiunidade() from public, anon;
revoke all on function public.api_registrar_troca_unidade(uuid, uuid, uuid) from public, anon;
revoke all on function public.audit_row_change() from public, anon;
grant execute on function public.api_partner_listar_clientes(uuid) to authenticated;
grant execute on function public.api_master_resumo_multiunidade() to authenticated;
grant execute on function public.api_registrar_troca_unidade(uuid, uuid, uuid) to authenticated;
