-- O Sandbox de um Admin Master não pode aparecer para outro Admin Master.
begin;

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'master-a@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('40000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'master-b@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.usuarios(id, nome, email, is_master) values
  ('30000000-0000-4000-8000-000000000003', 'Master A', 'master-a@test.local', true),
  ('40000000-0000-4000-8000-000000000004', 'Master B', 'master-b@test.local', true);

insert into public.empresas(
  id, razao_social, nome_fantasia, cnpj, status, verification_status,
  access_status, is_sandbox
) values (
  'c0000000-0000-4000-8000-000000000003', 'Sandbox A', 'Sandbox A', 'SBX-ISOLATION-A',
  'ativa', 'verified', 'provisional', true
);

insert into public.sandbox_ambientes(id, empresa_id, owner_user_id, nome, created_by)
values (
  'd0000000-0000-4000-8000-000000000004',
  'c0000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000003',
  'Sandbox A',
  '30000000-0000-4000-8000-000000000003'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}',
  true
);

do $$
declare v_visible integer;
begin
  select count(*) into v_visible from public.empresas where is_sandbox;
  if v_visible <> 1 then raise exception 'SANDBOX_OWNER_CANNOT_READ_OWN_ENVIRONMENT'; end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}',
  true
);

do $$
declare v_visible integer;
begin
  select count(*) into v_visible from public.empresas where is_sandbox;
  if v_visible <> 0 then raise exception 'SANDBOX_OWNER_ISOLATION_LEAK'; end if;
end;
$$;

rollback;
