-- Permite que um parceiro autorizado opere o ambiente de um cliente vinculado.
--
-- O vínculo é a fronteira de isolamento: as permissões do parceiro só são
-- consideradas quando o cliente está ativo, pertence a esse parceiro e o
-- usuário possui uma associação ativa com a empresa parceira. Clientes sem
-- parceiro continuam sujeitos exclusivamente às permissões da própria
-- empresa e ao fluxo normal de aprovação.

insert into public.permissoes_padrao_perfil(perfil, permissao_codigo, permitido)
select 'parceiro_administrador', permissao_codigo, permitido
from public.permissoes_padrao_perfil
where perfil = 'administrador'
on conflict (perfil, permissao_codigo) do update
  set permitido = excluded.permitido;

insert into public.permissoes_padrao_perfil(perfil, permissao_codigo, permitido)
select 'parceiro_colaborador', permissao_codigo, permitido
from public.permissoes_padrao_perfil
where perfil = 'colaborador'
on conflict (perfil, permissao_codigo) do update
  set permitido = excluded.permitido;

create or replace function public.has_company_permission(p_empresa_id uuid, p_codigo text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select case
    when public.is_master() then true
    else coalesce(
      -- Permissão explícita do usuário no próprio ambiente.
      (
        select pue.permitido
        from public.permissoes_usuario_empresa pue
        where pue.empresa_id = p_empresa_id
          and pue.usuario_id = auth.uid()
          and pue.permissao_codigo = p_codigo
          and (pue.expira_em is null or pue.expira_em > now())
      ),
      -- Permissão padrão do usuário quando ele pertence diretamente à empresa.
      (
        select ppp.permitido
        from public.usuarios_empresas ue
        join public.permissoes_padrao_perfil ppp
          on ppp.perfil = ue.perfil
         and ppp.permissao_codigo = p_codigo
        where ue.empresa_id = p_empresa_id
          and ue.usuario_id = auth.uid()
          and ue.ativo
          and ue.deleted_at is null
      ),
      -- Permissão herdada de forma restrita para o parceiro que administra o
      -- cliente. Nunca consulta dados de clientes de outro parceiro.
      (
        select coalesce(pue_partner.permitido, ppp_partner.permitido, false)
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
        join public.usuarios_empresas ue_partner
          on ue_partner.empresa_id = rpc.parceiro_empresa_id
         and ue_partner.usuario_id = auth.uid()
         and ue_partner.ativo
         and ue_partner.deleted_at is null
        left join public.permissoes_usuario_empresa pue_partner
          on pue_partner.empresa_id = rpc.parceiro_empresa_id
         and pue_partner.usuario_id = auth.uid()
         and pue_partner.permissao_codigo = p_codigo
         and (pue_partner.expira_em is null or pue_partner.expira_em > now())
        left join public.permissoes_padrao_perfil ppp_partner
          on ppp_partner.perfil = ue_partner.perfil
         and ppp_partner.permissao_codigo = p_codigo
        where rpc.cliente_empresa_id = p_empresa_id
          and rpc.status = 'ativo'
        limit 1
      ),
      false
    )
  end
$$;

revoke all on function public.has_company_permission(uuid, text) from public, anon;
grant execute on function public.has_company_permission(uuid, text) to authenticated, service_role;

