-- Regressão: add-ons ativos precisam alterar o limite efetivo no backend.
-- Roda em transação e usa somente fixtures locais.

begin;

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '90000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'addon-limit@test.local', '',
  now(), now(), now(), '{}'::jsonb, '{}'::jsonb
);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '90000000-0000-4000-8000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'addon-limit-other@test.local', '',
  now(), now(), now(), '{}'::jsonb, '{}'::jsonb
);

insert into public.usuarios(id, nome, email, is_master)
values ('90000000-0000-4000-8000-000000000001', 'Addon Limit Test', 'addon-limit@test.local', false);

insert into public.usuarios(id, nome, email, is_master)
values ('90000000-0000-4000-8000-000000000003', 'Addon Limit Other', 'addon-limit-other@test.local', false);

insert into public.empresas(
  id, razao_social, nome_fantasia, cnpj, status, verification_status, access_status, plano_id
)
select
  '90000000-0000-4000-8000-000000000002',
  'Addon Limit Test', 'Addon Limit Test', '90.000.000/0000-01',
  'ativa', 'verified', 'active', p.id
from public.planos p
where p.codigo = 'profissional'
limit 1;

insert into public.usuarios_empresas(usuario_id, empresa_id, perfil)
values (
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  'administrador'
);

insert into public.assinaturas_empresas(
  empresa_id, plano_id, status, ciclo, valor_mensal_centavos,
  moeda, usuarios_extras, unidades_extras
)
select
  e.id, e.plano_id, 'ativa', 'mensal', p.valor_mensal_centavos,
  p.moeda, 2, 2
from public.empresas e
join public.planos p on p.id = e.plano_id
where e.id = '90000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

do $$
declare
  v_users integer;
  v_units integer;
begin
  v_users := public.effective_company_limit(
    '90000000-0000-4000-8000-000000000002', 'max_users'
  );
  v_units := public.effective_company_limit(
    '90000000-0000-4000-8000-000000000002', 'max_units'
  );

  if v_users <> 6 then
    raise exception 'ADDON_USER_LIMIT_NOT_APPLIED: %', v_users;
  end if;
  if v_units <> 3 then
    raise exception 'ADDON_UNIT_LIMIT_NOT_APPLIED: %', v_units;
  end if;
end;
$$;

-- Cenario de capacidade: a empresa ocupa as seis vagas efetivas (quatro do
-- plano + duas extras) e a sétima associação deve ser recusada pelo trigger.
-- A carga direta de identidades é uma operação administrativa do fixture.
-- O trigger de capacidade continua ativo nas associações abaixo.
reset role;
insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('90000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'addon-user-10@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'addon-user-11@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'addon-user-12@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'addon-user-13@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'addon-user-14@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'addon-user-15@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.usuarios(id, nome, email, is_master) values
  ('90000000-0000-4000-8000-000000000010', 'Addon User 10', 'addon-user-10@test.local', false),
  ('90000000-0000-4000-8000-000000000011', 'Addon User 11', 'addon-user-11@test.local', false),
  ('90000000-0000-4000-8000-000000000012', 'Addon User 12', 'addon-user-12@test.local', false),
  ('90000000-0000-4000-8000-000000000013', 'Addon User 13', 'addon-user-13@test.local', false),
  ('90000000-0000-4000-8000-000000000014', 'Addon User 14', 'addon-user-14@test.local', false),
  ('90000000-0000-4000-8000-000000000015', 'Addon User 15', 'addon-user-15@test.local', false);

insert into public.usuarios_empresas(usuario_id, empresa_id, perfil) values
  ('90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000002', 'colaborador'),
  ('90000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000002', 'colaborador'),
  ('90000000-0000-4000-8000-000000000012', '90000000-0000-4000-8000-000000000002', 'colaborador'),
  ('90000000-0000-4000-8000-000000000013', '90000000-0000-4000-8000-000000000002', 'colaborador'),
  ('90000000-0000-4000-8000-000000000014', '90000000-0000-4000-8000-000000000002', 'colaborador');

do $$
begin
  begin
    insert into public.usuarios_empresas(usuario_id, empresa_id, perfil)
    values ('90000000-0000-4000-8000-000000000015', '90000000-0000-4000-8000-000000000002', 'colaborador');
    raise exception 'ADDON_USER_CAPACITY_NOT_ENFORCED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm not like '%PLAN_LIMIT_REACHED%' then raise; end if;
  end;
end;
$$;

do $$
declare
  v_matriz integer;
begin
  if to_regclass('public.unidades') is null then
    raise exception 'MULTIUNIT_TABLE_REQUIRED';
  end if;

  select count(*) into v_matriz
  from public.unidades
  where empresa_id = '90000000-0000-4000-8000-000000000002'
    and is_matriz
    and deleted_at is null;

  if v_matriz <> 1 then
    raise exception 'MULTIUNIT_MATRIX_BACKFILL_FAILED: %', v_matriz;
  end if;

  if public.active_company_unit_count(
    '90000000-0000-4000-8000-000000000002'
  ) <> 1 then
    raise exception 'MULTIUNIT_INITIAL_USAGE_FAILED';
  end if;

  if public.effective_unit_limit(
    '90000000-0000-4000-8000-000000000002'
  ) <> 3 then
    raise exception 'MULTIUNIT_ADDON_LIMIT_FAILED';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}',
  true
);

do $$
begin
  begin
    perform public.effective_company_limit(
      '90000000-0000-4000-8000-000000000002', 'max_users'
    );
    raise exception 'ADDON_LIMIT_TENANT_GUARD_FAILED';
  exception
    when sqlstate '42501' then null;
  end;
end;
$$;

rollback;
