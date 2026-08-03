-- Keep the Admin Master isolation diagnostic statically typed so that
-- plpgsql_check can validate every referenced relation during CI.

create or replace function public.api_diagnostico_isolamento(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_orphans bigint := 0;
  v_cross_links bigint := 0;
  v_checks jsonb := '[]'::jsonb;
  v_total bigint := 0;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_empresa_id is null then raise exception 'COMPANY_REQUIRED' using errcode = '22023'; end if;

  select count(*) into v_total from public.documentos where empresa_id = p_empresa_id and deleted_at is null;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('tabela', 'documentos', 'registros_empresa', v_total));
  select count(*) into v_total from public.equipamentos where empresa_id = p_empresa_id and deleted_at is null;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('tabela', 'equipamentos', 'registros_empresa', v_total));
  select count(*) into v_total from public.calibracoes where empresa_id = p_empresa_id and deleted_at is null;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('tabela', 'calibracoes', 'registros_empresa', v_total));
  select count(*) into v_total from public.qualificacoes where empresa_id = p_empresa_id and deleted_at is null;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('tabela', 'qualificacoes', 'registros_empresa', v_total));
  select count(*) into v_total from public.manutencoes where empresa_id = p_empresa_id and deleted_at is null;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('tabela', 'manutencoes', 'registros_empresa', v_total));
  select count(*) into v_total from public.anexos where empresa_id = p_empresa_id and deleted_at is null;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('tabela', 'anexos', 'registros_empresa', v_total));
  select count(*) into v_total from public.pendencias where empresa_id = p_empresa_id and deleted_at is null;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('tabela', 'pendencias', 'registros_empresa', v_total));
  select count(*) into v_total from public.alertas where empresa_id = p_empresa_id and deleted_at is null;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('tabela', 'alertas', 'registros_empresa', v_total));

  select sum(inconsistencias) into v_orphans
  from (
    select count(*) as inconsistencias from public.documentos where empresa_id is null and deleted_at is null
    union all select count(*) from public.equipamentos where empresa_id is null and deleted_at is null
    union all select count(*) from public.calibracoes where empresa_id is null and deleted_at is null
    union all select count(*) from public.qualificacoes where empresa_id is null and deleted_at is null
    union all select count(*) from public.manutencoes where empresa_id is null and deleted_at is null
    union all select count(*) from public.anexos where empresa_id is null and deleted_at is null
    union all select count(*) from public.pendencias where empresa_id is null and deleted_at is null
    union all select count(*) from public.alertas where empresa_id is null and deleted_at is null
  ) orphan_counts;

  select count(*) into v_cross_links
  from public.anexos a
  join public.documentos d on d.id = a.registro_id and a.modulo = 'documentos'
  where a.empresa_id <> d.empresa_id and a.deleted_at is null;

  return jsonb_build_object(
    'empresa_id', p_empresa_id,
    'isolamento_ok', coalesce(v_orphans, 0) = 0 and v_cross_links = 0,
    'registros_sem_empresa', coalesce(v_orphans, 0),
    'anexos_com_empresa_inconsistente', v_cross_links,
    'checks', v_checks,
    'executado_em', now()
  );
end;
$$;

revoke all on function public.api_diagnostico_isolamento(uuid) from public, anon;
grant execute on function public.api_diagnostico_isolamento(uuid) to authenticated;
