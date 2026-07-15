-- Conform Flow — documentos exigidos por tipo de estabelecimento/segmento.
--
-- Objetivo:
-- 1) Evitar que um documento específico de um segmento (ex.: AFE/ANVISA para
--    farmácia/distribuidora) seja tratado como exigência universal.
-- 2) Corrigir as 30 empresas fictícias para terem documentos diferentes por
--    perfil operacional.
--
-- Segurança:
-- - Não altera documentos reais de clientes.
-- - A limpeza abaixo é restrita às empresas fictícias com CNPJ 90.xxx
--   e somente aos registros gerados por carga fictícia Conform Flow.

create table if not exists public.modelos_documentos_segmento (
  id uuid primary key default gen_random_uuid(),
  segmento_chave text not null,
  tipo_estabelecimento text,
  nome text not null,
  categoria_nome text,
  tipo_documento_nome text,
  orgao_emissor_padrao text,
  periodicidade_meses integer,
  setor_padrao text,
  obrigatorio boolean not null default true,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (segmento_chave, nome)
);

alter table public.modelos_documentos_segmento enable row level security;

drop policy if exists modelos_documentos_segmento_read on public.modelos_documentos_segmento;
create policy modelos_documentos_segmento_read on public.modelos_documentos_segmento
for select to authenticated
using (deleted_at is null and ativo);

revoke insert, update, delete, truncate on public.modelos_documentos_segmento from authenticated, anon;
grant select on public.modelos_documentos_segmento to authenticated;

insert into public.modelos_documentos_segmento (
  segmento_chave,
  tipo_estabelecimento,
  nome,
  categoria_nome,
  tipo_documento_nome,
  orgao_emissor_padrao,
  periodicidade_meses,
  setor_padrao,
  observacoes
)
values
  ('comum', null, 'AVCB - Auto de Vistoria do Corpo de Bombeiros', 'AVCB', 'Certificado', 'Corpo de Bombeiros', 12, 'Administrativo', 'Exigência comum para estabelecimentos físicos; não substitui análise local.'),
  ('comum', null, 'Licença de Funcionamento', 'Licença de funcionamento', 'Licença', 'Prefeitura Municipal', 12, 'Administrativo', 'Exigência municipal comum, pode variar por cidade.'),
  ('clinica', 'Clínica', 'Alvará Sanitário da Clínica', 'Alvará sanitário', 'Licença', 'Vigilância Sanitária', 12, 'Qualidade', 'Aplicável a clínicas e centros médicos.'),
  ('clinica', 'Clínica', 'CNES - Cadastro Nacional de Estabelecimento de Saúde', 'Licença de funcionamento', 'Documento', 'Ministério da Saúde', 12, 'Administrativo', 'Aplicável a serviços de saúde.'),
  ('clinica', 'Clínica', 'Registro do Responsável Técnico - CRM/COREN', 'Certificado', 'Documento', 'Conselho Profissional', 12, 'Qualidade', 'Varia conforme atividade e conselho responsável.'),
  ('clinica', 'Clínica', 'PGRSS - Serviços de Saúde', 'Contrato de resíduos', 'Procedimento', 'Responsável Técnico', 12, 'Qualidade', 'Plano de resíduos específico para serviço de saúde.'),
  ('clinica', 'Clínica', 'Contrato de Coleta de Resíduos de Saúde', 'Contrato de resíduos', 'Contrato', 'Fornecedor homologado', 12, 'Operações', 'Evidência operacional de destinação de resíduos.'),
  ('laboratorio', 'Laboratório', 'Licença Sanitária do Laboratório', 'Alvará sanitário', 'Licença', 'Vigilância Sanitária', 12, 'Qualidade', 'Aplicável a laboratórios clínicos, analíticos e técnicos.'),
  ('laboratorio', 'Laboratório', 'Registro do Responsável Técnico Laboratorial', 'Certificado', 'Documento', 'Conselho Profissional', 12, 'Qualidade', 'CRBM/CRF/CRM/CREA conforme escopo.'),
  ('laboratorio', 'Laboratório', 'Controle Externo de Qualidade', 'Certificado', 'Certificado', 'Provedor de ensaio de proficiência', 12, 'Qualidade', 'Exigência típica para rotina laboratorial.'),
  ('laboratorio', 'Laboratório', 'Procedimento de Coleta e Transporte de Amostras', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Operações', 'Procedimento específico do laboratório.'),
  ('laboratorio', 'Laboratório', 'PGRSS Laboratorial', 'Contrato de resíduos', 'Procedimento', 'Responsável Técnico', 12, 'Qualidade', 'Plano de resíduos específico para laboratório.'),
  ('farmaceutico', 'Farmácia/Distribuidora', 'AFE - Autorização de Funcionamento ANVISA', 'Licença de funcionamento', 'Autorização', 'ANVISA', 12, 'Regulatório', 'Documento específico para operação farmacêutica quando aplicável.'),
  ('farmaceutico', 'Farmácia/Distribuidora', 'Licença Sanitária Farmacêutica', 'Alvará sanitário', 'Licença', 'Vigilância Sanitária', 12, 'Regulatório', 'Aplicável a farmácias, drogarias e distribuidoras conforme escopo.'),
  ('farmaceutico', 'Farmácia/Distribuidora', 'Certidão de Regularidade Técnica - CRF', 'Certificado', 'Certificado', 'CRF', 12, 'Regulatório', 'Documento específico de responsabilidade farmacêutica.'),
  ('farmaceutico', 'Farmácia/Distribuidora', 'Manual de Boas Práticas Farmacêuticas', 'Manual operacional', 'Manual', 'Qualidade Interna', null, 'Qualidade', 'Manual específico para rotina farmacêutica.'),
  ('farmaceutico', 'Farmácia/Distribuidora', 'Controle de Temperatura e Umidade', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Operações', 'Evidência essencial para armazenamento de medicamentos/produtos sensíveis.'),
  ('farmaceutico', 'Farmácia/Distribuidora', 'Qualificação de Transporte ou Cadeia Fria', 'Certificado', 'Relatório', 'Qualidade Interna', 12, 'Operações', 'Aplicável quando há transporte/armazenagem controlada.'),
  ('odontologia', 'Clínica odontológica', 'Alvará Sanitário Odontológico', 'Alvará sanitário', 'Licença', 'Vigilância Sanitária', 12, 'Regulatório', 'Aplicável a serviços odontológicos.'),
  ('odontologia', 'Clínica odontológica', 'Registro do Responsável Técnico - CRO', 'Certificado', 'Documento', 'CRO', 12, 'Regulatório', 'Responsabilidade técnica odontológica.'),
  ('odontologia', 'Clínica odontológica', 'Controle de Esterilização de Instrumentais', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'CME', 'Rotina crítica para odontologia.'),
  ('odontologia', 'Clínica odontológica', 'PGRSS Odontológico', 'Contrato de resíduos', 'Procedimento', 'Responsável Técnico', 12, 'Qualidade', 'Plano de resíduos específico para odontologia.'),
  ('imagem', 'Diagnóstico por imagem', 'Licença Sanitária para Diagnóstico por Imagem', 'Alvará sanitário', 'Licença', 'Vigilância Sanitária', 12, 'Regulatório', 'Aplicável a serviços de imagem.'),
  ('imagem', 'Diagnóstico por imagem', 'Programa de Proteção Radiológica', 'Manual operacional', 'Procedimento', 'Responsável Técnico', 12, 'Qualidade', 'Aplicável quando houver radiação ionizante.'),
  ('imagem', 'Diagnóstico por imagem', 'Controle de Qualidade dos Equipamentos de Imagem', 'Certificado', 'Relatório', 'Fornecedor homologado', 12, 'Engenharia Clínica', 'Evidência específica para equipamentos de imagem.'),
  ('cadeia_fria', 'Cadeia fria', 'Licença Sanitária para Armazenagem', 'Alvará sanitário', 'Licença', 'Vigilância Sanitária', 12, 'Regulatório', 'Aplicável a armazenagem sensível.'),
  ('cadeia_fria', 'Cadeia fria', 'Mapeamento Térmico de Área/Equipamento', 'Certificado', 'Relatório', 'Qualidade Interna', 12, 'Qualidade', 'Evidência típica para cadeia fria.'),
  ('cadeia_fria', 'Cadeia fria', 'Plano de Contingência de Falha de Temperatura', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Operações', 'Rotina crítica para armazenamento térmico.'),
  ('biologico', 'Banco biológico/Biotecnologia', 'Licença Sanitária para Material Biológico', 'Alvará sanitário', 'Licença', 'Vigilância Sanitária', 12, 'Regulatório', 'Aplicável a biobancos, biotecnologia e pesquisa.'),
  ('biologico', 'Banco biológico/Biotecnologia', 'Plano de Biossegurança', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Qualidade', 'Controle de risco biológico.'),
  ('biologico', 'Banco biológico/Biotecnologia', 'Rastreabilidade de Amostras Biológicas', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Operações', 'Documento operacional específico.'),
  ('alimentos', 'Laboratório de alimentos', 'Licença Sanitária para Laboratório de Alimentos', 'Alvará sanitário', 'Licença', 'Vigilância Sanitária', 12, 'Regulatório', 'Aplicável a laboratórios de alimentos.'),
  ('alimentos', 'Laboratório de alimentos', 'POP de Amostragem e Ensaios de Alimentos', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Qualidade', 'Procedimento específico de alimentos.')
on conflict (segmento_chave, nome) do update set
  tipo_estabelecimento = excluded.tipo_estabelecimento,
  categoria_nome = excluded.categoria_nome,
  tipo_documento_nome = excluded.tipo_documento_nome,
  orgao_emissor_padrao = excluded.orgao_emissor_padrao,
  periodicidade_meses = excluded.periodicidade_meses,
  setor_padrao = excluded.setor_padrao,
  obrigatorio = excluded.obrigatorio,
  ativo = true,
  observacoes = excluded.observacoes,
  deleted_at = null,
  updated_at = now();

create or replace function public.segmento_documental_chaves(
  p_tipo_estabelecimento text,
  p_segmento text
)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tipo text := lower(coalesce(p_tipo_estabelecimento, ''));
  v_segmento text := lower(coalesce(p_segmento, ''));
  v_chaves text[] := array['comum'];
begin
  if v_tipo like '%distribuidora%'
     or v_tipo like '%farmácia%'
     or v_tipo like '%farmacia%'
     or v_segmento like '%farmac%' then
    v_chaves := array_append(v_chaves, 'farmaceutico');
  end if;

  if v_tipo like '%laboratório%'
     or v_tipo like '%laboratorio%'
     or v_segmento like '%análises%'
     or v_segmento like '%analises%'
     or v_segmento like '%hematologia%'
     or v_segmento like '%imunologia%'
     or v_segmento like '%patologia%'
     or v_segmento like '%diagnóstico%'
     or v_segmento like '%diagnostico%'
     or v_segmento like '%pneumologia%'
     or v_segmento like '%controle de qualidade%' then
    v_chaves := array_append(v_chaves, 'laboratorio');
  end if;

  if v_segmento like '%odont%' then
    v_chaves := array_append(v_chaves, 'odontologia');
  end if;

  if v_segmento like '%imagem%' then
    v_chaves := array_append(v_chaves, 'imagem');
  end if;

  if v_tipo like '%armazenamento%'
     or v_segmento like '%cadeia fria%'
     or v_segmento like '%armazenamento térmico%'
     or v_segmento like '%armazenamento termico%' then
    v_chaves := array_append(v_chaves, 'cadeia_fria');
  end if;

  if v_tipo like '%banco biológico%'
     or v_tipo like '%banco biologico%'
     or v_segmento like '%biotecnologia%'
     or v_segmento like '%biológico%'
     or v_segmento like '%biologico%' then
    v_chaves := array_append(v_chaves, 'biologico');
  end if;

  if v_segmento like '%alimentos%' then
    v_chaves := array_append(v_chaves, 'alimentos');
  end if;

  if v_tipo like '%clínica%'
     or v_tipo like '%clinica%'
     or v_tipo like '%centro médico%'
     or v_tipo like '%centro medico%'
     or v_segmento like '%saúde%'
     or v_segmento like '%saude%'
     or v_segmento like '%cardiologia%'
     or v_segmento like '%neurologia%'
     or v_segmento like '%dermatologia%'
     or v_segmento like '%gastro%'
     or v_segmento like '%oftalmo%'
     or v_segmento like '%preventiva%'
     or v_segmento like '%oncologia%'
     or v_segmento like '%imunização%'
     or v_segmento like '%imunizacao%' then
    v_chaves := array_append(v_chaves, 'clinica');
  end if;

  return (select array_agg(distinct chave) from unnest(v_chaves) as chave);
end $$;

create or replace function public.api_provisionar_documentos_empresa(
  p_empresa_id uuid,
  p_forcar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa public.empresas;
  v_modelo record;
  v_doc_id uuid;
  v_slug text;
  v_criados integer := 0;
  v_existentes integer := 0;
  v_chaves text[];
begin
  if not public.can_write_company(p_empresa_id) then
    raise exception 'Sem permissão' using errcode='42501';
  end if;

  select *
  into v_empresa
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null;

  if not found then
    raise exception 'Empresa não encontrada' using errcode='P0002';
  end if;

  v_slug := regexp_replace(v_empresa.cnpj, '[^0-9]+', '', 'g');
  v_chaves := public.segmento_documental_chaves(
    v_empresa.tipo_estabelecimento,
    v_empresa.segmento
  );

  for v_modelo in
    select *
    from public.modelos_documentos_segmento m
    where m.deleted_at is null
      and m.ativo
      and m.segmento_chave = any(v_chaves)
    order by
      case when m.segmento_chave = 'comum' then 0 else 1 end,
      m.segmento_chave,
      m.nome
  loop
    select d.id
    into v_doc_id
    from public.documentos d
    where d.empresa_id = p_empresa_id
      and d.deleted_at is null
      and lower(d.nome) = lower(v_modelo.nome)
    limit 1;

    if v_doc_id is not null and not p_forcar then
      v_existentes := v_existentes + 1;
      v_doc_id := null;
      continue;
    end if;

    insert into public.documentos (
      empresa_id,
      nome,
      numero_documento,
      orgao_emissor,
      data_emissao,
      data_vencimento,
      periodicidade_meses,
      exige_anexo,
      setor_unidade,
      observacoes
    )
    values (
      p_empresa_id,
      v_modelo.nome,
      upper(v_modelo.segmento_chave) || '-' || v_slug || '-' || lpad((v_criados + v_existentes + 1)::text, 3, '0'),
      v_modelo.orgao_emissor_padrao,
      null,
      null,
      v_modelo.periodicidade_meses,
      true,
      v_modelo.setor_padrao,
      'Documento pré-configurado automaticamente conforme tipo de estabelecimento/segmento. Cliente pode editar datas, anexos e responsáveis.'
    )
    on conflict do nothing
    returning id into v_doc_id;

    if v_doc_id is not null then
      v_criados := v_criados + 1;
    else
      v_existentes := v_existentes + 1;
    end if;

    v_doc_id := null;
  end loop;

  return jsonb_build_object(
    'empresa_id', p_empresa_id,
    'tipo_estabelecimento', v_empresa.tipo_estabelecimento,
    'segmento', v_empresa.segmento,
    'chaves', v_chaves,
    'documentos_criados', v_criados,
    'documentos_existentes', v_existentes
  );
end $$;

revoke all on function public.segmento_documental_chaves(text,text) from public, anon;
revoke all on function public.api_provisionar_documentos_empresa(uuid,boolean) from public, anon;
grant execute on function public.segmento_documental_chaves(text,text) to authenticated;
grant execute on function public.api_provisionar_documentos_empresa(uuid,boolean) to authenticated;

create or replace function public.api_master_criar_empresa(
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa public.empresas;
  v_plano_id uuid;
  v_admin_id uuid := auth.uid();
  v_provisionamento jsonb;
begin
  if not public.is_master() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if nullif(trim(p_payload->>'razao_social'), '') is null then
    raise exception 'Razão social é obrigatória';
  end if;

  if nullif(trim(p_payload->>'nome_fantasia'), '') is null then
    raise exception 'Nome fantasia é obrigatório';
  end if;

  if nullif(trim(p_payload->>'cnpj'), '') is null then
    raise exception 'CNPJ é obrigatório';
  end if;

  v_plano_id := nullif(p_payload->>'plano_id', '')::uuid;
  if v_plano_id is null then
    select id
    into v_plano_id
    from public.planos
    where ativo
      and lower(nome) in ('professional', 'pro')
    order by nome
    limit 1;
  end if;

  if v_plano_id is null then
    select id
    into v_plano_id
    from public.planos
    where ativo
    order by created_at desc
    limit 1;
  end if;

  insert into public.empresas (
    razao_social,
    nome_fantasia,
    cnpj,
    tipo_estabelecimento,
    segmento,
    cidade,
    estado,
    email_principal,
    responsavel_legal,
    responsavel_tecnico,
    plano_id,
    status,
    observacoes
  )
  values (
    trim(p_payload->>'razao_social'),
    trim(p_payload->>'nome_fantasia'),
    trim(p_payload->>'cnpj'),
    nullif(trim(p_payload->>'tipo_estabelecimento'), ''),
    nullif(trim(p_payload->>'segmento'), ''),
    nullif(trim(p_payload->>'cidade'), ''),
    nullif(upper(trim(p_payload->>'estado')), ''),
    nullif(trim(p_payload->>'email_principal'), ''),
    nullif(trim(p_payload->>'responsavel_legal'), ''),
    nullif(trim(p_payload->>'responsavel_tecnico'), ''),
    v_plano_id,
    coalesce(nullif(trim(p_payload->>'status'), ''), 'ativa'),
    nullif(trim(p_payload->>'observacoes'), '')
  )
  on conflict (cnpj) do update set
    razao_social = excluded.razao_social,
    nome_fantasia = excluded.nome_fantasia,
    tipo_estabelecimento = excluded.tipo_estabelecimento,
    segmento = excluded.segmento,
    cidade = excluded.cidade,
    estado = excluded.estado,
    email_principal = excluded.email_principal,
    responsavel_legal = excluded.responsavel_legal,
    responsavel_tecnico = excluded.responsavel_tecnico,
    plano_id = excluded.plano_id,
    status = excluded.status,
    observacoes = excluded.observacoes,
    deleted_at = null,
    updated_at = now()
  returning * into v_empresa;

  insert into public.usuarios_empresas (usuario_id, empresa_id, perfil, ativo)
  values (v_admin_id, v_empresa.id, 'administrador', true)
  on conflict (usuario_id, empresa_id) do update set
    perfil = excluded.perfil,
    ativo = true,
    deleted_at = null,
    updated_at = now();

  insert into public.assinaturas_empresas (
    empresa_id,
    plano_id,
    status,
    ciclo,
    valor_mensal_centavos,
    valor_anual_centavos,
    moeda,
    trial_termina_em,
    proximo_vencimento,
    observacoes_internas
  )
  select
    v_empresa.id,
    v_plano_id,
    'trial',
    'mensal',
    coalesce(p.valor_mensal_centavos, 0),
    p.valor_anual_centavos,
    'BRL',
    current_date + coalesce(p.trial_dias, 14),
    current_date + coalesce(p.trial_dias, 14),
    'Assinatura criada automaticamente no cadastro da empresa.'
  from public.planos p
  where p.id = v_plano_id
  on conflict (empresa_id) do update set
    plano_id = excluded.plano_id,
    status = excluded.status,
    ciclo = excluded.ciclo,
    valor_mensal_centavos = excluded.valor_mensal_centavos,
    valor_anual_centavos = excluded.valor_anual_centavos,
    trial_termina_em = excluded.trial_termina_em,
    proximo_vencimento = excluded.proximo_vencimento,
    deleted_at = null,
    updated_at = now();

  v_provisionamento := public.api_provisionar_documentos_empresa(v_empresa.id, false);

  return jsonb_build_object(
    'empresa', to_jsonb(v_empresa),
    'provisionamento_documentos', v_provisionamento
  );
end $$;

revoke all on function public.api_master_criar_empresa(jsonb) from public, anon;
grant execute on function public.api_master_criar_empresa(jsonb) to authenticated;

do $$
declare
  v_empresa record;
  v_doc record;
  v_doc_id uuid;
  v_slug text;
  v_tipo text;
  v_segmento text;
begin
  -- Remove somente documentos/anexos da carga fictícia antiga nas empresas
  -- de teste. Não toca documentos cadastrados manualmente.
  with docs_antigos as (
    update public.documentos d
    set
      deleted_at = now(),
      updated_at = now(),
      observacoes = coalesce(d.observacoes, '') || ' | Substituído por carga segmentada de documentos.'
    from public.empresas e
    where e.id = d.empresa_id
      and e.cnpj between '90.000.001/0001-01' and '90.000.030/0001-30'
      and d.deleted_at is null
      and d.observacoes like 'Carga ficticia Conform Flow:%'
    returning d.id, d.empresa_id
  )
  update public.anexos a
  set
    deleted_at = now(),
    updated_at = now(),
    status = 'excluido'
  from docs_antigos da
  where a.empresa_id = da.empresa_id
    and a.registro_id = da.id
    and a.modulo = 'documentos'
    and a.deleted_at is null;

  for v_empresa in
    select
      e.id,
      e.cnpj,
      e.tipo_estabelecimento,
      e.segmento,
      row_number() over (order by e.cnpj)::integer as seq
    from public.empresas e
    where e.cnpj between '90.000.001/0001-01' and '90.000.030/0001-30'
      and e.deleted_at is null
    order by e.cnpj
  loop
    v_slug := regexp_replace(v_empresa.cnpj, '[^0-9]+', '', 'g');
    v_tipo := lower(coalesce(v_empresa.tipo_estabelecimento, ''));
    v_segmento := lower(coalesce(v_empresa.segmento, ''));

    for v_doc in
      select *
      from (
        -- Base comum, mas ainda gravada individualmente por empresa.
        values
          ('AVCB', 'AVCB - Auto de Vistoria do Corpo de Bombeiros', 'Corpo de Bombeiros', current_date - (300 + v_empresa.seq), current_date + (20 + (v_empresa.seq % 45)), 12, 'Administrativo', 'avcb-auto-vistoria.pdf', 420000),
          ('LIC-FUNC', 'Licença de Funcionamento', 'Prefeitura Municipal', current_date - (180 + v_empresa.seq), current_date + (150 + (v_empresa.seq % 90)), 12, 'Administrativo', 'licenca-funcionamento.pdf', 365000)
      ) as base(codigo, nome, orgao_emissor, data_emissao, data_vencimento, periodicidade_meses, setor_unidade, arquivo, tamanho_bytes)

      union all

      select *
      from (
        values
          ('ALV-CLIN', 'Alvará Sanitário da Clínica', 'Vigilância Sanitária', current_date - (210 + v_empresa.seq), current_date + (80 + (v_empresa.seq % 60)), 12, 'Qualidade', 'alvara-sanitario-clinica.pdf', 390000),
          ('CNES', 'CNES - Cadastro Nacional de Estabelecimento de Saúde', 'Ministério da Saúde', current_date - (120 + v_empresa.seq), current_date + (300 + (v_empresa.seq % 60)), 12, 'Administrativo', 'cnes.pdf', 260000),
          ('RT-CLIN', 'Registro do Responsável Técnico - CRM/COREN', 'Conselho Profissional', current_date - (90 + v_empresa.seq), current_date + (330 + (v_empresa.seq % 45)), 12, 'Qualidade', 'registro-responsavel-tecnico.pdf', 280000),
          ('PGRSS-CLIN', 'PGRSS - Serviços de Saúde', 'Responsável Técnico', current_date - (120 + v_empresa.seq), current_date + (240 + (v_empresa.seq % 90)), 12, 'Qualidade', 'pgrss-servicos-saude.pdf', 810000),
          ('CTR-RSS', 'Contrato de Coleta de Resíduos de Saúde', 'Fornecedor homologado', current_date - (90 + v_empresa.seq), current_date + (45 + (v_empresa.seq % 75)), 12, 'Operações', 'contrato-coleta-residuos-saude.pdf', 530000)
      ) as clin(codigo, nome, orgao_emissor, data_emissao, data_vencimento, periodicidade_meses, setor_unidade, arquivo, tamanho_bytes)
      where v_tipo like '%clínica%'
         or v_tipo like '%clinica%'
         or v_tipo like '%centro médico%'
         or v_tipo like '%centro medico%'
         or v_segmento like '%saúde%'
         or v_segmento like '%saude%'
         or v_segmento like '%cardiologia%'
         or v_segmento like '%neurologia%'
         or v_segmento like '%dermatologia%'
         or v_segmento like '%gastro%'
         or v_segmento like '%oftalmo%'
         or v_segmento like '%preventiva%'

      union all

      select *
      from (
        values
          ('ALV-LAB', 'Licença Sanitária do Laboratório', 'Vigilância Sanitária', current_date - (210 + v_empresa.seq), current_date + (70 + (v_empresa.seq % 70)), 12, 'Qualidade', 'licenca-sanitaria-laboratorio.pdf', 395000),
          ('RT-LAB', 'Registro do Responsável Técnico Laboratorial', 'Conselho Profissional', current_date - (95 + v_empresa.seq), current_date + (280 + (v_empresa.seq % 70)), 12, 'Qualidade', 'responsavel-tecnico-laboratorial.pdf', 300000),
          ('CEQ', 'Controle Externo de Qualidade', 'Provedor de ensaio de proficiência', current_date - (45 + v_empresa.seq), current_date + (95 + (v_empresa.seq % 80)), 12, 'Qualidade', 'controle-externo-qualidade.pdf', 440000),
          ('POP-AMOSTRAS', 'Procedimento de Coleta e Transporte de Amostras', 'Qualidade Interna', current_date - (60 + v_empresa.seq), null::date, null::integer, 'Operações', 'pop-coleta-transporte-amostras.pdf', 510000),
          ('PGRSS-LAB', 'PGRSS Laboratorial', 'Responsável Técnico', current_date - (120 + v_empresa.seq), current_date + (210 + (v_empresa.seq % 90)), 12, 'Qualidade', 'pgrss-laboratorial.pdf', 780000)
      ) as lab(codigo, nome, orgao_emissor, data_emissao, data_vencimento, periodicidade_meses, setor_unidade, arquivo, tamanho_bytes)
      where v_tipo like '%laboratório%'
         or v_tipo like '%laboratorio%'
         or v_segmento like '%análises%'
         or v_segmento like '%analises%'
         or v_segmento like '%hematologia%'
         or v_segmento like '%imunologia%'
         or v_segmento like '%patologia%'
         or v_segmento like '%diagnóstico%'
         or v_segmento like '%diagnostico%'
         or v_segmento like '%pneumologia%'
         or v_segmento like '%controle de qualidade%'

      union all

      select *
      from (
        values
          ('AFE-ANVISA', 'AFE - Autorização de Funcionamento ANVISA', 'ANVISA', current_date - (160 + v_empresa.seq), current_date + (160 + (v_empresa.seq % 90)), 12, 'Regulatório', 'afe-anvisa.pdf', 470000),
          ('ALV-FARM', 'Licença Sanitária Farmacêutica', 'Vigilância Sanitária', current_date - (180 + v_empresa.seq), current_date + (95 + (v_empresa.seq % 75)), 12, 'Regulatório', 'licenca-sanitaria-farmaceutica.pdf', 395000),
          ('CRF', 'Certidão de Regularidade Técnica - CRF', 'CRF', current_date - (70 + v_empresa.seq), current_date + (180 + (v_empresa.seq % 60)), 12, 'Regulatório', 'certidao-crf.pdf', 290000),
          ('MBP-FARM', 'Manual de Boas Práticas Farmacêuticas', 'Qualidade Interna', current_date - (60 + v_empresa.seq), null::date, null::integer, 'Qualidade', 'manual-boas-praticas-farmaceuticas.pdf', 1250000),
          ('TEMP-UMID', 'Controle de Temperatura e Umidade', 'Qualidade Interna', current_date - (30 + v_empresa.seq), null::date, null::integer, 'Operações', 'controle-temperatura-umidade.pdf', 360000),
          ('QUAL-TRANS', 'Qualificação de Transporte ou Cadeia Fria', 'Qualidade Interna', current_date - (100 + v_empresa.seq), current_date + (120 + (v_empresa.seq % 90)), 12, 'Operações', 'qualificacao-transporte-cadeia-fria.pdf', 620000)
      ) as farm(codigo, nome, orgao_emissor, data_emissao, data_vencimento, periodicidade_meses, setor_unidade, arquivo, tamanho_bytes)
      where v_tipo like '%distribuidora%'
         or v_tipo like '%farmácia%'
         or v_tipo like '%farmacia%'
         or v_segmento like '%farmac%'

      union all

      select *
      from (
        values
          ('ALV-ODONTO', 'Alvará Sanitário Odontológico', 'Vigilância Sanitária', current_date - (200 + v_empresa.seq), current_date + (75 + (v_empresa.seq % 70)), 12, 'Regulatório', 'alvara-sanitario-odontologico.pdf', 390000),
          ('CRO', 'Registro do Responsável Técnico - CRO', 'CRO', current_date - (80 + v_empresa.seq), current_date + (250 + (v_empresa.seq % 70)), 12, 'Regulatório', 'registro-cro.pdf', 280000),
          ('ESTERIL', 'Controle de Esterilização de Instrumentais', 'Qualidade Interna', current_date - (35 + v_empresa.seq), null::date, null::integer, 'CME', 'controle-esterilizacao-instrumentais.pdf', 460000),
          ('PGRSS-ODONTO', 'PGRSS Odontológico', 'Responsável Técnico', current_date - (105 + v_empresa.seq), current_date + (210 + (v_empresa.seq % 90)), 12, 'Qualidade', 'pgrss-odontologico.pdf', 770000)
      ) as odonto(codigo, nome, orgao_emissor, data_emissao, data_vencimento, periodicidade_meses, setor_unidade, arquivo, tamanho_bytes)
      where v_segmento like '%odont%'

      union all

      select *
      from (
        values
          ('ALV-IMG', 'Licença Sanitária para Diagnóstico por Imagem', 'Vigilância Sanitária', current_date - (210 + v_empresa.seq), current_date + (85 + (v_empresa.seq % 70)), 12, 'Regulatório', 'licenca-diagnostico-imagem.pdf', 410000),
          ('PPR', 'Programa de Proteção Radiológica', 'Responsável Técnico', current_date - (130 + v_empresa.seq), current_date + (180 + (v_empresa.seq % 90)), 12, 'Qualidade', 'programa-protecao-radiologica.pdf', 700000),
          ('CQ-IMG', 'Controle de Qualidade dos Equipamentos de Imagem', 'Fornecedor homologado', current_date - (70 + v_empresa.seq), current_date + (120 + (v_empresa.seq % 60)), 12, 'Engenharia Clínica', 'controle-qualidade-imagem.pdf', 520000)
      ) as img(codigo, nome, orgao_emissor, data_emissao, data_vencimento, periodicidade_meses, setor_unidade, arquivo, tamanho_bytes)
      where v_segmento like '%imagem%'

      union all

      select *
      from (
        values
          ('ALV-FRIO', 'Licença Sanitária para Armazenagem', 'Vigilância Sanitária', current_date - (190 + v_empresa.seq), current_date + (110 + (v_empresa.seq % 70)), 12, 'Regulatório', 'licenca-armazenagem.pdf', 390000),
          ('MAP-TERM', 'Mapeamento Térmico de Área/Equipamento', 'Qualidade Interna', current_date - (80 + v_empresa.seq), current_date + (110 + (v_empresa.seq % 90)), 12, 'Qualidade', 'mapeamento-termico.pdf', 640000),
          ('CONT-FRIO', 'Plano de Contingência de Falha de Temperatura', 'Qualidade Interna', current_date - (50 + v_empresa.seq), null::date, null::integer, 'Operações', 'plano-contingencia-temperatura.pdf', 520000)
      ) as frio(codigo, nome, orgao_emissor, data_emissao, data_vencimento, periodicidade_meses, setor_unidade, arquivo, tamanho_bytes)
      where v_tipo like '%armazenamento%'
         or v_segmento like '%cadeia fria%'
         or v_segmento like '%armazenamento térmico%'
         or v_segmento like '%armazenamento termico%'

      union all

      select *
      from (
        values
          ('ALV-BIO', 'Licença Sanitária para Material Biológico', 'Vigilância Sanitária', current_date - (190 + v_empresa.seq), current_date + (100 + (v_empresa.seq % 80)), 12, 'Regulatório', 'licenca-material-biologico.pdf', 400000),
          ('BIOSEG', 'Plano de Biossegurança', 'Qualidade Interna', current_date - (75 + v_empresa.seq), null::date, null::integer, 'Qualidade', 'plano-biosseguranca.pdf', 680000),
          ('RAST-AMOSTRAS', 'Rastreabilidade de Amostras Biológicas', 'Qualidade Interna', current_date - (45 + v_empresa.seq), null::date, null::integer, 'Operações', 'rastreabilidade-amostras-biologicas.pdf', 560000)
      ) as bio(codigo, nome, orgao_emissor, data_emissao, data_vencimento, periodicidade_meses, setor_unidade, arquivo, tamanho_bytes)
      where v_tipo like '%banco biológico%'
         or v_tipo like '%banco biologico%'
         or v_segmento like '%biotecnologia%'
         or v_segmento like '%biológico%'
         or v_segmento like '%biologico%'

      union all

      select *
      from (
        values
          ('ALV-ALIM', 'Licença Sanitária para Laboratório de Alimentos', 'Vigilância Sanitária', current_date - (170 + v_empresa.seq), current_date + (120 + (v_empresa.seq % 70)), 12, 'Regulatório', 'licenca-laboratorio-alimentos.pdf', 395000),
          ('POP-ALIM', 'POP de Amostragem e Ensaios de Alimentos', 'Qualidade Interna', current_date - (60 + v_empresa.seq), null::date, null::integer, 'Qualidade', 'pop-amostragem-ensaios-alimentos.pdf', 500000)
      ) as alimentos(codigo, nome, orgao_emissor, data_emissao, data_vencimento, periodicidade_meses, setor_unidade, arquivo, tamanho_bytes)
      where v_segmento like '%alimentos%'
    loop
      insert into public.documentos (
        empresa_id,
        nome,
        numero_documento,
        orgao_emissor,
        data_emissao,
        data_vencimento,
        periodicidade_meses,
        exige_anexo,
        setor_unidade,
        observacoes
      )
      select
        v_empresa.id,
        v_doc.nome,
        v_doc.codigo || '-' || v_slug || '-2026',
        v_doc.orgao_emissor,
        v_doc.data_emissao,
        v_doc.data_vencimento,
        v_doc.periodicidade_meses,
        true,
        v_doc.setor_unidade,
        'Carga ficticia Conform Flow segmentada: documento exigido conforme tipo de estabelecimento/segmento.'
      where not exists (
        select 1
        from public.documentos d
        where d.empresa_id = v_empresa.id
          and d.numero_documento = v_doc.codigo || '-' || v_slug || '-2026'
          and d.deleted_at is null
      )
      returning id into v_doc_id;

      if v_doc_id is null then
        select d.id into v_doc_id
        from public.documentos d
        where d.empresa_id = v_empresa.id
          and d.numero_documento = v_doc.codigo || '-' || v_slug || '-2026'
          and d.deleted_at is null
        limit 1;
      end if;

      insert into public.anexos (
        empresa_id,
        modulo,
        registro_id,
        finalidade,
        storage_path,
        nome_original,
        mime_type,
        tamanho_bytes,
        versao,
        status
      )
      values (
        v_empresa.id,
        'documentos',
        v_doc_id,
        'principal',
        v_empresa.id::text || '/documentos/' || v_doc_id::text || '/' || v_doc.arquivo,
        v_doc.arquivo,
        'application/pdf',
        v_doc.tamanho_bytes,
        1,
        'ativo'
      )
      on conflict (storage_path) do update set
        nome_original = excluded.nome_original,
        mime_type = excluded.mime_type,
        tamanho_bytes = excluded.tamanho_bytes,
        status = 'ativo',
        deleted_at = null,
        updated_at = now();

      v_doc_id := null;
    end loop;
  end loop;
end $$;
