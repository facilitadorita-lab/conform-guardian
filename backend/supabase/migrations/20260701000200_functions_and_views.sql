-- Conform Flow — funções, status dinâmicos e auditoria

create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select u.is_master from public.usuarios u where u.id = auth.uid() and u.status = 'ativo' and u.deleted_at is null), false)
$$;

create or replace function public.has_company_access(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_master() or exists (
    select 1 from public.usuarios_empresas ue
    join public.usuarios u on u.id = ue.usuario_id
    join public.empresas e on e.id = ue.empresa_id
    where ue.usuario_id = auth.uid() and ue.empresa_id = p_empresa_id
      and ue.ativo = true and ue.deleted_at is null
      and u.status = 'ativo' and u.deleted_at is null
      and e.status = 'ativa' and e.deleted_at is null
  )
$$;

create or replace function public.company_role(p_empresa_id uuid)
returns text language sql stable security definer set search_path = public
as $$
  select case when public.is_master() then 'master' else (
    select ue.perfil from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid() and ue.empresa_id = p_empresa_id
      and ue.ativo = true and ue.deleted_at is null limit 1
  ) end
$$;

create or replace function public.can_write_company(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.company_role(p_empresa_id) in ('master','administrador','responsavel_tecnico','colaborador'), false) $$;

create or replace function public.can_admin_company(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.company_role(p_empresa_id) in ('master','administrador'), false) $$;

create or replace function public.status_vencimento(p_data date)
returns text language sql stable
as $$
  select case
    when p_data is null then 'sem_validade'
    when p_data < current_date then 'vencido'
    when p_data = current_date then 'vence_hoje'
    when p_data <= current_date + 7 then 'critico'
    when p_data <= current_date + 30 then 'a_vencer'
    when p_data <= current_date + 60 then 'atencao'
    else 'em_dia'
  end
$$;

create or replace function public.tem_anexo_ativo(p_empresa_id uuid, p_modulo text, p_registro_id uuid, p_finalidade text default null)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.anexos a
    where a.empresa_id = p_empresa_id and a.modulo = p_modulo and a.registro_id = p_registro_id
      and a.status = 'ativo' and a.deleted_at is null
      and (p_finalidade is null or a.finalidade = p_finalidade)
  )
$$;

create or replace view public.vw_documentos_status with (security_invoker = true) as
select d.*,
  case when d.exige_anexo and not public.tem_anexo_ativo(d.empresa_id,'documentos',d.id) then 'pendente_anexo'
       else public.status_vencimento(d.data_vencimento) end as status_calculado
from public.documentos d where d.deleted_at is null;

create or replace view public.vw_calibracoes_status with (security_invoker = true) as
select c.*,
  row_number() over (partition by c.equipamento_id order by c.data_calibracao desc, c.created_at desc) = 1 as vigente,
  case when c.resultado = 'reprovado' then 'reprovado'
       when not public.tem_anexo_ativo(c.empresa_id,'calibracoes',c.id,'certificado') then 'sem_certificado'
       else public.status_vencimento(c.data_vencimento) end as status_calculado
from public.calibracoes c where c.deleted_at is null;

create or replace view public.vw_qualificacoes_status with (security_invoker = true) as
select q.*,
  row_number() over (partition by q.equipamento_id order by q.data_qualificacao desc, q.created_at desc) = 1 as vigente,
  case when q.resultado = 'reprovado' then 'reprovada'
       when not public.tem_anexo_ativo(q.empresa_id,'qualificacoes',q.id,'relatorio') then 'pendente_relatorio'
       else public.status_vencimento(q.data_vencimento) end as status_calculado
from public.qualificacoes q where q.deleted_at is null;

create or replace view public.vw_manutencoes_status with (security_invoker = true) as
select m.*,
  case when m.exige_evidencia and not public.tem_anexo_ativo(m.empresa_id,'manutencoes',m.id) then 'pendente_evidencia'
       else public.status_vencimento(m.proxima_manutencao) end as status_calculado
from public.manutencoes m where m.deleted_at is null;

create or replace view public.vw_equipamentos_conformidade with (security_invoker = true) as
select e.*,
  c.id as calibracao_vigente_id, c.status_calculado as status_calibracao,
  q.id as qualificacao_vigente_id, q.status_calculado as status_qualificacao,
  m.id as manutencao_recente_id, m.status_calculado as status_manutencao,
  case
    when 'reprovado' in (coalesce(c.status_calculado,''),coalesce(q.status_calculado,'')) then 'reprovado'
    when 'vencido' in (coalesce(c.status_calculado,''),coalesce(q.status_calculado,''),coalesce(m.status_calculado,'')) then 'vencido'
    when 'critico' in (coalesce(c.status_calculado,''),coalesce(q.status_calculado,''),coalesce(m.status_calculado,'')) then 'critico'
    when 'a_vencer' in (coalesce(c.status_calculado,''),coalesce(q.status_calculado,''),coalesce(m.status_calculado,'')) then 'a_vencer'
    else 'em_dia'
  end as status_consolidado
from public.equipamentos e
left join public.vw_calibracoes_status c on c.equipamento_id = e.id and c.vigente
left join public.vw_qualificacoes_status q on q.equipamento_id = e.id and q.vigente
left join lateral (
  select vm.* from public.vw_manutencoes_status vm where vm.equipamento_id = e.id
  order by vm.data_manutencao desc, vm.created_at desc limit 1
) m on true
where e.deleted_at is null;

create or replace function public.set_audit_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());
    new.created_at := coalesce(new.created_at, now());
  else
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
  v_id uuid;
begin
  v_empresa_id := case when tg_op = 'DELETE' then old.empresa_id else new.empresa_id end;
  v_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, valor_anterior, novo_valor)
  values (
    v_empresa_id, auth.uid(), tg_table_name,
    case when tg_op = 'INSERT' then 'criacao'
         when tg_op = 'DELETE' then 'exclusao_fisica_bloqueada'
         when old.deleted_at is null and new.deleted_at is not null then 'exclusao_logica'
         else 'edicao' end,
    v_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create or replace function public.registrar_acesso_master(p_empresa_id uuid, p_modulo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_master() then raise exception 'Acesso restrito ao Admin Master'; end if;
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, novo_valor)
  values (p_empresa_id, auth.uid(), p_modulo, 'acesso_admin_master', jsonb_build_object('accessed_at',now()));
end $$;

do $$
declare t text;
begin
  foreach t in array array['categorias_documentos','tipos_documentos','tipos_equipamentos','documentos','equipamentos','calibracoes','qualificacoes','manutencoes','anexos','pendencias','tratativas_pendencias','alertas','configuracoes_empresa'] loop
    execute format('drop trigger if exists trg_%I_audit_fields on public.%I',t,t);
    execute format('create trigger trg_%I_audit_fields before insert or update on public.%I for each row execute function public.set_audit_fields()',t,t);
    execute format('drop trigger if exists trg_%I_audit_log on public.%I',t,t);
    execute format('create trigger trg_%I_audit_log after insert or update or delete on public.%I for each row execute function public.audit_row_change()',t,t);
  end loop;
end $$;

