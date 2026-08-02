-- Conform Flow - contratos, views, chaves e índices da multiunidade.
-- As restrições são aplicadas somente depois da conclusão dos backfills.

alter table public.equipamentos alter column unidade_id set not null;
alter table public.calibracoes alter column unidade_id set not null;
alter table public.qualificacoes alter column unidade_id set not null;
alter table public.manutencoes alter column unidade_id set not null;

-- Views criadas antes das novas colunas mantêm a lista de colunas congelada.
-- Recriá-las torna unidade_id/escopo_documento disponíveis nas APIs sem mudar
-- o cálculo de conformidade já aprovado.
create or replace view public.vw_documentos_status with (security_invoker = true) as
select
  d.id, d.empresa_id, d.nome, d.categoria_id, d.tipo_documento_id,
  d.numero_documento, d.orgao_emissor, d.responsavel_id, d.data_emissao,
  d.data_vencimento, d.periodicidade_meses, d.alerta_antecedencia_dias,
  d.exige_anexo, d.setor_unidade, d.observacoes, d.created_at, d.updated_at,
  d.deleted_at, d.created_by, d.updated_by,
  case
    when d.exige_anexo and not public.tem_anexo_ativo(d.empresa_id, 'documentos', d.id)
      then 'pendente_anexo'
    else public.status_vencimento(d.data_vencimento)
  end as status_calculado,
  d.workflow_status, d.versao_atual, d.exige_aprovacao, d.politica_aprovacao,
  d.escopo_documento, d.unidade_id
from public.documentos d
where d.deleted_at is null;

create or replace view public.vw_calibracoes_status with (security_invoker = true) as
select
  c.id, c.empresa_id, c.equipamento_id, c.data_calibracao, c.data_vencimento,
  c.numero_certificado, c.laboratorio_responsavel, c.resultado,
  c.responsavel_id, c.observacoes, c.created_at, c.updated_at, c.deleted_at,
  c.created_by, c.updated_by,
  row_number() over (
    partition by c.equipamento_id
    order by c.data_calibracao desc, c.created_at desc
  ) = 1 as vigente,
  case
    when c.resultado = 'reprovado' then 'reprovado'
    when not public.tem_anexo_ativo(c.empresa_id, 'calibracoes', c.id, 'certificado')
      then 'sem_certificado'
    else public.status_vencimento(c.data_vencimento)
  end as status_calculado,
  c.unidade_id
from public.calibracoes c
where c.deleted_at is null;

create or replace view public.vw_qualificacoes_status with (security_invoker = true) as
select
  q.id, q.empresa_id, q.equipamento_id, q.tipo, q.data_qualificacao,
  q.data_vencimento, q.resultado, q.responsavel_tecnico_id,
  q.empresa_executora, q.observacoes, q.created_at, q.updated_at, q.deleted_at,
  q.created_by, q.updated_by,
  row_number() over (
    partition by q.equipamento_id
    order by q.data_qualificacao desc, q.created_at desc
  ) = 1 as vigente,
  case
    when q.resultado = 'reprovado' then 'reprovada'
    when not public.tem_anexo_ativo(q.empresa_id, 'qualificacoes', q.id, 'relatorio')
      then 'pendente_relatorio'
    else public.status_vencimento(q.data_vencimento)
  end as status_calculado,
  q.unidade_id
from public.qualificacoes q
where q.deleted_at is null;

create or replace view public.vw_manutencoes_status with (security_invoker = true) as
select
  m.id, m.empresa_id, m.equipamento_id, m.nome_servico, m.natureza,
  m.tipo_servico, m.status_execucao, m.data_manutencao, m.proxima_manutencao,
  m.periodicidade_meses, m.empresa_responsavel, m.tecnico_responsavel,
  m.numero_ordem_servico, m.responsavel_interno_id, m.exige_evidencia,
  m.falha_apresentada, m.prioridade, m.diagnostico, m.causa_raiz,
  m.acao_realizada, m.equipamento_parado_desde, m.retorno_operacao_at,
  m.observacoes, m.created_at, m.updated_at, m.deleted_at, m.created_by,
  m.updated_by,
  case
    when m.exige_evidencia and not public.tem_anexo_ativo(m.empresa_id, 'manutencoes', m.id)
      then 'pendente_evidencia'
    else public.status_vencimento(m.proxima_manutencao)
  end as status_calculado,
  m.unidade_id
from public.manutencoes m
where m.deleted_at is null;

create or replace view public.vw_equipamentos_conformidade with (security_invoker = true) as
select
  e.id, e.empresa_id, e.nome, e.tipo_equipamento_id, e.codigo_interno,
  e.numero_serie, e.fabricante, e.modelo, e.setor, e.localizacao,
  e.criticidade, e.status, e.responsavel_id, e.observacoes, e.created_at,
  e.updated_at, e.deleted_at, e.created_by, e.updated_by,
  c.id as calibracao_vigente_id,
  c.status_calculado as status_calibracao,
  q.id as qualificacao_vigente_id,
  q.status_calculado as status_qualificacao,
  m.id as manutencao_recente_id,
  m.status_calculado as status_manutencao,
  case
    when 'reprovado' in (
      coalesce(c.status_calculado, ''),
      coalesce(q.status_calculado, '')
    ) then 'reprovado'
    when 'vencido' in (
      coalesce(c.status_calculado, ''),
      coalesce(q.status_calculado, ''),
      coalesce(m.status_calculado, '')
    ) then 'vencido'
    when 'critico' in (
      coalesce(c.status_calculado, ''),
      coalesce(q.status_calculado, ''),
      coalesce(m.status_calculado, '')
    ) then 'critico'
    when 'a_vencer' in (
      coalesce(c.status_calculado, ''),
      coalesce(q.status_calculado, ''),
      coalesce(m.status_calculado, '')
    ) then 'a_vencer'
    else 'em_dia'
  end as status_consolidado,
  e.qr_token,
  e.unidade_id
from public.equipamentos e
left join public.vw_calibracoes_status c
  on c.equipamento_id = e.id and c.vigente
left join public.vw_qualificacoes_status q
  on q.equipamento_id = e.id and q.vigente
left join lateral (
  select vm.*
  from public.vw_manutencoes_status vm
  where vm.equipamento_id = e.id
  order by vm.data_manutencao desc, vm.created_at desc
  limit 1
) m on true
where e.deleted_at is null;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'pendencias',
    'tratativas_pendencias',
    'alertas',
    'anexos',
    'logs_auditoria',
    'interacoes_assistente',
    'relatorios_agendados',
    'execucoes_relatorios_agendados'
  ] loop
    if not exists (
      select 1
      from pg_constraint
      where conname = v_table || '_unidade_empresa_fk'
        and conrelid = format('public.%I', v_table)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (unidade_id, empresa_id) references public.unidades(id, empresa_id) on delete restrict not valid',
        v_table,
        v_table || '_unidade_empresa_fk'
      );
    end if;
  end loop;
end
$$;

alter table public.documentos validate constraint documentos_escopo_documento_check;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'pendencias',
    'tratativas_pendencias',
    'alertas',
    'anexos',
    'logs_auditoria',
    'interacoes_assistente',
    'relatorios_agendados',
    'execucoes_relatorios_agendados'
  ] loop
    execute format(
      'alter table public.%I validate constraint %I',
      v_table,
      v_table || '_unidade_empresa_fk'
    );
  end loop;
end
$$;

create index if not exists idx_documentos_empresa_unidade
  on public.documentos (empresa_id, unidade_id, data_vencimento)
  where deleted_at is null;
create index if not exists idx_equipamentos_empresa_unidade
  on public.equipamentos (empresa_id, unidade_id, status)
  where deleted_at is null;
create index if not exists idx_calibracoes_empresa_unidade
  on public.calibracoes (empresa_id, unidade_id, data_vencimento)
  where deleted_at is null;
create index if not exists idx_qualificacoes_empresa_unidade
  on public.qualificacoes (empresa_id, unidade_id, data_vencimento)
  where deleted_at is null;
create index if not exists idx_manutencoes_empresa_unidade
  on public.manutencoes (empresa_id, unidade_id, proxima_manutencao)
  where deleted_at is null;
create index if not exists idx_pendencias_empresa_unidade
  on public.pendencias (empresa_id, unidade_id, status, prazo)
  where deleted_at is null;
create index if not exists idx_alertas_empresa_unidade
  on public.alertas (empresa_id, unidade_id, status)
  where deleted_at is null;
create index if not exists idx_anexos_empresa_unidade_registro
  on public.anexos (empresa_id, unidade_id, modulo, registro_id)
  where deleted_at is null;
create index if not exists idx_logs_empresa_unidade_data
  on public.logs_auditoria (empresa_id, unidade_id, created_at desc);

