-- Gestão segura de perfis de usuários por empresa.
-- A tela chama esta RPC; a permissão real fica no backend.

create or replace function public.api_atualizar_usuario_empresa(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.usuarios_empresas%rowtype;
  v_new_perfil text;
  v_new_ativo boolean;
  v_admins_restantes integer;
begin
  if not public.can_admin_company(p_empresa_id) then
    raise exception 'forbidden';
  end if;

  if p_usuario_id = auth.uid() and not public.is_master() then
    raise exception 'self_profile_change_not_allowed';
  end if;

  select *
    into v_old
  from public.usuarios_empresas
  where empresa_id = p_empresa_id
    and usuario_id = p_usuario_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'user_membership_not_found';
  end if;

  v_new_perfil := coalesce(nullif(p_payload->>'perfil', ''), v_old.perfil);
  v_new_ativo := coalesce((p_payload->>'ativo')::boolean, v_old.ativo);

  if v_new_perfil not in ('administrador','responsavel_tecnico','colaborador','somente_leitura') then
    raise exception 'invalid_profile';
  end if;

  if v_old.perfil = 'administrador' and (v_new_perfil <> 'administrador' or v_new_ativo is false) then
    select count(*)
      into v_admins_restantes
    from public.usuarios_empresas ue
    join public.usuarios u on u.id = ue.usuario_id
    where ue.empresa_id = p_empresa_id
      and ue.usuario_id <> p_usuario_id
      and ue.perfil = 'administrador'
      and ue.ativo = true
      and ue.deleted_at is null
      and u.status = 'ativo'
      and u.deleted_at is null;

    if v_admins_restantes = 0 then
      raise exception 'company_must_keep_one_admin';
    end if;
  end if;

  update public.usuarios_empresas
     set perfil = v_new_perfil,
         ativo = v_new_ativo,
         updated_at = now()
   where id = v_old.id;

  insert into public.logs_auditoria(
    empresa_id,
    usuario_id,
    modulo,
    acao,
    registro_id,
    valor_anterior,
    novo_valor
  )
  values (
    p_empresa_id,
    auth.uid(),
    'usuarios',
    'atualizar_perfil_usuario',
    p_usuario_id,
    jsonb_build_object('perfil', v_old.perfil, 'ativo', v_old.ativo),
    jsonb_build_object('perfil', v_new_perfil, 'ativo', v_new_ativo)
  );

  return jsonb_build_object(
    'usuario_id', p_usuario_id,
    'empresa_id', p_empresa_id,
    'perfil', v_new_perfil,
    'ativo', v_new_ativo
  );
end;
$$;

revoke all on function public.api_atualizar_usuario_empresa(uuid, uuid, jsonb) from public, anon;
grant execute on function public.api_atualizar_usuario_empresa(uuid, uuid, jsonb) to authenticated;
