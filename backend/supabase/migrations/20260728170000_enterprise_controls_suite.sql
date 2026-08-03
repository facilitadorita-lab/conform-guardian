-- Controles operacionais adicionais para produção enterprise.
-- Todas as rotinas são tenant-aware e não expõem dados entre empresas.

create table if not exists public.execucoes_teste_isolamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  status text not null check (status in ('passed', 'failed', 'warning')),
  total_checks integer not null default 0,
  failed_checks integer not null default 0,
  checks jsonb not null default '[]'::jsonb,
  executed_by uuid references public.usuarios(id),
  executed_at timestamptz not null default now()
);

create index if not exists idx_execucoes_teste_isolamento_empresa
  on public.execucoes_teste_isolamento(empresa_id, executed_at desc);
alter table public.execucoes_teste_isolamento enable row level security;
revoke all on public.execucoes_teste_isolamento from anon, authenticated;

create or replace function public.api_master_testar_isolamento(p_empresa_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_check jsonb;
  v_checks jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_failed integer := 0;
  v_count bigint;
  v_status text;
  v_run public.execucoes_teste_isolamento;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;

  select count(*) into v_count
  from public.usuarios_empresas ue
  left join public.empresas e on e.id = ue.empresa_id
  where ue.deleted_at is null and ue.ativo and e.id is null;
  v_total := v_total + 1;
  v_check := jsonb_build_object('codigo', 'membership_empresa_existente', 'status', case when v_count = 0 then 'passed' else 'failed' end, 'inconsistencias', v_count);
  v_checks := v_checks || jsonb_build_array(v_check);
  if v_count > 0 then v_failed := v_failed + 1; end if;

  select count(*) into v_count
  from public.calibracoes c
  left join public.equipamentos e on e.id = c.equipamento_id
  where c.deleted_at is null and (p_empresa_id is null or c.empresa_id = p_empresa_id)
    and (e.id is null or e.empresa_id <> c.empresa_id);
  v_total := v_total + 1;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('codigo', 'calibracao_equipamento_mesma_empresa', 'status', case when v_count = 0 then 'passed' else 'failed' end, 'inconsistencias', v_count));
  if v_count > 0 then v_failed := v_failed + 1; end if;

  select count(*) into v_count
  from public.qualificacoes q
  left join public.equipamentos e on e.id = q.equipamento_id
  where q.deleted_at is null and (p_empresa_id is null or q.empresa_id = p_empresa_id)
    and (e.id is null or e.empresa_id <> q.empresa_id);
  v_total := v_total + 1;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('codigo', 'qualificacao_equipamento_mesma_empresa', 'status', case when v_count = 0 then 'passed' else 'failed' end, 'inconsistencias', v_count));
  if v_count > 0 then v_failed := v_failed + 1; end if;

  select count(*) into v_count
  from public.manutencoes m
  left join public.equipamentos e on e.id = m.equipamento_id
  where m.deleted_at is null and (p_empresa_id is null or m.empresa_id = p_empresa_id)
    and m.equipamento_id is not null and (e.id is null or e.empresa_id <> m.empresa_id);
  v_total := v_total + 1;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('codigo', 'manutencao_equipamento_mesma_empresa', 'status', case when v_count = 0 then 'passed' else 'failed' end, 'inconsistencias', v_count));
  if v_count > 0 then v_failed := v_failed + 1; end if;

  select count(*) into v_count
  from public.anexos a
  left join public.empresas e on e.id = a.empresa_id
  where a.deleted_at is null and (p_empresa_id is null or a.empresa_id = p_empresa_id)
    and e.id is null;
  v_total := v_total + 1;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object('codigo', 'anexo_empresa_existente', 'status', case when v_count = 0 then 'passed' else 'failed' end, 'inconsistencias', v_count));
  if v_count > 0 then v_failed := v_failed + 1; end if;

  v_status := case when v_failed = 0 then 'passed' else 'failed' end;
  insert into public.execucoes_teste_isolamento(empresa_id, status, total_checks, failed_checks, checks, executed_by)
  values (p_empresa_id, v_status, v_total, v_failed, v_checks, auth.uid())
  returning * into v_run;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, novo_valor)
  values (p_empresa_id, auth.uid(), 'seguranca', 'teste_isolamento_executado', v_run.id, jsonb_build_object('status', v_status, 'total_checks', v_total, 'failed_checks', v_failed));

  return jsonb_build_object('id', v_run.id, 'status', v_status, 'total_checks', v_total, 'failed_checks', v_failed, 'checks', v_checks, 'executed_at', v_run.executed_at);
end;
$$;

create or replace function public.api_master_listar_testes_isolamento(p_limite integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.executed_at desc), '[]'::jsonb)
  from public.execucoes_teste_isolamento t
  where public.is_master()
  limit greatest(1, least(coalesce(p_limite, 20), 100));
$$;

create or replace function public.api_master_registrar_ensaio_backup(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.ensaios_restauracao_backup;
  v_status text := lower(coalesce(nullif(trim(p_payload ->> 'status'), ''), 'passed'));
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  if v_status not in ('passed', 'failed', 'warning') then raise exception 'INVALID_BACKUP_DRILL_STATUS'; end if;
  if nullif(trim(p_payload ->> 'backup_reference'), '') is null then raise exception 'BACKUP_REFERENCE_REQUIRED'; end if;

  insert into public.ensaios_restauracao_backup(ambiente, backup_reference, evidence_reference, status, notes, rpo_minutes, rto_minutes, completed_at, recorded_by)
  values (
    coalesce(nullif(trim(p_payload ->> 'ambiente'), ''), 'production'),
    trim(p_payload ->> 'backup_reference'),
    nullif(trim(p_payload ->> 'evidence_reference'), ''),
    v_status,
    nullif(trim(p_payload ->> 'notes'), ''),
    nullif(p_payload ->> 'rpo_minutes', '')::integer,
    nullif(p_payload ->> 'rto_minutes', '')::integer,
    now(), auth.uid()
  ) returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.api_master_listar_ensaios_backup(p_limite integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.completed_at desc nulls last, t.created_at desc), '[]'::jsonb)
  from public.ensaios_restauracao_backup t
  where public.is_master()
  limit greatest(1, least(coalesce(p_limite, 20), 100));
$$;

create or replace function public.api_master_fila_cobranca(p_limite integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at asc), '[]'::jsonb)
  from (
    select t.id, t.empresa_id, e.nome_fantasia, e.email_principal, t.status, t.tentativa,
      t.valor_centavos, t.erro_codigo, t.proxima_tentativa_at, t.created_at
    from public.tentativas_cobranca t
    join public.empresas e on e.id = t.empresa_id
    where public.is_master() and t.status in ('failed', 'inadimplente') and e.deleted_at is null
    order by t.created_at asc
    limit greatest(1, least(coalesce(p_limite, 50), 200))
  ) q;
$$;

create or replace function public.api_master_enfileirar_cobranca(p_tentativa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.tentativas_cobranca;
  v_admin uuid;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  select * into v_attempt from public.tentativas_cobranca where id = p_tentativa_id for update;
  if not found then raise exception 'DUNNING_ATTEMPT_NOT_FOUND'; end if;
  select ue.usuario_id into v_admin
  from public.usuarios_empresas ue
  where ue.empresa_id = v_attempt.empresa_id and ue.ativo and ue.deleted_at is null
    and ue.perfil in ('administrador', 'administrador_provisorio')
  order by ue.created_at limit 1;
  insert into public.notificacoes(empresa_id, usuario_id, audience, tipo, titulo, mensagem, action_url)
  values (v_attempt.empresa_id, v_admin, 'admins', 'cobranca', 'Pagamento pendente', 'Existe uma tentativa de cobrança que precisa de acompanhamento.', '/configuracoes');
  update public.tentativas_cobranca set status = 'queued', tentativa = tentativa + 1, proxima_tentativa_at = now() + interval '24 hours'
  where id = p_tentativa_id;
  return jsonb_build_object('ok', true, 'id', p_tentativa_id, 'status', 'queued');
end;
$$;

create or replace function public.api_master_consumo_empresas()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(q) order by q.nome_fantasia), '[]'::jsonb)
  from (
    select c.empresa_id, c.nome_fantasia, c.documentos, c.equipamentos, c.storage_bytes,
      c.limite_documentos, c.limite_equipamentos, c.limite_storage_mb,
      e.segmento, e.tipo_estabelecimento
    from public.vw_consumo_empresa c
    left join public.empresas e on e.id = c.empresa_id
    where public.is_master() and e.deleted_at is null
  ) q;
$$;

create or replace function public.api_avaliar_segmento_ia(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa public.empresas;
  v_report jsonb;
  v_chaves text[];
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into v_empresa from public.empresas where id = p_empresa_id and deleted_at is null;
  if not found then raise exception 'COMPANY_NOT_FOUND'; end if;
  v_report := public.api_relatorio_executivo_ia(p_empresa_id);
  select coalesce(array_agg(distinct m.segmento_chave order by m.segmento_chave), '{}'::text[]) into v_chaves
  from public.modelos_documentos_segmento m
  where m.ativo and m.deleted_at is null
    and (lower(m.segmento_chave) = lower(coalesce(v_empresa.segmento, '')) or lower(coalesce(m.tipo_estabelecimento, '')) = lower(coalesce(v_empresa.tipo_estabelecimento, '')));
  return jsonb_build_object(
    'empresa_id', v_empresa.id,
    'segmento', v_empresa.segmento,
    'tipo_estabelecimento', v_empresa.tipo_estabelecimento,
    'cnae', v_empresa.cnae_principal_descricao,
    'confianca', case when v_empresa.segmento is not null and v_empresa.tipo_estabelecimento is not null then 'alta' when v_empresa.segmento is not null or v_empresa.cnae_principal_descricao is not null then 'media' else 'baixa' end,
    'chaves_documentais', to_jsonb(v_chaves),
    'analise_ia', coalesce(v_report -> 'analise_ia', '[]'::jsonb),
    'recomendacoes', coalesce(v_report -> 'recomendacoes', '[]'::jsonb),
    'matriz_documental', coalesce(v_report -> 'matriz_documental', '{}'::jsonb),
    'politica', jsonb_build_object('leu_anexos', false, 'fonte', 'dados estruturados do ambiente da empresa')
  );
end;
$$;

create or replace function public.api_calendario_vencimentos(p_empresa_id uuid, p_inicio date default current_date, p_fim date default current_date + 60)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with itens as (
    select d.id, 'documentos'::text as modulo, d.nome as titulo, d.data_vencimento as vencimento, d.responsavel_id, public.status_vencimento(d.data_vencimento) as status
    from public.documentos d where d.empresa_id = p_empresa_id and d.deleted_at is null and d.data_vencimento between p_inicio and p_fim
    union all
    select c.id, 'calibracoes', coalesce(c.numero_certificado, 'Calibração'), c.data_vencimento, c.responsavel_id, public.status_vencimento(c.data_vencimento)
    from public.calibracoes c where c.empresa_id = p_empresa_id and c.deleted_at is null and c.data_vencimento between p_inicio and p_fim
    union all
    select q.id, 'qualificacoes', coalesce(q.tipo, 'Qualificação'), q.data_vencimento, q.responsavel_tecnico_id, public.status_vencimento(q.data_vencimento)
    from public.qualificacoes q where q.empresa_id = p_empresa_id and q.deleted_at is null and q.data_vencimento between p_inicio and p_fim
    union all
    select m.id, 'manutencoes', coalesce(m.nome_servico, 'Manutenção'), coalesce(m.proxima_manutencao, m.data_manutencao), m.responsavel_interno_id, public.status_vencimento(coalesce(m.proxima_manutencao, m.data_manutencao))
    from public.manutencoes m where m.empresa_id = p_empresa_id and m.deleted_at is null and coalesce(m.proxima_manutencao, m.data_manutencao) between p_inicio and p_fim
  )
  select coalesce(jsonb_agg(to_jsonb(itens) order by itens.vencimento), '[]'::jsonb) from itens
  where public.has_company_access(p_empresa_id);
$$;

create or replace function public.api_master_api_security_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'rls_tables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity),
    'security_definer_functions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef),
    'public_execute_functions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace left join aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a on true where n.nspname = 'public' and coalesce(a.grantee, 0) = 0 and a.privilege_type = 'EXECUTE'),
    'generated_at', now()
  ) where public.is_master();
$$;

revoke all on function public.api_master_testar_isolamento(uuid) from public, anon;
revoke all on function public.api_master_listar_testes_isolamento(integer) from public, anon;
revoke all on function public.api_master_registrar_ensaio_backup(jsonb) from public, anon;
revoke all on function public.api_master_listar_ensaios_backup(integer) from public, anon;
revoke all on function public.api_master_fila_cobranca(integer) from public, anon;
revoke all on function public.api_master_enfileirar_cobranca(uuid) from public, anon;
revoke all on function public.api_master_consumo_empresas() from public, anon;
revoke all on function public.api_avaliar_segmento_ia(uuid) from public, anon;
revoke all on function public.api_calendario_vencimentos(uuid, date, date) from public, anon;
revoke all on function public.api_master_api_security_snapshot() from public, anon;
grant execute on function public.api_master_testar_isolamento(uuid) to authenticated;
grant execute on function public.api_master_listar_testes_isolamento(integer) to authenticated;
grant execute on function public.api_master_registrar_ensaio_backup(jsonb) to authenticated;
grant execute on function public.api_master_listar_ensaios_backup(integer) to authenticated;
grant execute on function public.api_master_fila_cobranca(integer) to authenticated;
grant execute on function public.api_master_enfileirar_cobranca(uuid) to authenticated;
grant execute on function public.api_master_consumo_empresas() to authenticated;
grant execute on function public.api_avaliar_segmento_ia(uuid) to authenticated;
grant execute on function public.api_calendario_vencimentos(uuid, date, date) to authenticated;
grant execute on function public.api_master_api_security_snapshot() to authenticated;
