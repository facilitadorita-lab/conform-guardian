-- Conform Flow — API transacional consumida pelo Lovable
-- O frontend não deve escrever diretamente nas tabelas operacionais.

create or replace function public.api_contexto_usuario()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida' using errcode = '28000'; end if;
  select jsonb_build_object(
    'usuario', jsonb_build_object('id',u.id,'nome',u.nome,'email',u.email,'cargo',u.cargo,'is_master',u.is_master,'status',u.status),
    'empresas', coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'nome_fantasia',e.nome_fantasia,'razao_social',e.razao_social,'cnpj',e.cnpj,'status',e.status,'perfil',case when u.is_master then 'master' else ue.perfil end
    ) order by e.nome_fantasia) filter (where e.id is not null),'[]'::jsonb)
  ) into result
  from public.usuarios u
  left join public.empresas e on e.deleted_at is null and (u.is_master or exists(
    select 1 from public.usuarios_empresas allowed where allowed.usuario_id=u.id and allowed.empresa_id=e.id and allowed.ativo and allowed.deleted_at is null
  ))
  left join public.usuarios_empresas ue on ue.usuario_id=u.id and ue.empresa_id=e.id and ue.ativo and ue.deleted_at is null
  where u.id=auth.uid() and u.deleted_at is null
  group by u.id;
  if result is null then raise exception 'Perfil não encontrado'; end if;
  return result;
end $$;

create or replace function public.api_dashboard(p_empresa_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  select jsonb_build_object(
    'documentos', jsonb_build_object(
      'total',count(*),
      'em_dia',count(*) filter(where status_calculado='em_dia'),
      'vencidos',count(*) filter(where status_calculado='vencido'),
      'criticos',count(*) filter(where status_calculado in ('vence_hoje','critico')),
      'a_vencer_30',count(*) filter(where status_calculado in ('vence_hoje','critico','a_vencer')),
      'pendentes_anexo',count(*) filter(where status_calculado='pendente_anexo')
    ),
    'equipamentos',(select jsonb_build_object(
      'total',count(*),'conformes',count(*) filter(where status_consolidado='em_dia'),
      'atencao',count(*) filter(where status_consolidado<>'em_dia')
    ) from public.vw_equipamentos_conformidade where empresa_id=p_empresa_id),
    'manutencoes',(select jsonb_build_object(
      'vencidas',count(*) filter(where status_calculado='vencido'),
      'a_vencer',count(*) filter(where status_calculado in ('vence_hoje','critico','a_vencer'))
    ) from public.vw_manutencoes_status where empresa_id=p_empresa_id),
    'pendencias',(select jsonb_build_object(
      'abertas',count(*) filter(where status in ('pendente','em_andamento')),
      'sem_responsavel',count(*) filter(where responsavel_id is null and status in ('pendente','em_andamento'))
    ) from public.pendencias where empresa_id=p_empresa_id and deleted_at is null),
    'conformidade_percentual',case when count(*)=0 then 100 else round(100.0*count(*) filter(where status_calculado in ('em_dia','sem_validade'))/count(*),1) end,
    'pendencias_criticas',(select coalesce(jsonb_agg(x order by x->>'prazo'),'[]'::jsonb) from (
      select jsonb_build_object('id',p.id,'modulo',p.modulo,'registro_id',p.registro_id,'titulo',p.titulo,'prazo',p.prazo,'status',p.status,'responsavel_id',p.responsavel_id) x
      from public.pendencias p where p.empresa_id=p_empresa_id and p.deleted_at is null and p.status in ('pendente','em_andamento')
      order by p.prazo nulls last limit 8
    ) critical)
  ) into result
  from public.vw_documentos_status where empresa_id=p_empresa_id;
  return result;
end $$;

create or replace function public.api_equipamento_detalhe(p_empresa_id uuid,p_equipamento_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if not exists(select 1 from public.equipamentos where id=p_equipamento_id and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'Equipamento não encontrado'; end if;
  select jsonb_build_object(
    'equipamento',to_jsonb(e),
    'calibracoes',(select coalesce(jsonb_agg(to_jsonb(c) order by c.data_calibracao desc),'[]'::jsonb) from public.vw_calibracoes_status c where c.empresa_id=p_empresa_id and c.equipamento_id=p_equipamento_id),
    'qualificacoes',(select coalesce(jsonb_agg(to_jsonb(q) order by q.data_qualificacao desc),'[]'::jsonb) from public.vw_qualificacoes_status q where q.empresa_id=p_empresa_id and q.equipamento_id=p_equipamento_id),
    'manutencoes',(select coalesce(jsonb_agg(to_jsonb(m) order by m.data_manutencao desc),'[]'::jsonb) from public.vw_manutencoes_status m where m.empresa_id=p_empresa_id and m.equipamento_id=p_equipamento_id),
    'anexos',(select coalesce(jsonb_agg(to_jsonb(a)-'storage_path' order by a.created_at desc),'[]'::jsonb) from public.anexos a where a.empresa_id=p_empresa_id and a.deleted_at is null and (
      (a.modulo='equipamentos' and a.registro_id=p_equipamento_id) or
      (a.modulo='calibracoes' and a.registro_id in(select id from public.calibracoes where equipamento_id=p_equipamento_id)) or
      (a.modulo='qualificacoes' and a.registro_id in(select id from public.qualificacoes where equipamento_id=p_equipamento_id)) or
      (a.modulo='manutencoes' and a.registro_id in(select id from public.manutencoes where equipamento_id=p_equipamento_id))
    )),
    'historico',(select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc),'[]'::jsonb) from (
      select * from public.logs_auditoria where empresa_id=p_empresa_id and (
        (modulo='equipamentos' and registro_id=p_equipamento_id) or
        (modulo='calibracoes' and registro_id in(select id from public.calibracoes where equipamento_id=p_equipamento_id)) or
        (modulo='qualificacoes' and registro_id in(select id from public.qualificacoes where equipamento_id=p_equipamento_id)) or
        (modulo='manutencoes' and registro_id in(select id from public.manutencoes where equipamento_id=p_equipamento_id))
      ) order by created_at desc limit 100
    ) l)
  ) into result from public.vw_equipamentos_conformidade e
  where e.id=p_equipamento_id and e.empresa_id=p_empresa_id;
  return result;
end $$;

create or replace function public.api_criar_documento(p_empresa_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row_created public.documentos;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  if nullif(trim(p_payload->>'nome'),'') is null then raise exception 'Nome é obrigatório'; end if;
  insert into public.documentos(empresa_id,nome,categoria_id,tipo_documento_id,numero_documento,orgao_emissor,responsavel_id,data_emissao,data_vencimento,periodicidade_meses,alerta_antecedencia_dias,exige_anexo,setor_unidade,observacoes)
  values(p_empresa_id,trim(p_payload->>'nome'),nullif(p_payload->>'categoria_id','')::uuid,nullif(p_payload->>'tipo_documento_id','')::uuid,nullif(p_payload->>'numero_documento',''),nullif(p_payload->>'orgao_emissor',''),nullif(p_payload->>'responsavel_id','')::uuid,nullif(p_payload->>'data_emissao','')::date,nullif(p_payload->>'data_vencimento','')::date,nullif(p_payload->>'periodicidade_meses','')::integer,coalesce(array(select jsonb_array_elements_text(p_payload->'dias_alerta')::integer),array[60,30,15,7,0]),coalesce((p_payload->>'exige_anexo')::boolean,true),nullif(p_payload->>'setor_unidade',''),nullif(p_payload->>'observacoes','')) returning * into row_created;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_criar_equipamento(p_empresa_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row_created public.equipamentos;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  if nullif(trim(p_payload->>'nome'),'') is null then raise exception 'Nome é obrigatório'; end if;
  insert into public.equipamentos(empresa_id,nome,tipo_equipamento_id,codigo_interno,numero_serie,fabricante,modelo,setor,localizacao,criticidade,status,responsavel_id,observacoes)
  values(p_empresa_id,trim(p_payload->>'nome'),nullif(p_payload->>'tipo_equipamento_id','')::uuid,nullif(p_payload->>'codigo_interno',''),nullif(p_payload->>'numero_serie',''),nullif(p_payload->>'fabricante',''),nullif(p_payload->>'modelo',''),nullif(p_payload->>'setor',''),nullif(p_payload->>'localizacao',''),coalesce(nullif(p_payload->>'criticidade',''),'media'),coalesce(nullif(p_payload->>'status',''),'ativo'),nullif(p_payload->>'responsavel_id','')::uuid,nullif(p_payload->>'observacoes','')) returning * into row_created;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_criar_calibracao(p_empresa_id uuid,p_equipamento_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row_created public.calibracoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  if not exists(select 1 from public.equipamentos where id=p_equipamento_id and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'Equipamento inválido'; end if;
  if nullif(p_payload->>'data_calibracao','') is null or nullif(p_payload->>'resultado','') is null then raise exception 'Data e resultado são obrigatórios'; end if;
  insert into public.calibracoes(empresa_id,equipamento_id,data_calibracao,data_vencimento,numero_certificado,laboratorio_responsavel,resultado,responsavel_id,observacoes)
  values(p_empresa_id,p_equipamento_id,(p_payload->>'data_calibracao')::date,nullif(p_payload->>'data_vencimento','')::date,nullif(p_payload->>'numero_certificado',''),nullif(p_payload->>'laboratorio_responsavel',''),p_payload->>'resultado',nullif(p_payload->>'responsavel_id','')::uuid,nullif(p_payload->>'observacoes','')) returning * into row_created;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_criar_qualificacao(p_empresa_id uuid,p_equipamento_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row_created public.qualificacoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  if not exists(select 1 from public.equipamentos where id=p_equipamento_id and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'Equipamento inválido'; end if;
  if nullif(p_payload->>'data_qualificacao','') is null or nullif(p_payload->>'tipo','') is null or nullif(p_payload->>'resultado','') is null then raise exception 'Tipo, data e resultado são obrigatórios'; end if;
  insert into public.qualificacoes(empresa_id,equipamento_id,tipo,data_qualificacao,data_vencimento,resultado,responsavel_tecnico_id,empresa_executora,observacoes)
  values(p_empresa_id,p_equipamento_id,p_payload->>'tipo',(p_payload->>'data_qualificacao')::date,nullif(p_payload->>'data_vencimento','')::date,p_payload->>'resultado',nullif(p_payload->>'responsavel_tecnico_id','')::uuid,nullif(p_payload->>'empresa_executora',''),nullif(p_payload->>'observacoes','')) returning * into row_created;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_criar_manutencao(p_empresa_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  row_created public.manutencoes;
  equipment uuid := nullif(p_payload->>'equipamento_id','')::uuid;
  maintenance_nature text := p_payload->>'natureza';
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  if equipment is null and nullif(trim(p_payload->>'nome_servico'),'') is null then raise exception 'Informe equipamento ou serviço'; end if;
  if equipment is not null and not exists(select 1 from public.equipamentos where id=equipment and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'Equipamento inválido'; end if;
  if maintenance_nature not in ('preventiva','corretiva') then raise exception 'Natureza da manutenção inválida'; end if;
  if nullif(p_payload->>'data_manutencao','') is null then raise exception 'Data da manutenção é obrigatória'; end if;
  if maintenance_nature='corretiva' and equipment is null then raise exception 'Manutenção corretiva deve estar vinculada a um equipamento'; end if;
  if maintenance_nature='corretiva' and nullif(trim(p_payload->>'falha_apresentada'),'') is null then raise exception 'Descreva a falha apresentada'; end if;
  insert into public.manutencoes(
    empresa_id,equipamento_id,nome_servico,natureza,tipo_servico,status_execucao,data_manutencao,proxima_manutencao,periodicidade_meses,
    empresa_responsavel,tecnico_responsavel,numero_ordem_servico,responsavel_interno_id,exige_evidencia,
    falha_apresentada,prioridade,diagnostico,causa_raiz,acao_realizada,equipamento_parado_desde,retorno_operacao_at,observacoes
  ) values(
    p_empresa_id,equipment,nullif(p_payload->>'nome_servico',''),maintenance_nature,coalesce(nullif(p_payload->>'tipo_servico',''),'outro'),
    coalesce(nullif(p_payload->>'status_execucao',''),'concluida'),(p_payload->>'data_manutencao')::date,nullif(p_payload->>'proxima_manutencao','')::date,
    nullif(p_payload->>'periodicidade_meses','')::integer,nullif(p_payload->>'empresa_responsavel',''),nullif(p_payload->>'tecnico_responsavel',''),
    nullif(p_payload->>'numero_ordem_servico',''),nullif(p_payload->>'responsavel_interno_id','')::uuid,coalesce((p_payload->>'exige_evidencia')::boolean,true),
    nullif(p_payload->>'falha_apresentada',''),nullif(p_payload->>'prioridade',''),nullif(p_payload->>'diagnostico',''),nullif(p_payload->>'causa_raiz',''),
    nullif(p_payload->>'acao_realizada',''),nullif(p_payload->>'equipamento_parado_desde','')::timestamptz,nullif(p_payload->>'retorno_operacao_at','')::timestamptz,
    nullif(p_payload->>'observacoes','')
  ) returning * into row_created;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_registrar_tratativa(p_empresa_id uuid,p_pendencia_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row_created public.tratativas_pendencias;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  if not exists(select 1 from public.pendencias where id=p_pendencia_id and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'Pendência inválida'; end if;
  if nullif(trim(p_payload->>'descricao'),'') is null then raise exception 'Descrição é obrigatória'; end if;
  insert into public.tratativas_pendencias(empresa_id,pendencia_id,descricao,responsavel_id,prazo,status,data_conclusao)
  values(p_empresa_id,p_pendencia_id,trim(p_payload->>'descricao'),nullif(p_payload->>'responsavel_id','')::uuid,nullif(p_payload->>'prazo','')::date,coalesce(nullif(p_payload->>'status',''),'pendente'),case when p_payload->>'status'='concluida' then now() end) returning * into row_created;
  update public.pendencias set status=case when row_created.status='concluida' then 'concluida' else 'em_andamento' end,concluida_at=case when row_created.status='concluida' then now() end where id=p_pendencia_id;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_excluir_logicamente(p_empresa_id uuid,p_modulo text,p_registro_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare allowed text[] := array['documentos','equipamentos','calibracoes','qualificacoes','manutencoes','pendencias']; affected integer;
begin
  if not public.can_admin_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  if not (p_modulo=any(allowed)) then raise exception 'Módulo inválido'; end if;
  execute format('update public.%I set deleted_at=now(),updated_at=now(),updated_by=$1 where id=$2 and empresa_id=$3 and deleted_at is null',p_modulo)
  using auth.uid(),p_registro_id,p_empresa_id;
  get diagnostics affected=row_count;
  if affected=0 then raise exception 'Registro não encontrado'; end if;
end $$;

revoke all on function public.api_contexto_usuario() from public,anon;
revoke all on function public.api_dashboard(uuid) from public,anon;
revoke all on function public.api_equipamento_detalhe(uuid,uuid) from public,anon;
revoke all on function public.api_criar_documento(uuid,jsonb) from public,anon;
revoke all on function public.api_criar_equipamento(uuid,jsonb) from public,anon;
revoke all on function public.api_criar_calibracao(uuid,uuid,jsonb) from public,anon;
revoke all on function public.api_criar_qualificacao(uuid,uuid,jsonb) from public,anon;
revoke all on function public.api_criar_manutencao(uuid,jsonb) from public,anon;
revoke all on function public.api_registrar_tratativa(uuid,uuid,jsonb) from public,anon;
revoke all on function public.api_excluir_logicamente(uuid,text,uuid) from public,anon;
grant execute on function public.api_contexto_usuario() to authenticated;
grant execute on function public.api_dashboard(uuid) to authenticated;
grant execute on function public.api_equipamento_detalhe(uuid,uuid) to authenticated;
grant execute on function public.api_criar_documento(uuid,jsonb) to authenticated;
grant execute on function public.api_criar_equipamento(uuid,jsonb) to authenticated;
grant execute on function public.api_criar_calibracao(uuid,uuid,jsonb) to authenticated;
grant execute on function public.api_criar_qualificacao(uuid,uuid,jsonb) to authenticated;
grant execute on function public.api_criar_manutencao(uuid,jsonb) to authenticated;
grant execute on function public.api_registrar_tratativa(uuid,uuid,jsonb) to authenticated;
grant execute on function public.api_excluir_logicamente(uuid,text,uuid) to authenticated;
