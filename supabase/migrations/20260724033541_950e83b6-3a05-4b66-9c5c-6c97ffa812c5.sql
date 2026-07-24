create unique index if not exists uq_equipamentos_empresa_qr_token
  on public.equipamentos (empresa_id, qr_token);

create or replace function public.api_obter_qr_equipamento(p_equipamento_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_empresa_id uuid;
  v_qr_token uuid;
  v_nome text;
  v_codigo text;
begin
  select e.empresa_id, e.qr_token, e.nome, e.codigo_interno
    into v_empresa_id, v_qr_token, v_nome, v_codigo
  from public.equipamentos e
  where e.id = p_equipamento_id
    and e.deleted_at is null;

  if not found then
    raise exception 'EQUIPMENT_NOT_FOUND';
  end if;

  if not public.has_company_access(v_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_qr_token is null then
    update public.equipamentos
       set qr_token = gen_random_uuid(), updated_at = now(), updated_by = auth.uid()
     where id = p_equipamento_id
     returning qr_token into v_qr_token;
  end if;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id)
  values (v_empresa_id, auth.uid(), 'equipamentos', 'consultar_qr', p_equipamento_id);

  return jsonb_build_object(
    'empresa_id', v_empresa_id,
    'equipamento_id', p_equipamento_id,
    'qr_token', v_qr_token,
    'nome', v_nome,
    'codigo', v_codigo
  );
end;
$$;

create or replace function public.api_rotacionar_qr_equipamento(p_equipamento_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_empresa_id uuid;
  v_token uuid;
begin
  select e.empresa_id
    into v_empresa_id
  from public.equipamentos e
  where e.id = p_equipamento_id
    and e.deleted_at is null;

  if not found then
    raise exception 'EQUIPMENT_NOT_FOUND';
  end if;

  if not public.has_company_permission(v_empresa_id, 'equipamentos.editar') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.equipamentos
     set qr_token = gen_random_uuid(), updated_at = now(), updated_by = auth.uid()
   where id = p_equipamento_id
     and empresa_id = v_empresa_id
     and deleted_at is null
   returning qr_token into v_token;

  if v_token is null then
    raise exception 'EQUIPMENT_NOT_FOUND';
  end if;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id)
  values (v_empresa_id, auth.uid(), 'equipamentos', 'rotacionar_qr', p_equipamento_id);

  return jsonb_build_object(
    'empresa_id', v_empresa_id,
    'equipamento_id', p_equipamento_id,
    'qr_token', v_token
  );
end;
$$;

revoke all on function public.api_obter_qr_equipamento(uuid) from public, anon;
revoke all on function public.api_rotacionar_qr_equipamento(uuid) from public, anon;
grant execute on function public.api_obter_qr_equipamento(uuid) to authenticated;
grant execute on function public.api_rotacionar_qr_equipamento(uuid) to authenticated;