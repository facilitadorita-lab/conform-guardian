\set ON_ERROR_STOP on

do $$
declare
  v_empresa constant uuid := '82000000-0000-4000-8000-000000000010';
  v_matriz uuid;
begin
  select id
  into v_matriz
  from public.unidades
  where empresa_id = v_empresa
    and is_matriz
    and deleted_at is null;

  if v_matriz is null then
    raise exception 'LEGACY_MATRIX_NOT_CREATED';
  end if;

  if (
    select count(*)
    from public.unidades
    where empresa_id = v_empresa and is_matriz and deleted_at is null
  ) <> 1 then
    raise exception 'LEGACY_MATRIX_DUPLICATED';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresas
    where usuario_id = '82000000-0000-4000-8000-000000000001'
      and empresa_id = v_empresa
      and acesso_todas_unidades
      and ativo
      and deleted_at is null
  ) then
    raise exception 'LEGACY_USER_ACCESS_NOT_PRESERVED';
  end if;

  if not exists (
    select 1
    from public.documentos
    where id = '82000000-0000-4000-8000-000000000020'
      and empresa_id = v_empresa
      and escopo_documento = 'unidade'
      and unidade_id = v_matriz
      and setor_unidade = 'Operação histórica'
  ) then
    raise exception 'LEGACY_DOCUMENT_BACKFILL_FAILED';
  end if;

  if not exists (
    select 1
    from public.equipamentos
    where id = '82000000-0000-4000-8000-000000000030'
      and unidade_id = v_matriz
      and setor = 'Operação histórica'
  ) then
    raise exception 'LEGACY_EQUIPMENT_BACKFILL_FAILED';
  end if;

  if exists (
    select 1
    from (
      select empresa_id, unidade_id
      from public.calibracoes
      where id = '82000000-0000-4000-8000-000000000040'
      union all
      select empresa_id, unidade_id
      from public.qualificacoes
      where id = '82000000-0000-4000-8000-000000000050'
      union all
      select empresa_id, unidade_id
      from public.manutencoes
      where id = '82000000-0000-4000-8000-000000000060'
    ) child
    where child.empresa_id <> v_empresa or child.unidade_id <> v_matriz
  ) then
    raise exception 'LEGACY_EQUIPMENT_HISTORY_BACKFILL_FAILED';
  end if;

  if exists (
    select 1
    from (
      select unidade_id
      from public.pendencias
      where id = '82000000-0000-4000-8000-000000000070'
      union all
      select unidade_id
      from public.anexos
      where id = '82000000-0000-4000-8000-000000000080'
      union all
      select unidade_id
      from public.alertas
      where id = '82000000-0000-4000-8000-000000000090'
      union all
      select unidade_id
      from public.interacoes_assistente
      where id = '82000000-0000-4000-8000-0000000000a0'
    ) related
    where related.unidade_id is distinct from v_matriz
  ) then
    raise exception 'LEGACY_RELATED_CONTEXT_BACKFILL_FAILED';
  end if;

  if not exists (
    select 1
    from public.relatorios_agendados
    where id = '82000000-0000-4000-8000-0000000000b0'
      and empresa_id = v_empresa
      and unidade_id is null
  ) then
    raise exception 'LEGACY_CORPORATE_REPORT_NOT_PRESERVED';
  end if;

  if (
    select count(*)
    from (
      select id from public.documentos where id = '82000000-0000-4000-8000-000000000020'
      union all
      select id from public.equipamentos where id = '82000000-0000-4000-8000-000000000030'
      union all
      select id from public.calibracoes where id = '82000000-0000-4000-8000-000000000040'
      union all
      select id from public.qualificacoes where id = '82000000-0000-4000-8000-000000000050'
      union all
      select id from public.manutencoes where id = '82000000-0000-4000-8000-000000000060'
      union all
      select id from public.pendencias where id = '82000000-0000-4000-8000-000000000070'
      union all
      select id from public.anexos where id = '82000000-0000-4000-8000-000000000080'
      union all
      select id from public.alertas where id = '82000000-0000-4000-8000-000000000090'
    ) preserved
  ) <> 8 then
    raise exception 'LEGACY_RECORD_LOSS_DETECTED';
  end if;
end
$$;

select
  'MULTIUNIT_LEGACY_MIGRATION_REHEARSAL_OK' as resultado,
  count(*) as unidades_criadas
from public.unidades
where empresa_id = '82000000-0000-4000-8000-000000000010';
