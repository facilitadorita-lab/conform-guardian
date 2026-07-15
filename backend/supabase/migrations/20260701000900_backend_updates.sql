-- Conform Flow — atualizações validadas no backend.

create or replace function public.api_atualizar_documento(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.documentos;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  update public.documentos d set
    nome=case when p_payload?'nome' then trim(p_payload->>'nome') else d.nome end,
    categoria_id=case when p_payload?'categoria_id' then nullif(p_payload->>'categoria_id','')::uuid else d.categoria_id end,
    tipo_documento_id=case when p_payload?'tipo_documento_id' then nullif(p_payload->>'tipo_documento_id','')::uuid else d.tipo_documento_id end,
    numero_documento=case when p_payload?'numero_documento' then nullif(p_payload->>'numero_documento','') else d.numero_documento end,
    orgao_emissor=case when p_payload?'orgao_emissor' then nullif(p_payload->>'orgao_emissor','') else d.orgao_emissor end,
    responsavel_id=case when p_payload?'responsavel_id' then nullif(p_payload->>'responsavel_id','')::uuid else d.responsavel_id end,
    data_emissao=case when p_payload?'data_emissao' then nullif(p_payload->>'data_emissao','')::date else d.data_emissao end,
    data_vencimento=case when p_payload?'data_vencimento' then nullif(p_payload->>'data_vencimento','')::date else d.data_vencimento end,
    exige_anexo=case when p_payload?'exige_anexo' then (p_payload->>'exige_anexo')::boolean else d.exige_anexo end,
    setor_unidade=case when p_payload?'setor_unidade' then nullif(p_payload->>'setor_unidade','') else d.setor_unidade end,
    observacoes=case when p_payload?'observacoes' then nullif(p_payload->>'observacoes','') else d.observacoes end
  where d.id=p_id and d.empresa_id=p_empresa_id and d.deleted_at is null returning d.* into saved;
  if saved.id is null then raise exception 'Documento não encontrado'; end if;
  if nullif(saved.nome,'') is null then raise exception 'Nome é obrigatório'; end if;
  return to_jsonb(saved);
end $$;

create or replace function public.api_atualizar_equipamento(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.equipamentos;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  update public.equipamentos e set
    nome=case when p_payload?'nome' then trim(p_payload->>'nome') else e.nome end,
    tipo_equipamento_id=case when p_payload?'tipo_equipamento_id' then nullif(p_payload->>'tipo_equipamento_id','')::uuid else e.tipo_equipamento_id end,
    codigo_interno=case when p_payload?'codigo_interno' then nullif(p_payload->>'codigo_interno','') else e.codigo_interno end,
    numero_serie=case when p_payload?'numero_serie' then nullif(p_payload->>'numero_serie','') else e.numero_serie end,
    fabricante=case when p_payload?'fabricante' then nullif(p_payload->>'fabricante','') else e.fabricante end,
    modelo=case when p_payload?'modelo' then nullif(p_payload->>'modelo','') else e.modelo end,
    setor=case when p_payload?'setor' then nullif(p_payload->>'setor','') else e.setor end,
    localizacao=case when p_payload?'localizacao' then nullif(p_payload->>'localizacao','') else e.localizacao end,
    criticidade=case when p_payload?'criticidade' then p_payload->>'criticidade' else e.criticidade end,
    status=case when p_payload?'status' then p_payload->>'status' else e.status end,
    responsavel_id=case when p_payload?'responsavel_id' then nullif(p_payload->>'responsavel_id','')::uuid else e.responsavel_id end,
    observacoes=case when p_payload?'observacoes' then nullif(p_payload->>'observacoes','') else e.observacoes end
  where e.id=p_id and e.empresa_id=p_empresa_id and e.deleted_at is null returning e.* into saved;
  if saved.id is null then raise exception 'Equipamento não encontrado'; end if;
  if nullif(saved.nome,'') is null then raise exception 'Nome é obrigatório'; end if;
  return to_jsonb(saved);
end $$;

create or replace function public.api_atualizar_calibracao(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.calibracoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  update public.calibracoes c set
    data_calibracao=case when p_payload?'data_calibracao' then (p_payload->>'data_calibracao')::date else c.data_calibracao end,
    data_vencimento=case when p_payload?'data_vencimento' then nullif(p_payload->>'data_vencimento','')::date else c.data_vencimento end,
    numero_certificado=case when p_payload?'numero_certificado' then nullif(p_payload->>'numero_certificado','') else c.numero_certificado end,
    laboratorio_responsavel=case when p_payload?'laboratorio_responsavel' then nullif(p_payload->>'laboratorio_responsavel','') else c.laboratorio_responsavel end,
    resultado=case when p_payload?'resultado' then p_payload->>'resultado' else c.resultado end,
    responsavel_id=case when p_payload?'responsavel_id' then nullif(p_payload->>'responsavel_id','')::uuid else c.responsavel_id end,
    observacoes=case when p_payload?'observacoes' then nullif(p_payload->>'observacoes','') else c.observacoes end
  where c.id=p_id and c.empresa_id=p_empresa_id and c.deleted_at is null returning c.* into saved;
  if saved.id is null then raise exception 'Calibração não encontrada'; end if;
  return to_jsonb(saved);
end $$;

create or replace function public.api_atualizar_qualificacao(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.qualificacoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  update public.qualificacoes q set
    tipo=case when p_payload?'tipo' then p_payload->>'tipo' else q.tipo end,
    data_qualificacao=case when p_payload?'data_qualificacao' then (p_payload->>'data_qualificacao')::date else q.data_qualificacao end,
    data_vencimento=case when p_payload?'data_vencimento' then nullif(p_payload->>'data_vencimento','')::date else q.data_vencimento end,
    resultado=case when p_payload?'resultado' then p_payload->>'resultado' else q.resultado end,
    responsavel_tecnico_id=case when p_payload?'responsavel_tecnico_id' then nullif(p_payload->>'responsavel_tecnico_id','')::uuid else q.responsavel_tecnico_id end,
    empresa_executora=case when p_payload?'empresa_executora' then nullif(p_payload->>'empresa_executora','') else q.empresa_executora end,
    observacoes=case when p_payload?'observacoes' then nullif(p_payload->>'observacoes','') else q.observacoes end
  where q.id=p_id and q.empresa_id=p_empresa_id and q.deleted_at is null returning q.* into saved;
  if saved.id is null then raise exception 'Qualificação não encontrada'; end if;
  return to_jsonb(saved);
end $$;

create or replace function public.api_atualizar_manutencao(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.manutencoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissão' using errcode='42501'; end if;
  update public.manutencoes m set
    equipamento_id=case when p_payload?'equipamento_id' then nullif(p_payload->>'equipamento_id','')::uuid else m.equipamento_id end,
    nome_servico=case when p_payload?'nome_servico' then nullif(p_payload->>'nome_servico','') else m.nome_servico end,
    natureza=case when p_payload?'natureza' then p_payload->>'natureza' else m.natureza end,
    tipo_servico=case when p_payload?'tipo_servico' then p_payload->>'tipo_servico' else m.tipo_servico end,
    status_execucao=case when p_payload?'status_execucao' then p_payload->>'status_execucao' else m.status_execucao end,
    data_manutencao=case when p_payload?'data_manutencao' then (p_payload->>'data_manutencao')::date else m.data_manutencao end,
    proxima_manutencao=case when p_payload?'proxima_manutencao' then nullif(p_payload->>'proxima_manutencao','')::date else m.proxima_manutencao end,
    periodicidade_meses=case when p_payload?'periodicidade_meses' then nullif(p_payload->>'periodicidade_meses','')::integer else m.periodicidade_meses end,
    empresa_responsavel=case when p_payload?'empresa_responsavel' then nullif(p_payload->>'empresa_responsavel','') else m.empresa_responsavel end,
    tecnico_responsavel=case when p_payload?'tecnico_responsavel' then nullif(p_payload->>'tecnico_responsavel','') else m.tecnico_responsavel end,
    numero_ordem_servico=case when p_payload?'numero_ordem_servico' then nullif(p_payload->>'numero_ordem_servico','') else m.numero_ordem_servico end,
    responsavel_interno_id=case when p_payload?'responsavel_interno_id' then nullif(p_payload->>'responsavel_interno_id','')::uuid else m.responsavel_interno_id end,
    falha_apresentada=case when p_payload?'falha_apresentada' then nullif(p_payload->>'falha_apresentada','') else m.falha_apresentada end,
    prioridade=case when p_payload?'prioridade' then nullif(p_payload->>'prioridade','') else m.prioridade end,
    diagnostico=case when p_payload?'diagnostico' then nullif(p_payload->>'diagnostico','') else m.diagnostico end,
    causa_raiz=case when p_payload?'causa_raiz' then nullif(p_payload->>'causa_raiz','') else m.causa_raiz end,
    acao_realizada=case when p_payload?'acao_realizada' then nullif(p_payload->>'acao_realizada','') else m.acao_realizada end,
    equipamento_parado_desde=case when p_payload?'equipamento_parado_desde' then nullif(p_payload->>'equipamento_parado_desde','')::timestamptz else m.equipamento_parado_desde end,
    retorno_operacao_at=case when p_payload?'retorno_operacao_at' then nullif(p_payload->>'retorno_operacao_at','')::timestamptz else m.retorno_operacao_at end,
    observacoes=case when p_payload?'observacoes' then nullif(p_payload->>'observacoes','') else m.observacoes end
  where m.id=p_id and m.empresa_id=p_empresa_id and m.deleted_at is null returning m.* into saved;
  if saved.id is null then raise exception 'Manutenção não encontrada'; end if;
  if saved.natureza='corretiva' and saved.equipamento_id is null then raise exception 'Manutenção corretiva deve estar vinculada a um equipamento'; end if;
  if saved.natureza='corretiva' and nullif(trim(saved.falha_apresentada),'') is null then raise exception 'Descreva a falha apresentada'; end if;
  return to_jsonb(saved);
end $$;

revoke all on function public.api_atualizar_documento(uuid,uuid,jsonb) from public,anon;
revoke all on function public.api_atualizar_equipamento(uuid,uuid,jsonb) from public,anon;
revoke all on function public.api_atualizar_calibracao(uuid,uuid,jsonb) from public,anon;
revoke all on function public.api_atualizar_qualificacao(uuid,uuid,jsonb) from public,anon;
revoke all on function public.api_atualizar_manutencao(uuid,uuid,jsonb) from public,anon;
grant execute on function public.api_atualizar_documento(uuid,uuid,jsonb) to authenticated;
grant execute on function public.api_atualizar_equipamento(uuid,uuid,jsonb) to authenticated;
grant execute on function public.api_atualizar_calibracao(uuid,uuid,jsonb) to authenticated;
grant execute on function public.api_atualizar_qualificacao(uuid,uuid,jsonb) to authenticated;
grant execute on function public.api_atualizar_manutencao(uuid,uuid,jsonb) to authenticated;
