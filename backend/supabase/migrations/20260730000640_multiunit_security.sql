-- Conform Flow - funções de autorização, RLS e permissões da multiunidade.
-- Este estágio finaliza o isolamento por empresa e unidade.

create or replace function public.unit_belongs_to_company(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p_unidade_id is not null
    and exists (
      select 1
      from public.unidades u
      where u.id = p_unidade_id
        and u.empresa_id = p_empresa_id
        and u.deleted_at is null
    )
$$;

create or replace function public.has_unit_membership(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_company_membership(p_empresa_id)
    and public.unit_belongs_to_company(p_empresa_id, p_unidade_id)
    and (
      public.is_master()
      or public.company_role(p_empresa_id) in (
        'administrador',
        'administrador_provisorio',
        'parceiro_administrador',
        -- O vínculo parceiro-cliente já foi validado por
        -- has_company_membership. O colaborador do parceiro acessa as
        -- unidades desse cliente, mas não recebe visão consolidada nem
        -- privilégios administrativos.
        'parceiro_colaborador'
      )
      or exists (
        select 1
        from public.usuarios_empresas ue
        where ue.usuario_id = auth.uid()
          and ue.empresa_id = p_empresa_id
          and ue.ativo
          and ue.deleted_at is null
          and ue.acesso_todas_unidades
      )
      or exists (
        select 1
        from public.usuarios_unidades uu
        where uu.usuario_id = auth.uid()
          and uu.empresa_id = p_empresa_id
          and uu.unidade_id = p_unidade_id
          and uu.ativo
          and uu.deleted_at is null
      )
    )
$$;

create or replace function public.has_unit_access(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_company_access(p_empresa_id)
    and public.has_unit_membership(p_empresa_id, p_unidade_id)
$$;

create or replace function public.can_read_unit(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_unit_access(p_empresa_id, p_unidade_id)
$$;

create or replace function public.can_write_unit(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_write_company(p_empresa_id)
    and public.has_unit_membership(p_empresa_id, p_unidade_id)
    and exists (
      select 1
      from public.unidades u
      where u.id = p_unidade_id
        and u.empresa_id = p_empresa_id
        and u.status in ('ativa', 'em_implantacao')
        and u.deleted_at is null
    )
$$;

create or replace function public.can_admin_unit(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_admin_company(p_empresa_id)
    and public.has_unit_membership(p_empresa_id, p_unidade_id)
$$;

create or replace function public.can_use_consolidated_view(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_company_access(p_empresa_id)
    and (
      public.is_master()
      or public.company_role(p_empresa_id) in (
        'administrador',
        'administrador_provisorio',
        'parceiro_administrador'
      )
      or exists (
        select 1
        from public.usuarios_empresas ue
        where ue.usuario_id = auth.uid()
          and ue.empresa_id = p_empresa_id
          and ue.ativo
          and ue.deleted_at is null
          and ue.acesso_todas_unidades
      )
    )
$$;

create or replace function public.current_user_unit_ids(p_empresa_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.id
  from public.unidades u
  where u.empresa_id = p_empresa_id
    and u.deleted_at is null
    and public.has_unit_access(p_empresa_id, u.id)
  order by u.is_matriz desc, u.nome
$$;

create or replace function public.active_company_unit_count(p_empresa_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.role() = 'authenticated'
    and not public.has_company_access(p_empresa_id)
  then
    raise exception 'COMPANY_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  select count(*)::integer
  into v_count
  from public.unidades u
  where u.empresa_id = p_empresa_id
    and u.deleted_at is null
    and u.status in ('ativa', 'inativa', 'em_implantacao');

  return v_count;
end
$$;

create or replace function public.effective_unit_limit(p_empresa_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select greatest(coalesce(public.effective_company_limit(p_empresa_id, 'max_units'), 1), 1)
$$;

create or replace function public.can_create_company_unit(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_admin_company(p_empresa_id)
    and public.company_billing_allows_write(p_empresa_id)
    and public.active_company_unit_count(p_empresa_id) < public.effective_unit_limit(p_empresa_id)
    and (
      public.plan_feature_enabled(p_empresa_id, 'multi_unidades')
      or public.active_company_unit_count(p_empresa_id) = 0
    )
$$;

create or replace function public.validate_unit_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_consumes boolean;
  v_previously_consumed boolean := false;
  v_limit integer;
  v_current integer;
begin
  v_consumes := new.deleted_at is null
    and new.status in ('ativa', 'inativa', 'em_implantacao');

  if not exists (
    select 1
    from public.empresas e
    where e.id = new.empresa_id
      and e.deleted_at is null
  ) then
    raise exception 'ACTIVE_COMPANY_REQUIRED'
      using errcode = '23503',
        detail = 'A unidade deve pertencer a uma empresa existente e não excluída.';
  end if;

  if tg_op = 'UPDATE' then
    v_previously_consumed := old.deleted_at is null
      and old.status in ('ativa', 'inativa', 'em_implantacao');
  end if;

  if v_consumes and not v_previously_consumed then
    perform pg_advisory_xact_lock(hashtextextended(new.empresa_id::text, 93471));
    select count(*)::integer
    into v_current
    from public.unidades u
    where u.empresa_id = new.empresa_id
      and u.deleted_at is null
      and u.status in ('ativa', 'inativa', 'em_implantacao')
      and (tg_op = 'INSERT' or u.id <> new.id);

    -- Toda empresa precisa de uma matriz, inclusive antes de a associação do
    -- primeiro administrador e a assinatura serem gravadas.
    if new.is_matriz and v_current = 0 then
      return new;
    end if;

    v_limit := public.effective_unit_limit(new.empresa_id);
    if v_current >= v_limit then
      raise exception 'UNIT_LIMIT_REACHED'
        using errcode = 'P0001',
          detail = format('A empresa utiliza %s de %s unidades contratadas.', v_current, v_limit);
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists trg_unidades_capacity on public.unidades;
create trigger trg_unidades_capacity
before insert or update of status, deleted_at on public.unidades
for each row execute function public.validate_unit_capacity();

create or replace function public.validate_unit_context()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unidade_id uuid;
  v_empresa_id uuid;
begin
  if tg_table_name = 'documentos' then
    if new.escopo_documento = 'corporativo' then
      new.unidade_id := null;
    elsif new.unidade_id is null then
      raise exception 'UNIT_REQUIRED' using errcode = '23514';
    end if;
  elsif tg_table_name = 'equipamentos' then
    if new.unidade_id is null then
      raise exception 'UNIT_REQUIRED' using errcode = '23514';
    end if;
  elsif tg_table_name = 'calibracoes' then
    select e.empresa_id, e.unidade_id
    into v_empresa_id, v_unidade_id
    from public.equipamentos e
    where e.id = new.equipamento_id
      and e.deleted_at is null;

    if v_empresa_id is null or v_empresa_id <> new.empresa_id then
      raise exception 'EQUIPMENT_COMPANY_MISMATCH' using errcode = '23503';
    end if;

    if tg_op = 'INSERT' then
      new.unidade_id := v_unidade_id;
    elsif new.equipamento_id is distinct from old.equipamento_id then
      new.unidade_id := v_unidade_id;
    elsif new.unidade_id is null then
      new.unidade_id := v_unidade_id;
    elsif new.unidade_id is distinct from old.unidade_id then
      raise exception 'EQUIPMENT_UNIT_MISMATCH' using errcode = '23514';
    end if;
  elsif tg_table_name = 'qualificacoes' then
    select e.empresa_id, e.unidade_id
    into v_empresa_id, v_unidade_id
    from public.equipamentos e
    where e.id = new.equipamento_id
      and e.deleted_at is null;

    if v_empresa_id is null or v_empresa_id <> new.empresa_id then
      raise exception 'EQUIPMENT_COMPANY_MISMATCH' using errcode = '23503';
    end if;

    if tg_op = 'INSERT' then
      new.unidade_id := v_unidade_id;
    elsif new.equipamento_id is distinct from old.equipamento_id then
      new.unidade_id := v_unidade_id;
    elsif new.unidade_id is null then
      new.unidade_id := v_unidade_id;
    elsif new.unidade_id is distinct from old.unidade_id then
      raise exception 'EQUIPMENT_UNIT_MISMATCH' using errcode = '23514';
    end if;
  elsif tg_table_name = 'manutencoes' then
    if new.equipamento_id is not null then
      select e.empresa_id, e.unidade_id
      into v_empresa_id, v_unidade_id
      from public.equipamentos e
      where e.id = new.equipamento_id
        and e.deleted_at is null;

      if v_empresa_id is null or v_empresa_id <> new.empresa_id then
        raise exception 'EQUIPMENT_COMPANY_MISMATCH' using errcode = '23503';
      end if;

      if tg_op = 'INSERT' then
        new.unidade_id := v_unidade_id;
      elsif new.equipamento_id is distinct from old.equipamento_id then
        new.unidade_id := v_unidade_id;
      elsif new.unidade_id is null then
        new.unidade_id := v_unidade_id;
      elsif new.unidade_id is distinct from old.unidade_id then
        raise exception 'EQUIPMENT_UNIT_MISMATCH' using errcode = '23514';
      end if;
    elsif new.unidade_id is null then
      raise exception 'UNIT_REQUIRED' using errcode = '23514';
    end if;
  elsif tg_table_name = 'tratativas_pendencias' then
    select p.empresa_id, p.unidade_id
    into v_empresa_id, v_unidade_id
    from public.pendencias p
    where p.id = new.pendencia_id
      and p.deleted_at is null;

    if v_empresa_id is null or v_empresa_id <> new.empresa_id then
      raise exception 'PENDING_COMPANY_MISMATCH' using errcode = '23503';
    end if;
    new.unidade_id := v_unidade_id;
  elsif tg_table_name in ('pendencias', 'alertas', 'anexos') then
    v_unidade_id := public.resolve_record_unit(new.empresa_id, new.modulo, new.registro_id);
    if v_unidade_id is not null then
      new.unidade_id := v_unidade_id;
    end if;
  elsif tg_table_name = 'execucoes_relatorios_agendados' then
    select r.empresa_id, r.unidade_id
    into v_empresa_id, v_unidade_id
    from public.relatorios_agendados r
    where r.id = new.relatorio_agendado_id;
    if v_empresa_id is null or v_empresa_id <> new.empresa_id then
      raise exception 'REPORT_COMPANY_MISMATCH' using errcode = '23503';
    end if;
    new.unidade_id := v_unidade_id;
  end if;

  if new.unidade_id is not null
    and not public.unit_belongs_to_company(new.empresa_id, new.unidade_id)
  then
    raise exception 'UNIT_COMPANY_MISMATCH' using errcode = '23514';
  end if;

  return new;
end
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'pendencias',
    'tratativas_pendencias',
    'alertas',
    'anexos',
    'relatorios_agendados',
    'execucoes_relatorios_agendados'
  ] loop
    execute format('drop trigger if exists trg_%I_unit_context on public.%I', v_table, v_table);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.validate_unit_context()',
      'trg_' || v_table || '_unit_context',
      v_table
    );
  end loop;
end
$$;

create or replace function public.prevent_unit_physical_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'UNIT_PHYSICAL_DELETE_FORBIDDEN'
    using errcode = '55000',
      detail = 'Arquive a unidade para preservar o histórico.';
end
$$;

drop trigger if exists trg_unidades_no_physical_delete on public.unidades;
create trigger trg_unidades_no_physical_delete
before delete on public.unidades
for each row execute function public.prevent_unit_physical_delete();

drop trigger if exists trg_unidades_audit_fields on public.unidades;
create trigger trg_unidades_audit_fields
before insert or update on public.unidades
for each row execute function public.set_audit_fields();

drop trigger if exists trg_unidades_audit_log on public.unidades;
create trigger trg_unidades_audit_log
after insert or update on public.unidades
for each row execute function public.audit_row_change();

drop trigger if exists trg_usuarios_unidades_audit_fields on public.usuarios_unidades;
create trigger trg_usuarios_unidades_audit_fields
before insert or update on public.usuarios_unidades
for each row execute function public.set_audit_fields();

drop trigger if exists trg_usuarios_unidades_audit_log on public.usuarios_unidades;
create trigger trg_usuarios_unidades_audit_log
after insert or update on public.usuarios_unidades
for each row execute function public.audit_row_change();

alter table public.unidades enable row level security;
alter table public.usuarios_unidades enable row level security;
alter table public.transferencias_unidades enable row level security;

drop policy if exists unidades_read on public.unidades;
create policy unidades_read on public.unidades
for select to authenticated
using (
  deleted_at is null
  and public.has_unit_access(empresa_id, id)
);

drop policy if exists unidades_insert on public.unidades;
create policy unidades_insert on public.unidades
for insert to authenticated
with check (public.can_admin_company(empresa_id));

drop policy if exists unidades_update on public.unidades;
create policy unidades_update on public.unidades
for update to authenticated
using (public.can_admin_unit(empresa_id, id))
with check (public.can_admin_company(empresa_id));

drop policy if exists usuarios_unidades_read on public.usuarios_unidades;
create policy usuarios_unidades_read on public.usuarios_unidades
for select to authenticated
using (
  usuario_id = auth.uid()
  or public.can_admin_company(empresa_id)
);

drop policy if exists usuarios_unidades_insert on public.usuarios_unidades;
create policy usuarios_unidades_insert on public.usuarios_unidades
for insert to authenticated
with check (
  public.can_admin_company(empresa_id)
  and public.unit_belongs_to_company(empresa_id, unidade_id)
);

drop policy if exists usuarios_unidades_update on public.usuarios_unidades;
create policy usuarios_unidades_update on public.usuarios_unidades
for update to authenticated
using (public.can_admin_company(empresa_id))
with check (
  public.can_admin_company(empresa_id)
  and public.unit_belongs_to_company(empresa_id, unidade_id)
);

drop policy if exists transferencias_unidades_read on public.transferencias_unidades;
create policy transferencias_unidades_read on public.transferencias_unidades
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (
    public.can_read_unit(empresa_id, unidade_origem_id)
    or public.can_read_unit(empresa_id, unidade_destino_id)
  )
);

-- Substitui somente as policies operacionais por políticas com duas camadas:
-- empresa e unidade. Documentos corporativos permanecem visíveis no tenant.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'anexos',
    'pendencias',
    'tratativas_pendencias',
    'alertas'
  ] loop
    execute format('drop policy if exists %I on public.%I', v_table || '_read', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_insert', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_update', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        public.has_company_access(empresa_id)
        and deleted_at is null
        and (unidade_id is null or public.can_read_unit(empresa_id, unidade_id))
      )',
      v_table || '_read',
      v_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        public.can_write_company(empresa_id)
        and deleted_at is null
        and (unidade_id is null or public.can_write_unit(empresa_id, unidade_id))
      )',
      v_table || '_insert',
      v_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        public.can_write_company(empresa_id)
        and (unidade_id is null or public.can_write_unit(empresa_id, unidade_id))
      ) with check (
        public.can_write_company(empresa_id)
        and (unidade_id is null or public.can_write_unit(empresa_id, unidade_id))
        and (deleted_at is null or public.can_admin_company(empresa_id))
      )',
      v_table || '_update',
      v_table
    );
  end loop;
end
$$;

drop policy if exists interacoes_assistente_read on public.interacoes_assistente;
create policy interacoes_assistente_read on public.interacoes_assistente
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (unidade_id is null or public.can_read_unit(empresa_id, unidade_id))
);

drop policy if exists interacoes_assistente_insert on public.interacoes_assistente;
create policy interacoes_assistente_insert on public.interacoes_assistente
for insert to authenticated
with check (
  usuario_id = auth.uid()
  and public.can_write_company(empresa_id)
  and (unidade_id is null or public.can_read_unit(empresa_id, unidade_id))
);

drop policy if exists logs_read on public.logs_auditoria;
create policy logs_read on public.logs_auditoria
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (unidade_id is null or public.can_read_unit(empresa_id, unidade_id))
  and (public.is_master() or public.plan_feature_enabled(empresa_id, 'auditoria'))
);

drop policy if exists relatorios_agendados_tenant_read on public.relatorios_agendados;
create policy relatorios_agendados_tenant_read on public.relatorios_agendados
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (
    unidade_id is null and public.can_use_consolidated_view(empresa_id)
    or unidade_id is not null and public.can_read_unit(empresa_id, unidade_id)
  )
);

drop policy if exists execucoes_relatorios_tenant_read on public.execucoes_relatorios_agendados;
create policy execucoes_relatorios_tenant_read on public.execucoes_relatorios_agendados
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (
    unidade_id is null and public.can_use_consolidated_view(empresa_id)
    or unidade_id is not null and public.can_read_unit(empresa_id, unidade_id)
  )
);

create or replace function public.can_access_evidence_object(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, auth, pg_temp
as $$
  select exists (
    select 1
    from public.anexos a
    where a.storage_path = p_storage_path
      and a.status <> 'excluido'
      and a.deleted_at is null
      and public.has_company_access(a.empresa_id)
      and (a.unidade_id is null or public.can_read_unit(a.empresa_id, a.unidade_id))
  )
$$;

drop policy if exists evidencias_read on storage.objects;
create policy evidencias_read on storage.objects
for select to authenticated
using (
  bucket_id = 'evidencias'
  and public.can_access_evidence_object(name)
);

-- Uploads autenticados passam exclusivamente pela Edge Function, que usa
-- metadados do registro e service_role. Isso evita autorização baseada só no caminho.
drop policy if exists evidencias_insert on storage.objects;
drop policy if exists evidencias_update on storage.objects;

revoke all on table public.unidades, public.usuarios_unidades, public.transferencias_unidades from anon;
grant select on table public.unidades, public.usuarios_unidades, public.transferencias_unidades to authenticated;
grant all on table public.unidades, public.usuarios_unidades, public.transferencias_unidades to service_role;

-- O backend confiável usa a service_role para provisionamento, webhooks e
-- rotinas administrativas. As tabelas legadas foram criadas antes de os
-- privilégios padrão do Supabase serem normalizados, portanto o papel não
-- herdava acesso a elas em uma instalação limpa.
grant all on table
  public.planos,
  public.empresas,
  public.usuarios,
  public.usuarios_empresas,
  public.assinaturas_empresas,
  public.relacionamentos_parceiro_clientes,
  public.limites_acesso_empresa,
  public.documentos,
  public.equipamentos,
  public.calibracoes,
  public.qualificacoes,
  public.manutencoes,
  public.pendencias
to service_role;

revoke all on function public.resolve_record_unit(uuid, text, uuid) from public, anon;
revoke all on function public.ensure_company_matrix_unit() from public, anon;
revoke all on function public.unit_belongs_to_company(uuid, uuid) from public, anon;
revoke all on function public.has_unit_membership(uuid, uuid) from public, anon;
revoke all on function public.has_unit_access(uuid, uuid) from public, anon;
revoke all on function public.can_read_unit(uuid, uuid) from public, anon;
revoke all on function public.can_write_unit(uuid, uuid) from public, anon;
revoke all on function public.can_admin_unit(uuid, uuid) from public, anon;
revoke all on function public.can_use_consolidated_view(uuid) from public, anon;
revoke all on function public.current_user_unit_ids(uuid) from public, anon;
revoke all on function public.active_company_unit_count(uuid) from public, anon;
revoke all on function public.effective_unit_limit(uuid) from public, anon;
revoke all on function public.can_create_company_unit(uuid) from public, anon;
revoke all on function public.can_access_evidence_object(text) from public, anon;

grant execute on function public.resolve_record_unit(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.ensure_company_matrix_unit() to service_role;
grant execute on function public.unit_belongs_to_company(uuid, uuid) to authenticated, service_role;
grant execute on function public.has_unit_membership(uuid, uuid) to authenticated, service_role;
grant execute on function public.has_unit_access(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_read_unit(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_write_unit(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_admin_unit(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_use_consolidated_view(uuid) to authenticated, service_role;
grant execute on function public.current_user_unit_ids(uuid) to authenticated, service_role;
grant execute on function public.active_company_unit_count(uuid) to authenticated, service_role;
grant execute on function public.effective_unit_limit(uuid) to authenticated, service_role;
grant execute on function public.can_create_company_unit(uuid) to authenticated, service_role;
grant execute on function public.can_access_evidence_object(text) to authenticated, service_role;
