-- Corrige o acesso do parceiro aos clientes vinculados e preserva o fluxo de
-- primeiro acesso por convite. O vínculo ativo é a única ponte entre tenants.

create or replace function public.has_company_membership(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_view_sandbox_company(p_empresa_id)
    and (
      public.is_master()
      or exists (
        select 1
        from public.usuarios_empresas ue
        join public.usuarios u on u.id = ue.usuario_id
        join public.empresas e on e.id = ue.empresa_id
        where ue.usuario_id = auth.uid()
          and ue.empresa_id = p_empresa_id
          and ue.ativo
          and ue.deleted_at is null
          and u.status = 'ativo'
          and u.deleted_at is null
          and e.deleted_at is null
      )
      or exists (
        select 1
        from public.relacionamentos_parceiro_clientes rpc
        join public.empresas cliente
          on cliente.id = rpc.cliente_empresa_id
         and cliente.deleted_at is null
        join public.empresas parceiro
          on parceiro.id = rpc.parceiro_empresa_id
         and parceiro.tipo_conta = 'parceira'
         and parceiro.deleted_at is null
         and parceiro.access_status in ('active', 'provisional')
        join public.usuarios_empresas ue
          on ue.empresa_id = rpc.parceiro_empresa_id
         and ue.usuario_id = auth.uid()
         and ue.ativo
         and ue.deleted_at is null
        join public.usuarios u on u.id = ue.usuario_id
          and u.status = 'ativo'
          and u.deleted_at is null
        where rpc.cliente_empresa_id = p_empresa_id
          and rpc.status = 'ativo'
      )
    )
$$;

create or replace function public.has_company_access(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_view_sandbox_company(p_empresa_id)
    and (
      public.is_master()
      or exists (
        select 1
        from public.usuarios_empresas ue
        join public.usuarios u on u.id = ue.usuario_id
        join public.empresas e on e.id = ue.empresa_id
        where ue.usuario_id = auth.uid()
          and ue.empresa_id = p_empresa_id
          and ue.ativo
          and ue.deleted_at is null
          and u.status = 'ativo'
          and u.deleted_at is null
          and e.access_status in ('provisional', 'active')
          and e.deleted_at is null
      )
      or exists (
        select 1
        from public.relacionamentos_parceiro_clientes rpc
        join public.empresas cliente
          on cliente.id = rpc.cliente_empresa_id
         and cliente.deleted_at is null
         and cliente.access_status in ('active', 'provisional')
        join public.empresas parceiro
          on parceiro.id = rpc.parceiro_empresa_id
         and parceiro.tipo_conta = 'parceira'
         and parceiro.deleted_at is null
         and parceiro.access_status in ('active', 'provisional')
        join public.usuarios_empresas ue
          on ue.empresa_id = rpc.parceiro_empresa_id
         and ue.usuario_id = auth.uid()
         and ue.ativo
         and ue.deleted_at is null
        join public.usuarios u on u.id = ue.usuario_id
          and u.status = 'ativo'
          and u.deleted_at is null
        left join public.assinaturas_empresas a
          on a.empresa_id = rpc.parceiro_empresa_id
         and a.deleted_at is null
        where rpc.cliente_empresa_id = p_empresa_id
          and rpc.status = 'ativo'
          and (
            a.status in ('trial', 'ativa', 'pagamento_pendente')
            -- O modo unitário pode ser criado sem assinatura para permitir o
            -- onboarding; assim que houver uma assinatura inadimplente ou
            -- bloqueada, o acesso deixa de ser permitido.
            or (a.id is null and parceiro.parceiro_cobranca_modo = 'unitario')
          )
      )
    )
$$;

create or replace function public.company_billing_allows_write(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce((
    select case
      when e.tipo_conta = 'cliente' then coalesce((
        select case
          when a.id is null and p.parceiro_cobranca_modo = 'unitario' then true
          else a.status in ('trial', 'ativa', 'pagamento_pendente')
        end
        from public.relacionamentos_parceiro_clientes rpc
        join public.empresas p on p.id = rpc.parceiro_empresa_id
          and p.deleted_at is null
        left join public.assinaturas_empresas a on a.empresa_id = p.id
          and a.deleted_at is null
        where rpc.cliente_empresa_id = e.id
          and rpc.status = 'ativo'
        limit 1
      ), false)
      when e.access_status = 'provisional' then true
      when a.id is null then true
      else a.status in ('trial', 'ativa', 'pagamento_pendente')
    end
    from public.empresas e
    left join public.assinaturas_empresas a
      on a.empresa_id = e.id
     and a.deleted_at is null
    where e.id = p_empresa_id
      and e.deleted_at is null
    limit 1
  ), false)
$$;

create or replace function public.company_role(p_empresa_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select case
    when public.is_master() then 'master'
    when exists (
      select 1 from public.usuarios_empresas ue
      where ue.usuario_id = auth.uid()
        and ue.empresa_id = p_empresa_id
        and ue.ativo
        and ue.deleted_at is null
    ) then (
      select ue.perfil from public.usuarios_empresas ue
      where ue.usuario_id = auth.uid()
        and ue.empresa_id = p_empresa_id
        and ue.ativo
        and ue.deleted_at is null
      limit 1
    )
    when exists (
      select 1
      from public.relacionamentos_parceiro_clientes rpc
      join public.usuarios_empresas ue
        on ue.empresa_id = rpc.parceiro_empresa_id
       and ue.usuario_id = auth.uid()
       and ue.ativo
       and ue.deleted_at is null
      where rpc.cliente_empresa_id = p_empresa_id
        and rpc.status = 'ativo'
    ) then case when exists (
      select 1
      from public.usuarios_empresas ue
      join public.relacionamentos_parceiro_clientes rpc
        on rpc.parceiro_empresa_id = ue.empresa_id
      where ue.usuario_id = auth.uid()
        and rpc.cliente_empresa_id = p_empresa_id
        and rpc.status = 'ativo'
        and ue.perfil in ('administrador', 'parceiro_administrador')
        and ue.ativo
        and ue.deleted_at is null
    ) then 'parceiro_administrador' else 'parceiro_colaborador' end
  end
$$;

revoke all on function public.has_company_membership(uuid) from public, anon;
revoke all on function public.has_company_access(uuid) from public, anon;
revoke all on function public.company_billing_allows_write(uuid) from public, anon;
revoke all on function public.company_role(uuid) from public, anon;
grant execute on function public.has_company_membership(uuid) to authenticated, service_role;
grant execute on function public.has_company_access(uuid) to authenticated, service_role;
grant execute on function public.company_billing_allows_write(uuid) to authenticated, service_role;
grant execute on function public.company_role(uuid) to authenticated, service_role;

