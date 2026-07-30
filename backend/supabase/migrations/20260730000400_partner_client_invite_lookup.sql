-- Retorna o e-mail do cliente somente ao Admin Master ou ao administrador do
-- parceiro que possui vínculo ativo com esse cliente. Usado para reenviar o
-- primeiro acesso de clientes criados antes do convite automático.

create or replace function public.api_partner_listar_clientes(p_parceiro_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_master() and not exists (
    select 1
    from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid()
      and ue.empresa_id = p_parceiro_empresa_id
      and ue.ativo
      and ue.deleted_at is null
      and ue.perfil in ('administrador', 'parceiro_administrador')
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'razao_social', c.razao_social,
    'nome_fantasia', c.nome_fantasia,
    'cnpj', c.cnpj,
    'email_principal', c.email_principal,
    'status', c.status,
    'access_status', c.access_status,
    'segmento', c.segmento,
    'tipo_estabelecimento', c.tipo_estabelecimento,
    'plano', jsonb_build_object('id', p.id, 'nome', p.nome, 'codigo', p.codigo),
    'relacionamento', jsonb_build_object(
      'id', rpc.id,
      'status', rpc.status,
      'inicio_em', rpc.inicio_em,
      'encerrado_em', rpc.encerrado_em
    ),
    'isencao', case when i.id is null then null else jsonb_build_object(
      'id', i.id,
      'inicio_em', i.inicio_em,
      'termina_em', i.termina_em,
      'meses', i.meses,
      'status', i.status,
      'motivo', i.motivo
    ) end
  ) order by c.nome_fantasia), '[]'::jsonb)
  into v_result
  from public.relacionamentos_parceiro_clientes rpc
  join public.empresas c
    on c.id = rpc.cliente_empresa_id
   and c.deleted_at is null
  join public.planos p on p.id = rpc.plano_servico_id
  left join lateral (
    select i.*
    from public.isencoes_parceiro i
    where i.parceiro_empresa_id = rpc.parceiro_empresa_id
      and i.cliente_empresa_id = rpc.cliente_empresa_id
      and i.status = 'ativa'
      and current_date between i.inicio_em and i.termina_em
    order by i.created_at desc
    limit 1
  ) i on true
  where rpc.parceiro_empresa_id = p_parceiro_empresa_id
    and rpc.status <> 'encerrado';

  return v_result;
end
$$;

revoke all on function public.api_partner_listar_clientes(uuid) from public, anon;
grant execute on function public.api_partner_listar_clientes(uuid) to authenticated;

