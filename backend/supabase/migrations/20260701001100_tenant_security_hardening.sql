-- Conform Flow — hardening de segurança multiempresa.
-- CNPJ é identificador cadastral. O isolamento real usa empresa_id + auth.uid() + RLS.

create or replace function public.normalize_cnpj(p_cnpj text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g')
$$;

alter table public.empresas
  add column if not exists cnpj_normalizado text;

update public.empresas
set cnpj_normalizado = public.normalize_cnpj(cnpj)
where cnpj_normalizado is null
   or cnpj_normalizado <> public.normalize_cnpj(cnpj);

alter table public.empresas
  alter column cnpj_normalizado set not null;

alter table public.empresas
  drop constraint if exists empresas_cnpj_normalizado_len;

alter table public.empresas
  add constraint empresas_cnpj_normalizado_len
  check (cnpj_normalizado ~ '^[0-9]{14}$');

create unique index if not exists uq_empresas_cnpj_normalizado_ativo
  on public.empresas(cnpj_normalizado)
  where deleted_at is null;

alter table public.pendencias
  drop constraint if exists pendencias_modulo_allowed;

alter table public.pendencias
  add constraint pendencias_modulo_allowed
  check (modulo in ('documentos','equipamentos','calibracoes','qualificacoes','manutencoes'));

alter table public.alertas
  drop constraint if exists alertas_modulo_allowed;

alter table public.alertas
  add constraint alertas_modulo_allowed
  check (modulo in ('documentos','equipamentos','calibracoes','qualificacoes','manutencoes','pendencias'));

create or replace function public.set_empresa_cnpj_normalizado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cnpj_normalizado := public.normalize_cnpj(new.cnpj);
  if new.cnpj_normalizado !~ '^[0-9]{14}$' then
    raise exception 'CNPJ inválido. Informe 14 dígitos.';
  end if;
  return new;
end $$;

drop trigger if exists trg_empresas_cnpj_normalizado on public.empresas;
create trigger trg_empresas_cnpj_normalizado
before insert or update of cnpj on public.empresas
for each row execute function public.set_empresa_cnpj_normalizado();

create index if not exists idx_usuarios_empresas_usuario_ativo
  on public.usuarios_empresas(usuario_id, empresa_id)
  where ativo and deleted_at is null;

create index if not exists idx_usuarios_empresas_empresa_ativo
  on public.usuarios_empresas(empresa_id, usuario_id)
  where ativo and deleted_at is null;

create or replace function public.user_belongs_to_company(p_usuario_id uuid, p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_usuario_id is null or exists (
    select 1
    from public.usuarios_empresas ue
    join public.usuarios u on u.id = ue.usuario_id
    where ue.usuario_id = p_usuario_id
      and ue.empresa_id = p_empresa_id
      and ue.ativo
      and ue.deleted_at is null
      and u.status = 'ativo'
      and u.deleted_at is null
  )
$$;

create or replace function public.assert_user_in_company(
  p_usuario_id uuid,
  p_empresa_id uuid,
  p_field text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_usuario_id is not null and not public.user_belongs_to_company(p_usuario_id, p_empresa_id) then
    raise exception 'Usuário informado no campo % não pertence à empresa do registro.', p_field
      using errcode = '42501';
  end if;
end $$;

create or replace function public.record_exists_in_company(
  p_table_name text,
  p_record_id uuid,
  p_empresa_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed_tables constant text[] := array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'pendencias'
  ];
  exists_record boolean;
begin
  if p_table_name <> all(allowed_tables) then
    raise exception 'Módulo inválido para validação de tenant: %', p_table_name;
  end if;

  execute format(
    'select exists(select 1 from public.%I where id = $1 and empresa_id = $2 and deleted_at is null)',
    p_table_name
  )
  using p_record_id, p_empresa_id
  into exists_record;

  return coalesce(exists_record, false);
end $$;

create or replace function public.validate_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_prefix text;
begin
  if tg_table_name = 'documentos' then
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'equipamentos' then
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'calibracoes' then
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'qualificacoes' then
    perform public.assert_user_in_company(new.responsavel_tecnico_id, new.empresa_id, 'responsavel_tecnico_id');

  elsif tg_table_name = 'manutencoes' then
    perform public.assert_user_in_company(new.responsavel_interno_id, new.empresa_id, 'responsavel_interno_id');

  elsif tg_table_name = 'pendencias' then
    if not public.record_exists_in_company(new.modulo, new.registro_id, new.empresa_id) then
      raise exception 'Pendência aponta para registro inexistente ou de outra empresa.' using errcode = '42501';
    end if;
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'tratativas_pendencias' then
    if not exists (
      select 1 from public.pendencias p
      where p.id = new.pendencia_id
        and p.empresa_id = new.empresa_id
        and p.deleted_at is null
    ) then
      raise exception 'Pendência não pertence à empresa informada.' using errcode = '42501';
    end if;
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'alertas' then
    if not public.record_exists_in_company(new.modulo, new.registro_id, new.empresa_id) then
      raise exception 'Alerta aponta para registro inexistente ou de outra empresa.' using errcode = '42501';
    end if;
    perform public.assert_user_in_company(new.usuario_id, new.empresa_id, 'usuario_id');

  elsif tg_table_name = 'anexos' then
    if not public.record_exists_in_company(new.modulo, new.registro_id, new.empresa_id) then
      raise exception 'Anexo aponta para registro inexistente ou de outra empresa.' using errcode = '42501';
    end if;

    expected_prefix := new.empresa_id::text || '/' || new.modulo || '/' || new.registro_id::text || '/';
    if new.storage_path is null or new.storage_path not like expected_prefix || '%' then
      raise exception 'Caminho do arquivo não corresponde à empresa/módulo/registro do anexo.' using errcode = '42501';
    end if;

    if new.substitui_anexo_id is not null and not exists (
      select 1
      from public.anexos previous
      where previous.id = new.substitui_anexo_id
        and previous.empresa_id = new.empresa_id
        and previous.modulo = new.modulo
        and previous.registro_id = new.registro_id
        and previous.deleted_at is null
    ) then
      raise exception 'Anexo substituído não pertence ao mesmo registro da empresa.' using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
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
    execute format('drop trigger if exists trg_%I_tenant_integrity on public.%I', t, t);
    execute format(
      'create trigger trg_%I_tenant_integrity before insert or update on public.%I for each row execute function public.validate_tenant_integrity()',
      t,
      t
    );
  end loop;
end $$;

create or replace function public.api_empresa_atual(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  company public.empresas;
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select * into company
  from public.empresas
  where id = p_empresa_id
    and deleted_at is null;

  if company.id is null then
    raise exception 'Empresa não encontrada';
  end if;

  return jsonb_build_object(
    'id', company.id,
    'razao_social', company.razao_social,
    'nome_fantasia', company.nome_fantasia,
    'cnpj', company.cnpj,
    'status', company.status,
    'perfil', public.company_role(company.id)
  );
end $$;

revoke all on function public.api_empresa_atual(uuid) from public, anon;
grant execute on function public.api_empresa_atual(uuid) to authenticated;
