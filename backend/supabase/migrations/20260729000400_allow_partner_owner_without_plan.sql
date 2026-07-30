-- Permite o primeiro administrador de uma conta parceira sem plano.
-- O modo unitário pode deixar o plano em branco até que o parceiro escolha
-- a cobrança. Ainda assim, o titular precisa conseguir acessar o ambiente
-- para concluir essa configuração.
create or replace function public.validate_user_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_current bigint;
  v_code text;
  v_is_first_owner boolean;
begin
  if new.ativo and new.deleted_at is null then
    select count(*) into v_current
    from public.usuarios_empresas ue
    where ue.empresa_id = new.empresa_id
      and ue.ativo
      and ue.deleted_at is null
      and (tg_op = 'INSERT' or ue.id <> new.id);

    v_is_first_owner := v_current = 0
      and new.perfil in ('administrador', 'parceiro_administrador');

    -- Empresas parceiras no modo unitário podem existir sem plano. O primeiro
    -- administrador é necessário para escolher a cobrança; os demais usuários
    -- continuam protegidos pelo recurso e pelos limites do plano.
    if not v_is_first_owner then
      perform public.assert_plan_feature(new.empresa_id, 'usuarios');
    end if;

    v_limit := public.effective_company_limit(new.empresa_id, 'max_users');

    if v_limit is not null and v_current >= v_limit then
      select case when access_status = 'provisional'
        then 'PROVISIONAL_LIMIT_REACHED'
        else 'PLAN_LIMIT_REACHED'
      end into v_code
      from public.empresas where id = new.empresa_id;

      raise exception '%', v_code
        using errcode = 'P0001', detail = 'Limite de usuários atingido.';
    end if;
  end if;

  return new;
end $$;

comment on function public.validate_user_plan_limit() is
  'Aplica recursos e limites de usuários, permitindo o primeiro administrador de parceiro sem plano.';
