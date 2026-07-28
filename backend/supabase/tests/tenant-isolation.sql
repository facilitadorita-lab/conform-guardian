-- Checklist manual/CI para validar isolamento multi-tenant.
-- Execute em um ambiente de teste com dois usuários e duas empresas.
-- Nunca use service_role para validar leitura: as políticas devem ser
-- exercitadas com o JWT de cada usuário.

-- Substitua os UUIDs e rode cada consulta com o JWT do usuário A.
select 'empresa_a_acessivel' as check_name,
       public.has_company_access('00000000-0000-0000-0000-000000000001'::uuid) as passed;

select 'empresa_b_bloqueada' as check_name,
       not public.has_company_access('00000000-0000-0000-0000-000000000002'::uuid) as passed;

select 'parceiro_sem_vazamento' as check_name,
       not exists (
         select 1
         from public.relacionamentos_parceiro_clientes r
         where r.parceiro_id = '00000000-0000-0000-0000-000000000003'::uuid
           and r.ativo
           and public.has_company_access(r.cliente_id)
           and not exists (
             select 1 from public.relacionamentos_parceiro_clientes r2
             where r2.parceiro_id = r.parceiro_id and r2.cliente_id = r.cliente_id and r2.ativo
           )
       ) as passed;
