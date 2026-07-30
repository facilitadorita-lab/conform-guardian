begin;

-- Regra esperada: o parceiro acessa apenas seus clientes; um cliente não
-- herda acesso ao cliente vizinho nem à assinatura do parceiro.
insert into public.empresas(
  id, razao_social, nome_fantasia, cnpj, tipo_conta, status, verification_status, access_status
) values
  ('c0000000-0000-4000-8000-000000000001', 'Parceiro Teste', 'Parceiro Teste', '31.111.111/0001-11', 'parceira', 'ativa', 'verified', 'active'),
  ('c1000000-0000-4000-8000-000000000001', 'Cliente Um', 'Cliente Um', '32.111.111/0001-11', 'cliente', 'ativa', 'verified', 'active'),
  ('c2000000-0000-4000-8000-000000000001', 'Cliente Dois', 'Cliente Dois', '33.111.111/0001-11', 'cliente', 'ativa', 'verified', 'active');

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('c3000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'partner@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('c4000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.usuarios(id, nome, email) values
  ('c3000000-0000-4000-8000-000000000001', 'Admin Parceiro', 'partner@test.local'),
  ('c4000000-0000-4000-8000-000000000001', 'Admin Cliente', 'client@test.local');

insert into public.usuarios_empresas(usuario_id, empresa_id, perfil) values
  ('c3000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'administrador'),
  ('c4000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'administrador');

insert into public.relacionamentos_parceiro_clientes(
  parceiro_empresa_id, cliente_empresa_id, plano_servico_id
) select 'c0000000-0000-4000-8000-000000000001', e.id, p.id
  from public.empresas e cross join lateral (
    select id from public.planos where tipo_plano = 'direto' and ativo order by ordem limit 1
  ) p
  where e.id in ('c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"c3000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

do $$
begin
  if not public.has_company_membership('c1000000-0000-4000-8000-000000000001') then
    raise exception 'PARTNER_LINKED_CLIENT_NOT_VISIBLE';
  end if;
  if not public.has_company_membership('c2000000-0000-4000-8000-000000000001') then
    raise exception 'PARTNER_SECOND_CLIENT_NOT_VISIBLE';
  end if;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"c4000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

do $$
begin
  if public.has_company_membership('c2000000-0000-4000-8000-000000000001') then
    raise exception 'CLIENT_CROSS_TENANT_ACCESS_LEAK';
  end if;
  if not public.has_company_membership('c1000000-0000-4000-8000-000000000001') then
    raise exception 'CLIENT_OWN_TENANT_ACCESS_FAILED';
  end if;
end $$;

rollback;
