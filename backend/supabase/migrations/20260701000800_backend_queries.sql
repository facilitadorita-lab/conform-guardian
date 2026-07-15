-- Conform Flow — consultas paginadas; filtros e contagens permanecem no backend.

create or replace function public.api_listar_documentos(
  p_empresa_id uuid,p_busca text default null,p_status text default null,p_limite integer default 25,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  p_limite:=least(greatest(p_limite,1),100); p_offset:=greatest(p_offset,0);
  with filtered as (
    select d.* from public.vw_documentos_status d where d.empresa_id=p_empresa_id
      and (p_busca is null or d.nome ilike '%'||p_busca||'%' or coalesce(d.numero_documento,'') ilike '%'||p_busca||'%')
      and (p_status is null or d.status_calculado=p_status)
  ), page as (select * from filtered order by data_vencimento nulls last,nome limit p_limite offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'limit',p_limite,'offset',p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_equipamentos(
  p_empresa_id uuid,p_busca text default null,p_status text default null,p_limite integer default 25,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  p_limite:=least(greatest(p_limite,1),100); p_offset:=greatest(p_offset,0);
  with filtered as (
    select e.* from public.vw_equipamentos_conformidade e where e.empresa_id=p_empresa_id
      and (p_busca is null or e.nome ilike '%'||p_busca||'%' or coalesce(e.codigo_interno,'') ilike '%'||p_busca||'%' or coalesce(e.numero_serie,'') ilike '%'||p_busca||'%')
      and (p_status is null or e.status_consolidado=p_status)
  ), page as (select * from filtered order by nome limit p_limite offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'limit',p_limite,'offset',p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_manutencoes(
  p_empresa_id uuid,p_busca text default null,p_status text default null,p_natureza text default null,
  p_equipamento_id uuid default null,p_limite integer default 25,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  p_limite:=least(greatest(p_limite,1),100); p_offset:=greatest(p_offset,0);
  with filtered as (
    select m.*,e.nome equipamento_nome,coalesce(e.nome,m.nome_servico) item_nome
    from public.vw_manutencoes_status m left join public.equipamentos e on e.id=m.equipamento_id
    where m.empresa_id=p_empresa_id
      and (p_busca is null or coalesce(e.nome,m.nome_servico,'') ilike '%'||p_busca||'%' or coalesce(m.numero_ordem_servico,'') ilike '%'||p_busca||'%')
      and (p_status is null or m.status_calculado=p_status)
      and (p_natureza is null or m.natureza=p_natureza)
      and (p_equipamento_id is null or m.equipamento_id=p_equipamento_id)
  ), page as (select * from filtered order by proxima_manutencao nulls last limit p_limite offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'limit',p_limite,'offset',p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_pendencias(
  p_empresa_id uuid,p_status text default null,p_responsavel_id uuid default null,p_limite integer default 25,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  p_limite:=least(greatest(p_limite,1),100); p_offset:=greatest(p_offset,0);
  with filtered as (
    select p.*,u.nome responsavel_nome,(current_date-p.prazo) dias_atraso
    from public.pendencias p left join public.usuarios u on u.id=p.responsavel_id
    where p.empresa_id=p_empresa_id and p.deleted_at is null
      and (p_status is null or p.status=p_status) and (p_responsavel_id is null or p.responsavel_id=p_responsavel_id)
  ), page as (select * from filtered order by prazo nulls last limit p_limite offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'limit',p_limite,'offset',p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_alertas(p_empresa_id uuid,p_somente_nao_lidos boolean default false,p_limite integer default 50)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc),'[]'::jsonb) into result from (
    select id,modulo,registro_id,titulo,mensagem,data_vencimento,status,created_at
    from public.alertas where empresa_id=p_empresa_id and usuario_id=auth.uid() and deleted_at is null
      and (not p_somente_nao_lidos or status='nao_lido') order by created_at desc limit least(greatest(p_limite,1),100)
  ) a;
  return result;
end $$;

revoke all on function public.api_listar_documentos(uuid,text,text,integer,integer) from public,anon;
revoke all on function public.api_listar_equipamentos(uuid,text,text,integer,integer) from public,anon;
revoke all on function public.api_listar_manutencoes(uuid,text,text,text,uuid,integer,integer) from public,anon;
revoke all on function public.api_listar_pendencias(uuid,text,uuid,integer,integer) from public,anon;
revoke all on function public.api_listar_alertas(uuid,boolean,integer) from public,anon;
grant execute on function public.api_listar_documentos(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.api_listar_equipamentos(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.api_listar_manutencoes(uuid,text,text,text,uuid,integer,integer) to authenticated;
grant execute on function public.api_listar_pendencias(uuid,text,uuid,integer,integer) to authenticated;
grant execute on function public.api_listar_alertas(uuid,boolean,integer) to authenticated;
