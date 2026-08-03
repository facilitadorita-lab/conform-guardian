-- Corrige o validador legado sem alterar os contratos das tabelas.
-- Cada campo de NEW é acessado somente no contexto da tabela que o possui.
create or replace function public.validate_company_relationships()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  linked_empresa uuid;
begin
  if tg_table_name = 'calibracoes' then
    select empresa_id into linked_empresa
    from public.equipamentos
    where id = new.equipamento_id and deleted_at is null;

    if linked_empresa is null or linked_empresa <> new.empresa_id then
      raise exception 'Equipamento não pertence à empresa informada';
    end if;
  elsif tg_table_name = 'qualificacoes' then
    select empresa_id into linked_empresa
    from public.equipamentos
    where id = new.equipamento_id and deleted_at is null;

    if linked_empresa is null or linked_empresa <> new.empresa_id then
      raise exception 'Equipamento não pertence à empresa informada';
    end if;
  elsif tg_table_name = 'manutencoes' then
    if new.equipamento_id is not null then
      select empresa_id into linked_empresa
      from public.equipamentos
      where id = new.equipamento_id and deleted_at is null;

      if linked_empresa is null or linked_empresa <> new.empresa_id then
        raise exception 'Equipamento não pertence à empresa informada';
      end if;
    end if;
  elsif tg_table_name = 'documentos' then
    if new.categoria_id is not null then
      select empresa_id into linked_empresa
      from public.categorias_documentos
      where id = new.categoria_id and deleted_at is null;

      if linked_empresa is not null and linked_empresa <> new.empresa_id then
        raise exception 'Categoria não pertence à empresa informada';
      end if;
    end if;

    if new.tipo_documento_id is not null then
      select empresa_id into linked_empresa
      from public.tipos_documentos
      where id = new.tipo_documento_id and deleted_at is null;

      if linked_empresa is not null and linked_empresa <> new.empresa_id then
        raise exception 'Tipo de documento não pertence à empresa informada';
      end if;
    end if;
  elsif tg_table_name = 'equipamentos' then
    if new.tipo_equipamento_id is not null then
      select empresa_id into linked_empresa
      from public.tipos_equipamentos
      where id = new.tipo_equipamento_id and deleted_at is null;

      if linked_empresa is not null and linked_empresa <> new.empresa_id then
        raise exception 'Tipo de equipamento não pertence à empresa informada';
      end if;
    end if;
  end if;

  return new;
end
$$;
