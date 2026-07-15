-- Conform Flow — RLS multiempresa e storage privado

alter table public.planos enable row level security;
alter table public.empresas enable row level security;
alter table public.usuarios enable row level security;
alter table public.usuarios_empresas enable row level security;
alter table public.logs_auditoria enable row level security;

create policy planos_read on public.planos for select to authenticated using (ativo or public.is_master());
create policy planos_master_write on public.planos for all to authenticated using (public.is_master()) with check (public.is_master());

create policy empresas_read on public.empresas for select to authenticated using (public.has_company_access(id));
create policy empresas_master_insert on public.empresas for insert to authenticated with check (public.is_master());
create policy empresas_update on public.empresas for update to authenticated using (public.can_admin_company(id)) with check (public.can_admin_company(id));

create policy usuarios_read on public.usuarios for select to authenticated using (
  id = auth.uid() or public.is_master() or exists (
    select 1 from public.usuarios_empresas mine
    join public.usuarios_empresas theirs on theirs.empresa_id = mine.empresa_id
    where mine.usuario_id = auth.uid() and theirs.usuario_id = usuarios.id
      and mine.ativo and theirs.ativo and mine.deleted_at is null and theirs.deleted_at is null
  )
);
create policy usuarios_self_update on public.usuarios for update to authenticated using (id = auth.uid() or public.is_master()) with check (id = auth.uid() or public.is_master());
create policy usuarios_master_insert on public.usuarios for insert to authenticated with check (public.is_master() or id = auth.uid());

create policy usuarios_empresas_read on public.usuarios_empresas for select to authenticated using (
  usuario_id = auth.uid() or public.has_company_access(empresa_id)
);
create policy usuarios_empresas_insert on public.usuarios_empresas for insert to authenticated with check (public.can_admin_company(empresa_id));
create policy usuarios_empresas_update on public.usuarios_empresas for update to authenticated using (public.can_admin_company(empresa_id)) with check (public.can_admin_company(empresa_id));

create policy logs_read on public.logs_auditoria for select to authenticated using (public.has_company_access(empresa_id));

do $$
declare t text;
begin
  foreach t in array array['documentos','equipamentos','calibracoes','qualificacoes','manutencoes','anexos','pendencias','tratativas_pendencias','alertas','configuracoes_empresa'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_company_access(empresa_id) and deleted_at is null)',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_write_company(empresa_id) and deleted_at is null)',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_write_company(empresa_id)) with check (public.can_write_company(empresa_id) and (deleted_at is null or public.can_admin_company(empresa_id)))',t||'_update',t);
  end loop;

  foreach t in array array['categorias_documentos','tipos_documentos','tipos_equipamentos'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy %I on public.%I for select to authenticated using ((empresa_id is null and padrao_plataforma) or public.has_company_access(empresa_id))',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((empresa_id is null and public.is_master()) or public.can_admin_company(empresa_id))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using ((empresa_id is null and public.is_master()) or public.can_admin_company(empresa_id)) with check ((empresa_id is null and public.is_master()) or public.can_admin_company(empresa_id))',t||'_update',t);
  end loop;
end $$;

-- Valida que registros filhos e catálogos pertencem ao mesmo tenant.
create or replace function public.validate_company_relationships()
returns trigger language plpgsql set search_path = public as $$
declare linked_empresa uuid;
begin
  if tg_table_name in ('calibracoes','qualificacoes') or (tg_table_name = 'manutencoes' and new.equipamento_id is not null) then
    select empresa_id into linked_empresa from public.equipamentos where id = new.equipamento_id and deleted_at is null;
    if linked_empresa is null or linked_empresa <> new.empresa_id then raise exception 'Equipamento não pertence à empresa informada'; end if;
  end if;
  if tg_table_name = 'documentos' and new.categoria_id is not null then
    select empresa_id into linked_empresa from public.categorias_documentos where id = new.categoria_id and deleted_at is null;
    if linked_empresa is not null and linked_empresa <> new.empresa_id then raise exception 'Categoria não pertence à empresa informada'; end if;
  end if;
  if tg_table_name = 'documentos' and new.tipo_documento_id is not null then
    select empresa_id into linked_empresa from public.tipos_documentos where id = new.tipo_documento_id and deleted_at is null;
    if linked_empresa is not null and linked_empresa <> new.empresa_id then raise exception 'Tipo de documento não pertence à empresa informada'; end if;
  end if;
  if tg_table_name = 'equipamentos' and new.tipo_equipamento_id is not null then
    select empresa_id into linked_empresa from public.tipos_equipamentos where id = new.tipo_equipamento_id and deleted_at is null;
    if linked_empresa is not null and linked_empresa <> new.empresa_id then raise exception 'Tipo de equipamento não pertence à empresa informada'; end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_calibracoes_company on public.calibracoes;
create trigger trg_calibracoes_company before insert or update on public.calibracoes for each row execute function public.validate_company_relationships();
drop trigger if exists trg_qualificacoes_company on public.qualificacoes;
create trigger trg_qualificacoes_company before insert or update on public.qualificacoes for each row execute function public.validate_company_relationships();
drop trigger if exists trg_manutencoes_company on public.manutencoes;
create trigger trg_manutencoes_company before insert or update on public.manutencoes for each row execute function public.validate_company_relationships();
drop trigger if exists trg_documentos_company on public.documentos;
create trigger trg_documentos_company before insert or update on public.documentos for each row execute function public.validate_company_relationships();
drop trigger if exists trg_equipamentos_company on public.equipamentos;
create trigger trg_equipamentos_company before insert or update on public.equipamentos for each row execute function public.validate_company_relationships();

-- Bucket privado. Execute após habilitar Storage no projeto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias','evidencias',false,20971520,array[
  'application/pdf','image/jpeg','image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]) on conflict (id) do update set public = false;

create policy evidencias_read on storage.objects for select to authenticated using (
  bucket_id = 'evidencias'
  and public.has_company_access(((storage.foldername(name))[1])::uuid)
);
create policy evidencias_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'evidencias'
  and public.can_write_company(((storage.foldername(name))[1])::uuid)
);
create policy evidencias_update on storage.objects for update to authenticated using (
  bucket_id = 'evidencias'
  and public.can_write_company(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'evidencias'
  and public.can_write_company(((storage.foldername(name))[1])::uuid)
);

