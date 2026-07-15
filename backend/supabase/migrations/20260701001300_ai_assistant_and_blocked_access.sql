-- Conform Flow — bloqueio de acesso inadimplente e base do assistente seguro.

create table if not exists public.interacoes_assistente (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  usuario_id uuid references public.usuarios(id),
  pergunta text not null,
  escopo text not null default 'geral' check (escopo in ('geral','equipamento','setor','manutencoes','vencimentos')),
  equipamento_id uuid references public.equipamentos(id),
  setor text,
  resposta text,
  fontes jsonb not null default '[]'::jsonb,
  modelo text not null default 'structured-safe-assistant',
  leu_anexos boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.interacoes_assistente enable row level security;

drop policy if exists interacoes_assistente_read on public.interacoes_assistente;
create policy interacoes_assistente_read on public.interacoes_assistente
  for select to authenticated using (public.has_company_access(empresa_id));

drop policy if exists interacoes_assistente_insert on public.interacoes_assistente;
create policy interacoes_assistente_insert on public.interacoes_assistente
  for insert to authenticated with check (public.can_write_company(empresa_id));

create index if not exists idx_interacoes_assistente_empresa_data
  on public.interacoes_assistente(empresa_id, created_at desc);

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

  perform public.assert_plan_feature(p_empresa_id, 'alertas');

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
    'equipamentos', (
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
    ),
    'manutencoes', (
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
    ),
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
          and (p_equipamento_id is null or q.equipamento_id = p_equipamento_id)
          and (p_setor is null or lower(e.setor) = lower(p_setor))
          and q.data_vencimento is not null
          and q.status_calculado in ('vencido','vence_hoje','critico','a_vencer','atencao')
        limit 50
      ) s
    ),
    'pendencias', (
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
    )
  );
end $$;

revoke all on function public.api_assistente_contexto(uuid,text,uuid,text) from public, anon;
grant execute on function public.api_assistente_contexto(uuid,text,uuid,text) to authenticated;
