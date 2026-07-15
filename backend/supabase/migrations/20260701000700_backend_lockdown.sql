-- Conform Flow — impede que o Lovable contorne a API de negócio.

create or replace function public.api_marcar_alerta_lido(p_alerta_id uuid,p_lido boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.alertas set status=case when p_lido then 'lido' else 'nao_lido' end,updated_at=now(),updated_by=auth.uid()
  where id=p_alerta_id and usuario_id=auth.uid() and deleted_at is null;
  if not found then raise exception 'Alerta não encontrado'; end if;
end $$;

create or replace function public.api_salvar_configuracoes(p_empresa_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare saved public.configuracoes_empresa;
begin
  if not public.can_admin_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  insert into public.configuracoes_empresa(empresa_id,dias_alerta,enviar_email,email_remetente_nome,timezone)
  values(
    p_empresa_id,
    coalesce(array(select jsonb_array_elements_text(p_payload->'dias_alerta')::integer),array[60,30,15,7,0]),
    coalesce((p_payload->>'enviar_email')::boolean,true),
    coalesce(nullif(p_payload->>'email_remetente_nome',''),'Conform Flow'),
    coalesce(nullif(p_payload->>'timezone',''),'America/Sao_Paulo')
  )
  on conflict(empresa_id) do update set
    dias_alerta=excluded.dias_alerta,enviar_email=excluded.enviar_email,
    email_remetente_nome=excluded.email_remetente_nome,timezone=excluded.timezone,
    updated_at=now(),updated_by=auth.uid(),deleted_at=null
  returning * into saved;
  return to_jsonb(saved);
end $$;

revoke all on function public.api_marcar_alerta_lido(uuid,boolean) from public,anon;
revoke all on function public.api_salvar_configuracoes(uuid,jsonb) from public,anon;
grant execute on function public.api_marcar_alerta_lido(uuid,boolean) to authenticated;
grant execute on function public.api_salvar_configuracoes(uuid,jsonb) to authenticated;

-- Leitura é feita com RLS. Toda escrita passa por RPC ou Edge Function.
revoke insert,update,delete,truncate on public.empresas from authenticated,anon;
revoke insert,update,delete,truncate on public.usuarios from authenticated,anon;
revoke insert,update,delete,truncate on public.usuarios_empresas from authenticated,anon;
revoke insert,update,delete,truncate on public.categorias_documentos from authenticated,anon;
revoke insert,update,delete,truncate on public.tipos_documentos from authenticated,anon;
revoke insert,update,delete,truncate on public.tipos_equipamentos from authenticated,anon;
revoke insert,update,delete,truncate on public.documentos from authenticated,anon;
revoke insert,update,delete,truncate on public.equipamentos from authenticated,anon;
revoke insert,update,delete,truncate on public.calibracoes from authenticated,anon;
revoke insert,update,delete,truncate on public.qualificacoes from authenticated,anon;
revoke insert,update,delete,truncate on public.manutencoes from authenticated,anon;
revoke insert,update,delete,truncate on public.anexos from authenticated,anon;
revoke insert,update,delete,truncate on public.pendencias from authenticated,anon;
revoke insert,update,delete,truncate on public.tratativas_pendencias from authenticated,anon;
revoke insert,update,delete,truncate on public.alertas from authenticated,anon;
revoke insert,update,delete,truncate on public.configuracoes_empresa from authenticated,anon;
revoke insert,update,delete,truncate on public.logs_auditoria from authenticated,anon;

grant select on public.planos,public.empresas,public.usuarios,public.usuarios_empresas to authenticated;
grant select on public.categorias_documentos,public.tipos_documentos,public.tipos_equipamentos to authenticated;
grant select on public.documentos,public.equipamentos,public.calibracoes,public.qualificacoes,public.manutencoes to authenticated;
grant select on public.anexos,public.pendencias,public.tratativas_pendencias,public.alertas,public.configuracoes_empresa,public.logs_auditoria to authenticated;
grant select on public.vw_documentos_status,public.vw_calibracoes_status,public.vw_qualificacoes_status,public.vw_manutencoes_status,public.vw_equipamentos_conformidade to authenticated;

