-- Conform Flow — integridade multi-tenant, quotas e índices para escala.

alter table public.equipamentos add constraint uq_equipamentos_id_empresa unique(id,empresa_id);
alter table public.calibracoes add constraint fk_calibracoes_equipamento_empresa
  foreign key(equipamento_id,empresa_id) references public.equipamentos(id,empresa_id);
alter table public.qualificacoes add constraint fk_qualificacoes_equipamento_empresa
  foreign key(equipamento_id,empresa_id) references public.equipamentos(id,empresa_id);
alter table public.manutencoes add constraint fk_manutencoes_equipamento_empresa
  foreign key(equipamento_id,empresa_id) references public.equipamentos(id,empresa_id);

create index if not exists idx_documentos_empresa_status_dates on public.documentos(empresa_id,deleted_at,data_vencimento);
create index if not exists idx_calibracoes_empresa_equipamento on public.calibracoes(empresa_id,equipamento_id,data_calibracao desc) where deleted_at is null;
create index if not exists idx_qualificacoes_empresa_equipamento on public.qualificacoes(empresa_id,equipamento_id,data_qualificacao desc) where deleted_at is null;
create index if not exists idx_manutencoes_empresa_equipamento on public.manutencoes(empresa_id,equipamento_id,data_manutencao desc) where deleted_at is null;
create index if not exists idx_alertas_dispatch on public.alertas(empresa_id,email_status,created_at) where deleted_at is null;
create index if not exists idx_logs_created_brin on public.logs_auditoria using brin(created_at);

create or replace view public.vw_consumo_empresa with (security_invoker=true) as
select e.id empresa_id,e.nome_fantasia,
  (select count(*) from public.documentos d where d.empresa_id=e.id and d.deleted_at is null) documentos,
  (select count(*) from public.equipamentos eq where eq.empresa_id=e.id and eq.deleted_at is null) equipamentos,
  (select coalesce(sum(a.tamanho_bytes),0) from public.anexos a where a.empresa_id=e.id and a.deleted_at is null and a.status='ativo') storage_bytes,
  p.limite_documentos,p.limite_equipamentos,p.limite_storage_mb
from public.empresas e left join public.planos p on p.id=e.plano_id
where e.deleted_at is null;

create or replace function public.validate_plan_record_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare limit_value integer; current_value bigint;
begin
  if tg_table_name='documentos' then
    select p.limite_documentos into limit_value from public.empresas e join public.planos p on p.id=e.plano_id where e.id=new.empresa_id;
    if limit_value is not null then
      select count(*) into current_value from public.documentos where empresa_id=new.empresa_id and deleted_at is null;
    end if;
  elsif tg_table_name='equipamentos' then
    select p.limite_equipamentos into limit_value from public.empresas e join public.planos p on p.id=e.plano_id where e.id=new.empresa_id;
    if limit_value is not null then
      select count(*) into current_value from public.equipamentos where empresa_id=new.empresa_id and deleted_at is null;
    end if;
  end if;
  if limit_value is not null and current_value>=limit_value then
    raise exception 'Limite do plano atingido para %',tg_table_name using errcode='P0001';
  end if;
  return new;
end $$;

create trigger trg_documentos_plan_limit before insert on public.documentos for each row execute function public.validate_plan_record_limit();
create trigger trg_equipamentos_plan_limit before insert on public.equipamentos for each row execute function public.validate_plan_record_limit();

create or replace function public.api_verificar_limite_storage(p_empresa_id uuid,p_novos_bytes bigint)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare used_bytes bigint; max_bytes bigint;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  if p_novos_bytes<=0 then raise exception 'Tamanho inválido'; end if;
  select coalesce(c.storage_bytes,0),case when c.limite_storage_mb is null then null else c.limite_storage_mb::bigint*1024*1024 end
  into used_bytes,max_bytes from public.vw_consumo_empresa c where c.empresa_id=p_empresa_id;
  return jsonb_build_object(
    'permitido',max_bytes is null or used_bytes+p_novos_bytes<=max_bytes,
    'usado_bytes',used_bytes,'limite_bytes',max_bytes,'apos_upload_bytes',used_bytes+p_novos_bytes
  );
end $$;

revoke all on function public.api_verificar_limite_storage(uuid,bigint) from public,anon;
grant execute on function public.api_verificar_limite_storage(uuid,bigint) to authenticated;
grant select on public.vw_consumo_empresa to authenticated;

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Logs de auditoria são imutáveis';
end $$;

create trigger trg_logs_immutable before update or delete on public.logs_auditoria for each row execute function public.prevent_audit_mutation();

