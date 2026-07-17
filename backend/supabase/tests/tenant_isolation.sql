begin;

-- Este teste roda dentro de uma transação e não deixa dados na base local.
insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tenant-a@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tenant-b@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.usuarios(id, nome, email) values
  ('10000000-0000-4000-8000-000000000001', 'Usuário Tenant A', 'tenant-a@test.local'),
  ('20000000-0000-4000-8000-000000000002', 'Usuário Tenant B', 'tenant-b@test.local');

insert into public.empresas(id, razao_social, nome_fantasia, cnpj, status, verification_status, access_status) values
  ('a0000000-0000-4000-8000-000000000001', 'Empresa Isolada A', 'Tenant A', '11.111.111/0001-11', 'ativa', 'verified', 'active'),
  ('b0000000-0000-4000-8000-000000000002', 'Empresa Isolada B', 'Tenant B', '22.222.222/0001-22', 'ativa', 'verified', 'active');

insert into public.usuarios_empresas(usuario_id, empresa_id, perfil) values
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'administrador'),
  ('20000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'administrador');

insert into public.documentos(id, empresa_id, nome, exige_anexo) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Documento privado A', false),
  ('b1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Documento privado B', false);

insert into public.equipamentos(id, empresa_id, nome, codigo_interno) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Equipamento privado A', 'EQ-A'),
  ('b2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Equipamento privado B', 'EQ-B');

insert into public.manutencoes(id, empresa_id, equipamento_id, natureza, data_manutencao) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'preventiva', current_date),
  ('b3000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002', 'preventiva', current_date);

insert into public.documento_revisoes(id,empresa_id,documento_id,numero_versao,snapshot_json,conteudo_hash,created_by) values
  ('a4000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',1,'{}','hash-a','10000000-0000-4000-8000-000000000001'),
  ('b4000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002',1,'{}','hash-b','20000000-0000-4000-8000-000000000002');

insert into public.regras_notificacao_empresa(id,empresa_id,nome,evento,created_by) values
  ('a5000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Regra A','vencimento','10000000-0000-4000-8000-000000000001'),
  ('b5000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','Regra B','vencimento','20000000-0000-4000-8000-000000000002');

insert into public.achados_qualidade_dados(id,empresa_id,regra_codigo,modulo,registro_id,titulo,severidade) values
  ('a6000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','DOC_VENCIMENTO','documentos','a1000000-0000-4000-8000-000000000001','Achado A','warning'),
  ('b6000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','DOC_VENCIMENTO','documentos','b1000000-0000-4000-8000-000000000002','Achado B','warning');

insert into public.relatorios_agendados(id,empresa_id,nome,frequencia,destinatarios,created_by) values
  ('a7000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Relatorio A','semanal',array['a@test.local'],'10000000-0000-4000-8000-000000000001'),
  ('b7000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','Relatorio B','semanal',array['b@test.local'],'20000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

do $$
declare
  v_visible integer;
begin
  select count(*) into v_visible from public.documentos;
  if v_visible <> 1 then
    raise exception 'TENANT_ISOLATION_READ_FAILED: tenant A visualizou % documentos', v_visible;
  end if;
  if exists (
    select 1 from public.documentos
    where empresa_id = 'b0000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'TENANT_ISOLATION_READ_LEAK';
  end if;
  select count(*) into v_visible from public.equipamentos;
  if v_visible <> 1 then
    raise exception 'TENANT_EQUIPMENT_READ_ISOLATION_FAILED: tenant A visualizou % equipamentos', v_visible;
  end if;
  select count(*) into v_visible from public.manutencoes;
  if v_visible <> 1 then
    raise exception 'TENANT_MAINTENANCE_READ_ISOLATION_FAILED: tenant A visualizou % manutenções', v_visible;
  end if;

  select count(*) into v_visible from public.documento_revisoes;
  if v_visible <> 1 then raise exception 'TENANT_DOCUMENT_WORKFLOW_READ_ISOLATION_FAILED'; end if;
  select count(*) into v_visible from public.regras_notificacao_empresa;
  if v_visible <> 1 then raise exception 'TENANT_NOTIFICATION_RULE_READ_ISOLATION_FAILED'; end if;
  select count(*) into v_visible from public.achados_qualidade_dados;
  if v_visible <> 1 then raise exception 'TENANT_DATA_QUALITY_READ_ISOLATION_FAILED'; end if;
  select count(*) into v_visible from public.relatorios_agendados;
  if v_visible <> 1 then raise exception 'TENANT_SCHEDULED_REPORT_READ_ISOLATION_FAILED'; end if;
  if public.has_company_permission('b0000000-0000-4000-8000-000000000002','documentos.ler') then
    raise exception 'TENANT_PERMISSION_RESOLUTION_LEAK';
  end if;

  begin
    insert into public.documentos(empresa_id, nome, exige_anexo)
    values ('b0000000-0000-4000-8000-000000000002', 'Tentativa cruzada', false);
    raise exception 'TENANT_ISOLATION_WRITE_LEAK';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.equipamentos(empresa_id, nome, codigo_interno)
    values ('b0000000-0000-4000-8000-000000000002', 'Tentativa cruzada', 'EQ-LEAK');
    raise exception 'TENANT_EQUIPMENT_WRITE_LEAK';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_documento_workflow(
      'b0000000-0000-4000-8000-000000000002',
      'b1000000-0000-4000-8000-000000000002'
    );
    raise exception 'TENANT_WORKFLOW_RPC_LEAK';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.api_listar_relatorios_agendados('b0000000-0000-4000-8000-000000000002');
    raise exception 'TENANT_SCHEDULED_REPORT_RPC_LEAK';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
