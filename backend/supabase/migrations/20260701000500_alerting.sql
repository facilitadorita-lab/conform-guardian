-- Conform Flow — fila idempotente de alertas
create or replace view public.vw_itens_vencimento with (security_invoker = true) as
select d.empresa_id, 'documentos'::text modulo, d.id registro_id, d.nome titulo,
       d.data_vencimento, d.responsavel_id
from public.documentos d where d.deleted_at is null and d.data_vencimento is not null
union all
select c.empresa_id, 'calibracoes', c.id, 'Calibração — ' || e.nome,
       c.data_vencimento, c.responsavel_id
from public.calibracoes c join public.equipamentos e on e.id = c.equipamento_id
where c.deleted_at is null and e.deleted_at is null and c.data_vencimento is not null
union all
select q.empresa_id, 'qualificacoes', q.id, 'Qualificação — ' || e.nome,
       q.data_vencimento, q.responsavel_tecnico_id
from public.qualificacoes q join public.equipamentos e on e.id = q.equipamento_id
where q.deleted_at is null and e.deleted_at is null and q.data_vencimento is not null
union all
select m.empresa_id, 'manutencoes', m.id,
       'Manutenção — ' || coalesce(e.nome,m.nome_servico), m.proxima_manutencao, m.responsavel_interno_id
from public.manutencoes m left join public.equipamentos e on e.id = m.equipamento_id
where m.deleted_at is null and m.proxima_manutencao is not null;

create or replace function public.gerar_alertas_vencimento()
returns integer language plpgsql security definer set search_path = public as $$
declare inserted_count integer;
begin
  with items as (
    select i.*, cfg.dias_alerta
    from public.vw_itens_vencimento i
    join public.empresas e on e.id = i.empresa_id and e.status = 'ativa' and e.deleted_at is null
    left join public.configuracoes_empresa cfg on cfg.empresa_id = i.empresa_id and cfg.deleted_at is null
  ), due as (
    select i.*, marco
    from items i
    cross join lateral unnest(coalesce(i.dias_alerta,array[60,30,15,7,0])) marco
    where i.data_vencimento = current_date + marco
    union all
    select i.*, -1 from items i where i.data_vencimento < current_date
  ), recipients as (
    select d.*, coalesce(d.responsavel_id, admin.usuario_id) usuario_destino
    from due d
    left join lateral (
      select ue.usuario_id from public.usuarios_empresas ue
      join public.usuarios u on u.id = ue.usuario_id and u.status = 'ativo' and u.deleted_at is null
      where ue.empresa_id = d.empresa_id and ue.perfil = 'administrador'
        and ue.ativo and ue.deleted_at is null order by ue.created_at limit 1
    ) admin on d.responsavel_id is null
  )
  insert into public.alertas(
    empresa_id, usuario_id, modulo, registro_id, marco_dias, titulo, mensagem,
    data_vencimento, email_status
  )
  select r.empresa_id, r.usuario_destino, r.modulo, r.registro_id, r.marco,
    r.titulo,
    case when r.marco = -1 then r.titulo || ' está vencido desde ' || to_char(r.data_vencimento,'DD/MM/YYYY')
         when r.marco = 0 then r.titulo || ' vence hoje'
         else r.titulo || ' vence em ' || r.marco || ' dias' end,
    r.data_vencimento,
    case when coalesce(cfg.enviar_email,true) and r.usuario_destino is not null then 'pendente' else 'dispensado' end
  from recipients r
  left join public.configuracoes_empresa cfg on cfg.empresa_id = r.empresa_id
  where r.usuario_destino is not null
  on conflict (empresa_id, usuario_id, modulo, registro_id, marco_dias) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end $$;

revoke all on function public.gerar_alertas_vencimento() from public, anon, authenticated;
grant execute on function public.gerar_alertas_vencimento() to service_role;

create or replace function public.registrar_evento_anexo(
  p_anexo_id uuid, p_acao text, p_ip inet default null, p_user_agent text default null
) returns void language plpgsql security definer set search_path = public as $$
declare a public.anexos;
begin
  if p_acao not in ('visualizacao_anexo','download_anexo') then raise exception 'Ação inválida'; end if;
  select * into a from public.anexos where id = p_anexo_id and deleted_at is null;
  if a.id is null or not public.has_company_access(a.empresa_id) then raise exception 'Acesso negado'; end if;
  insert into public.logs_auditoria(empresa_id,usuario_id,modulo,acao,registro_id,ip,user_agent)
  values(a.empresa_id,auth.uid(),a.modulo,p_acao,a.registro_id,p_ip,p_user_agent);
end $$;

