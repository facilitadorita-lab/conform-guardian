-- Regressão completa do isolamento multiunidade.
-- Executa apenas no Supabase local e desfaz todas as fixtures ao final.

begin;
-- A criação direta de identidades pertence ao executor administrativo do fixture.
reset role;

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('81000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'unit-admin@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('81000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'unit-collab@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.usuarios(id, nome, email, status, is_master) values
  ('81000000-0000-4000-8000-000000000001', 'Admin Multiunidade', 'unit-admin@test.local', 'ativo', false),
  ('81000000-0000-4000-8000-000000000002', 'Colaborador Unidade', 'unit-collab@test.local', 'ativo', false);

insert into public.empresas(
  id, razao_social, nome_fantasia, cnpj, status,
  verification_status, access_status, plano_id
)
select
  '81000000-0000-4000-8000-000000000010',
  'Empresa Multiunidade A',
  'Multiunidade A',
  '81.000.000/0001-10',
  'ativa',
  'verified',
  'active',
  p.id
from public.planos p
where p.codigo = 'rede'
limit 1;

insert into public.empresas(
  id, razao_social, nome_fantasia, cnpj, status,
  verification_status, access_status, plano_id
)
select
  '82000000-0000-4000-8000-000000000020',
  'Empresa Multiunidade B',
  'Multiunidade B',
  '82.000.000/0001-20',
  'ativa',
  'verified',
  'active',
  p.id
from public.planos p
where p.codigo = 'rede'
limit 1;

insert into public.limites_acesso_empresa(
  empresa_id, source_type, max_users, max_units, max_documents,
  max_equipment, max_pending_tasks, max_storage_mb, max_reports
) values
  ('81000000-0000-4000-8000-000000000010', 'custom', 10, 3, 100, 100, 100, 1000, 20),
  ('82000000-0000-4000-8000-000000000020', 'custom', 10, 2, 100, 100, 100, 1000, 20);

insert into public.usuarios_empresas(
  usuario_id, empresa_id, perfil, acesso_todas_unidades
) values
  ('81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000010', 'administrador', true),
  ('81000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000010', 'colaborador', false);

insert into public.unidades(
  id, empresa_id, codigo, nome, status, is_matriz
) values
  ('81000000-0000-4000-8000-000000000101', '81000000-0000-4000-8000-000000000010', 'FILIAL-A', 'Filial A', 'ativa', false),
  ('81000000-0000-4000-8000-000000000102', '81000000-0000-4000-8000-000000000010', 'FILIAL-B', 'Filial B', 'ativa', false);

insert into public.usuarios_unidades(
  empresa_id, unidade_id, usuario_id, ativo, principal
) values (
  '81000000-0000-4000-8000-000000000010',
  '81000000-0000-4000-8000-000000000101',
  '81000000-0000-4000-8000-000000000002',
  true,
  true
);

update public.usuarios_empresas
set unidade_principal_id = '81000000-0000-4000-8000-000000000101'
where usuario_id = '81000000-0000-4000-8000-000000000002'
  and empresa_id = '81000000-0000-4000-8000-000000000010';

insert into public.documentos(
  id, empresa_id, nome, exige_anexo, escopo_documento, unidade_id
) values
  ('81000000-0000-4000-8000-000000000201', '81000000-0000-4000-8000-000000000010', 'Política corporativa', false, 'corporativo', null),
  ('81000000-0000-4000-8000-000000000202', '81000000-0000-4000-8000-000000000010', 'Licença Filial A', false, 'unidade', '81000000-0000-4000-8000-000000000101'),
  ('81000000-0000-4000-8000-000000000203', '81000000-0000-4000-8000-000000000010', 'Licença Filial B', false, 'unidade', '81000000-0000-4000-8000-000000000102');

insert into public.equipamentos(
  id, empresa_id, unidade_id, nome, codigo_interno
) values
  ('81000000-0000-4000-8000-000000000301', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000101', 'Equipamento Filial A', 'EQ-A'),
  ('81000000-0000-4000-8000-000000000302', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000102', 'Equipamento Filial B', 'EQ-B');

insert into public.calibracoes(
  id, empresa_id, equipamento_id, data_calibracao, data_vencimento,
  numero_certificado, resultado
) values (
  '81000000-0000-4000-8000-000000000401',
  '81000000-0000-4000-8000-000000000010',
  '81000000-0000-4000-8000-000000000301',
  current_date,
  current_date + 365,
  'CAL-MULTI-A',
  'aprovado'
);

insert into public.qualificacoes(
  id, empresa_id, equipamento_id, tipo, data_qualificacao,
  data_vencimento, resultado
) values (
  '81000000-0000-4000-8000-000000000402',
  '81000000-0000-4000-8000-000000000010',
  '81000000-0000-4000-8000-000000000301',
  'operacao',
  current_date,
  current_date + 365,
  'aprovado'
);

insert into public.manutencoes(
  id, empresa_id, equipamento_id, natureza, data_manutencao,
  proxima_manutencao, numero_ordem_servico
) values (
  '81000000-0000-4000-8000-000000000403',
  '81000000-0000-4000-8000-000000000010',
  '81000000-0000-4000-8000-000000000301',
  'preventiva',
  current_date,
  current_date + 90,
  'OS-MULTI-A'
);

insert into public.anexos(
  id, empresa_id, modulo, registro_id, finalidade, storage_path,
  nome_original, mime_type, tamanho_bytes
) values
  ('81000000-0000-4000-8000-000000000501', '81000000-0000-4000-8000-000000000010', 'documentos', '81000000-0000-4000-8000-000000000202', 'principal', '81000000-0000-4000-8000-000000000010/documentos/81000000-0000-4000-8000-000000000202/teste-a.pdf', 'teste-a.pdf', 'application/pdf', 100),
  ('81000000-0000-4000-8000-000000000502', '81000000-0000-4000-8000-000000000010', 'documentos', '81000000-0000-4000-8000-000000000203', 'principal', '81000000-0000-4000-8000-000000000010/documentos/81000000-0000-4000-8000-000000000203/teste-b.pdf', 'teste-b.pdf', 'application/pdf', 100);

do $$
declare
  v_matrix_count integer;
begin
  select count(*) into v_matrix_count
  from public.unidades
  where empresa_id = '81000000-0000-4000-8000-000000000010'
    and is_matriz and deleted_at is null;
  if v_matrix_count <> 1 then
    raise exception 'MULTIUNIT_MATRIX_CREATION_FAILED: %', v_matrix_count;
  end if;

  if exists (
    select 1 from public.calibracoes
    where id = '81000000-0000-4000-8000-000000000401'
      and unidade_id <> '81000000-0000-4000-8000-000000000101'
  ) then raise exception 'CALIBRATION_UNIT_INHERITANCE_FAILED'; end if;

  if exists (
    select 1 from public.qualificacoes
    where id = '81000000-0000-4000-8000-000000000402'
      and unidade_id <> '81000000-0000-4000-8000-000000000101'
  ) then raise exception 'QUALIFICATION_UNIT_INHERITANCE_FAILED'; end if;

  if exists (
    select 1 from public.manutencoes
    where id = '81000000-0000-4000-8000-000000000403'
      and unidade_id <> '81000000-0000-4000-8000-000000000101'
  ) then raise exception 'MAINTENANCE_UNIT_INHERITANCE_FAILED'; end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.unidades;
  if v_count <> 1 then
    raise exception 'RESTRICTED_USER_UNIT_LIST_LEAK: %', v_count;
  end if;

  select count(*) into v_count from public.documentos;
  if v_count <> 2 then
    raise exception 'RESTRICTED_USER_DOCUMENT_SCOPE_FAILED: %', v_count;
  end if;

  if exists (
    select 1 from public.documentos
    where id = '81000000-0000-4000-8000-000000000203'
  ) then raise exception 'RESTRICTED_USER_DOCUMENT_LEAK'; end if;

  select count(*) into v_count from public.equipamentos;
  if v_count <> 1 then
    raise exception 'RESTRICTED_USER_EQUIPMENT_SCOPE_FAILED: %', v_count;
  end if;

  if not public.can_access_evidence_object(
    '81000000-0000-4000-8000-000000000010/documentos/81000000-0000-4000-8000-000000000202/teste-a.pdf'
  ) then raise exception 'AUTHORIZED_STORAGE_OBJECT_DENIED'; end if;

  if public.can_access_evidence_object(
    '81000000-0000-4000-8000-000000000010/documentos/81000000-0000-4000-8000-000000000203/teste-b.pdf'
  ) then raise exception 'CROSS_UNIT_STORAGE_OBJECT_LEAK'; end if;

  begin
    perform public.api_dashboard_unidade(
      '81000000-0000-4000-8000-000000000010',
      null
    );
    raise exception 'CONSOLIDATED_VIEW_LEAK';
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.api_assistente_contexto_unidade(
      '81000000-0000-4000-8000-000000000010',
      '81000000-0000-4000-8000-000000000102',
      'Mostre a Filial B',
      null,
      null
    );
    raise exception 'FLOWIA_CROSS_UNIT_LEAK';
  exception when sqlstate '42501' then null;
  end;

  begin
    insert into public.equipamentos(
      empresa_id, unidade_id, nome, codigo_interno
    ) values (
      '81000000-0000-4000-8000-000000000010',
      '81000000-0000-4000-8000-000000000102',
      'Tentativa Filial B',
      'EQ-LEAK'
    );
    raise exception 'CROSS_UNIT_INSERT_LEAK';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.equipamentos
    set unidade_id = '81000000-0000-4000-8000-000000000102'
    where id = '81000000-0000-4000-8000-000000000301';
    raise exception 'CROSS_UNIT_UPDATE_LEAK';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

do $$
declare
  v_qr uuid;
  v_qr_result jsonb;
begin
  perform public.api_transferir_equipamento_unidade(
    '81000000-0000-4000-8000-000000000010',
    '81000000-0000-4000-8000-000000000301',
    '81000000-0000-4000-8000-000000000102',
    'Transferência de validação',
    null,
    now(),
    'Histórico deve permanecer na origem'
  );

  if not exists (
    select 1 from public.transferencias_unidades
    where equipamento_id = '81000000-0000-4000-8000-000000000301'
      and unidade_origem_id = '81000000-0000-4000-8000-000000000101'
      and unidade_destino_id = '81000000-0000-4000-8000-000000000102'
  ) then raise exception 'EQUIPMENT_TRANSFER_HISTORY_FAILED'; end if;

  if exists (
    select 1 from public.calibracoes
    where id = '81000000-0000-4000-8000-000000000401'
      and unidade_id <> '81000000-0000-4000-8000-000000000101'
  ) then raise exception 'HISTORICAL_CALIBRATION_MOVED'; end if;

  if exists (
    select 1 from public.qualificacoes
    where id = '81000000-0000-4000-8000-000000000402'
      and unidade_id <> '81000000-0000-4000-8000-000000000101'
  ) then raise exception 'HISTORICAL_QUALIFICATION_MOVED'; end if;

  if exists (
    select 1 from public.manutencoes
    where id = '81000000-0000-4000-8000-000000000403'
      and unidade_id <> '81000000-0000-4000-8000-000000000101'
  ) then raise exception 'HISTORICAL_MAINTENANCE_MOVED'; end if;

  insert into public.manutencoes(
    empresa_id, equipamento_id, natureza, data_manutencao, numero_ordem_servico
  ) values (
    '81000000-0000-4000-8000-000000000010',
    '81000000-0000-4000-8000-000000000301',
    'preventiva',
    current_date,
    'OS-AFTER-TRANSFER'
  );

  if not exists (
    select 1 from public.manutencoes
    where numero_ordem_servico = 'OS-AFTER-TRANSFER'
      and unidade_id = '81000000-0000-4000-8000-000000000102'
  ) then raise exception 'NEW_MAINTENANCE_UNIT_FAILED'; end if;

  select qr_token into v_qr
  from public.equipamentos
  where id = '81000000-0000-4000-8000-000000000301';
  v_qr_result := public.api_resolver_qr_equipamento(v_qr);
  if v_qr_result ->> 'unidade_id' <> '81000000-0000-4000-8000-000000000102' then
    raise exception 'QR_CURRENT_UNIT_FAILED';
  end if;

  if not exists (
    select 1 from public.logs_auditoria
    where registro_id = '81000000-0000-4000-8000-000000000301'
      and acao = 'transferencia_unidade'
      and unidade_id = '81000000-0000-4000-8000-000000000102'
  ) then raise exception 'TRANSFER_AUDIT_FAILED'; end if;
end;
$$;

set local role service_role;

do $$
begin
  begin
    insert into public.unidades(
      empresa_id, codigo, nome, status
    ) values (
      '81000000-0000-4000-8000-000000000010',
      'LIMITE',
      'Acima do limite',
      'ativa'
    );
    raise exception 'UNIT_LIMIT_NOT_ENFORCED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm not like '%UNIT_LIMIT_REACHED%' then raise; end if;
  end;

  begin
    insert into public.equipamentos(
      empresa_id, unidade_id, nome, codigo_interno
    )
    select
      '81000000-0000-4000-8000-000000000010',
      u.id,
      'Equipamento UUID cruzado',
      'EQ-CROSS-COMPANY'
    from public.unidades u
    where u.empresa_id = '82000000-0000-4000-8000-000000000020'
      and u.is_matriz;
    raise exception 'CROSS_COMPANY_UNIT_ACCEPTED';
  exception
    when sqlstate '23514' then
      if sqlerrm not like '%UNIT_COMPANY_MISMATCH%' then raise; end if;
  end;

  begin
    delete from public.unidades
    where id = '81000000-0000-4000-8000-000000000101';
    raise exception 'UNIT_PHYSICAL_DELETE_ACCEPTED';
  exception
    when sqlstate '55000' then
      if sqlerrm not like '%UNIT_PHYSICAL_DELETE_FORBIDDEN%' then raise; end if;
  end;
end;
$$;

update public.limites_acesso_empresa
set max_units = 2
where empresa_id = '81000000-0000-4000-8000-000000000010'
  and source_type = 'custom';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

do $$
declare
  v_units jsonb;
begin
  v_units := public.api_listar_unidades('81000000-0000-4000-8000-000000000010');
  if coalesce((v_units -> 'limites' ->> 'em_excesso')::boolean, false) is not true then
    raise exception 'DOWNGRADE_EXCESS_NOT_REPORTED';
  end if;

  perform public.api_alterar_status_unidade(
    '81000000-0000-4000-8000-000000000010',
    '81000000-0000-4000-8000-000000000102',
    'arquivada',
    'Teste de downgrade'
  );

  begin
    perform public.api_alterar_status_unidade(
      '81000000-0000-4000-8000-000000000010',
      '81000000-0000-4000-8000-000000000102',
      'ativa',
      'Tentativa sem capacidade'
    );
    raise exception 'ARCHIVED_UNIT_REACTIVATED_ABOVE_LIMIT';
  exception
    when sqlstate 'P0001' then
      if sqlerrm not like '%UNIT_LIMIT_REACHED%' then raise; end if;
  end;
end;
$$;

rollback;
