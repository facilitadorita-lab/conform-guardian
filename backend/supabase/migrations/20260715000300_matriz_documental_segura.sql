-- Conform Flow — base segura da matriz documental por segmento.
-- Esta migration cria apenas a tabela/modelos e a função de chaves.
-- Não limpa nem altera documentos/anexos já cadastrados pelos clientes.

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
  ('comum', null, 'AVCB - Auto de Vistoria do Corpo de Bombeiros', 'AVCB', 'Certificado', 'Corpo de Bombeiros', 12, 'Administrativo', 'Exigencia comum para estabelecimentos fisicos; deve ser validada conforme regra local.'),
  ('comum', null, 'Licenca de Funcionamento', 'Licenca de funcionamento', 'Licenca', 'Prefeitura Municipal', 12, 'Administrativo', 'Exigencia municipal comum; pode variar por cidade e atividade.'),
  ('comum', null, 'Contrato de Controle de Pragas', 'Controle de pragas', 'Contrato', 'Fornecedor homologado', 12, 'Operacoes', 'Evidencia operacional comum para ambiente fisico.'),

  ('clinica', 'Clinica', 'Alvara Sanitario da Clinica', 'Alvara sanitario', 'Licenca', 'Vigilancia Sanitaria', 12, 'Qualidade', 'Aplicavel a clinicas, consultorios e centros medicos.'),
  ('clinica', 'Clinica', 'CNES - Cadastro Nacional de Estabelecimento de Saude', 'Licenca de funcionamento', 'Documento', 'Ministerio da Saude', 12, 'Administrativo', 'Aplicavel a servicos de saude quando exigido.'),
  ('clinica', 'Clinica', 'Registro do Responsavel Tecnico - CRM/COREN', 'Certificado', 'Documento', 'Conselho Profissional', 12, 'Qualidade', 'Varia conforme atividade e conselho responsavel.'),
  ('clinica', 'Clinica', 'PGRSS - Servicos de Saude', 'Contrato de residuos', 'Procedimento', 'Responsavel Tecnico', 12, 'Qualidade', 'Plano de residuos especifico para servico de saude.'),

  ('laboratorio', 'Laboratorio', 'Licenca Sanitaria do Laboratorio', 'Alvara sanitario', 'Licenca', 'Vigilancia Sanitaria', 12, 'Qualidade', 'Aplicavel a laboratorios clinicos, analiticos e tecnicos.'),
  ('laboratorio', 'Laboratorio', 'Registro do Responsavel Tecnico Laboratorial', 'Certificado', 'Documento', 'Conselho Profissional', 12, 'Qualidade', 'CRBM/CRF/CRM/CREA conforme escopo.'),
  ('laboratorio', 'Laboratorio', 'Controle Externo de Qualidade', 'Certificado', 'Certificado', 'Provedor de ensaio de proficiencia', 12, 'Qualidade', 'Exigencia tipica para rotina laboratorial.'),
  ('laboratorio', 'Laboratorio', 'Procedimento de Coleta e Transporte de Amostras', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Operacoes', 'Procedimento especifico do laboratorio.'),
  ('laboratorio', 'Laboratorio', 'PGRSS Laboratorial', 'Contrato de residuos', 'Procedimento', 'Responsavel Tecnico', 12, 'Qualidade', 'Plano de residuos especifico para laboratorio.'),

  ('farmaceutico', 'Farmacia/Distribuidora', 'AFE - Autorizacao de Funcionamento ANVISA', 'Licenca de funcionamento', 'Autorizacao', 'ANVISA', 12, 'Regulatorio', 'Documento especifico para operacao farmaceutica quando aplicavel.'),
  ('farmaceutico', 'Farmacia/Distribuidora', 'Licenca Sanitaria Farmaceutica', 'Alvara sanitario', 'Licenca', 'Vigilancia Sanitaria', 12, 'Regulatorio', 'Aplicavel a farmacias, drogarias e distribuidoras conforme escopo.'),
  ('farmaceutico', 'Farmacia/Distribuidora', 'Certidao de Regularidade Tecnica - CRF', 'Certificado', 'Certificado', 'CRF', 12, 'Regulatorio', 'Documento especifico de responsabilidade farmaceutica.'),
  ('farmaceutico', 'Farmacia/Distribuidora', 'Manual de Boas Praticas Farmaceuticas', 'Manual operacional', 'Manual', 'Qualidade Interna', null, 'Qualidade', 'Manual especifico para rotina farmaceutica.'),
  ('farmaceutico', 'Farmacia/Distribuidora', 'Controle de Temperatura e Umidade', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Operacoes', 'Evidencia essencial para armazenamento de medicamentos/produtos sensiveis.'),
  ('farmaceutico', 'Farmacia/Distribuidora', 'Qualificacao de Transporte ou Cadeia Fria', 'Certificado', 'Relatorio', 'Qualidade Interna', 12, 'Operacoes', 'Aplicavel quando ha transporte/armazenagem controlada.'),

  ('odontologia', 'Clinica odontologica', 'Alvara Sanitario Odontologico', 'Alvara sanitario', 'Licenca', 'Vigilancia Sanitaria', 12, 'Regulatorio', 'Aplicavel a servicos odontologicos.'),
  ('odontologia', 'Clinica odontologica', 'Registro do Responsavel Tecnico - CRO', 'Certificado', 'Documento', 'CRO', 12, 'Regulatorio', 'Responsabilidade tecnica odontologica.'),
  ('odontologia', 'Clinica odontologica', 'Controle de Esterilizacao de Instrumentais', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'CME', 'Rotina critica para odontologia.'),

  ('imagem', 'Diagnostico por imagem', 'Licenca Sanitaria para Diagnostico por Imagem', 'Alvara sanitario', 'Licenca', 'Vigilancia Sanitaria', 12, 'Regulatorio', 'Aplicavel a servicos de imagem.'),
  ('imagem', 'Diagnostico por imagem', 'Programa de Protecao Radiologica', 'Manual operacional', 'Procedimento', 'Responsavel Tecnico', 12, 'Qualidade', 'Aplicavel quando houver radiacao ionizante.'),
  ('imagem', 'Diagnostico por imagem', 'Controle de Qualidade dos Equipamentos de Imagem', 'Certificado', 'Relatorio', 'Fornecedor homologado', 12, 'Engenharia Clinica', 'Evidencia especifica para equipamentos de imagem.'),

  ('cadeia_fria', 'Cadeia fria', 'Licenca Sanitaria para Armazenagem', 'Alvara sanitario', 'Licenca', 'Vigilancia Sanitaria', 12, 'Regulatorio', 'Aplicavel a armazenagem sensivel.'),
  ('cadeia_fria', 'Cadeia fria', 'Mapeamento Termico de Area/Equipamento', 'Certificado', 'Relatorio', 'Qualidade Interna', 12, 'Qualidade', 'Evidencia tipica para cadeia fria.'),
  ('cadeia_fria', 'Cadeia fria', 'Plano de Contingencia de Falha de Temperatura', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Operacoes', 'Rotina critica para armazenamento termico.'),

  ('biologico', 'Banco biologico/Biotecnologia', 'Licenca Sanitaria para Material Biologico', 'Alvara sanitario', 'Licenca', 'Vigilancia Sanitaria', 12, 'Regulatorio', 'Aplicavel a biobancos, biotecnologia e pesquisa.'),
  ('biologico', 'Banco biologico/Biotecnologia', 'Plano de Biosseguranca', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Qualidade', 'Controle de risco biologico.'),
  ('biologico', 'Banco biologico/Biotecnologia', 'Rastreabilidade de Amostras Biologicas', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Operacoes', 'Documento operacional especifico.'),

  ('alimentos', 'Laboratorio de alimentos', 'Licenca Sanitaria para Laboratorio de Alimentos', 'Alvara sanitario', 'Licenca', 'Vigilancia Sanitaria', 12, 'Regulatorio', 'Aplicavel a laboratorios de alimentos.'),
  ('alimentos', 'Laboratorio de alimentos', 'POP de Amostragem e Ensaios de Alimentos', 'Manual operacional', 'Procedimento', 'Qualidade Interna', null, 'Qualidade', 'Procedimento especifico de alimentos.')
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
     or v_tipo like '%farmacia%'
     or v_tipo like '%farmácia%'
     or v_segmento like '%farmac%' then
    v_chaves := array_append(v_chaves, 'farmaceutico');
  end if;

  if v_tipo like '%laboratorio%'
     or v_tipo like '%laboratório%'
     or v_segmento like '%analises%'
     or v_segmento like '%análises%'
     or v_segmento like '%hematologia%'
     or v_segmento like '%imunologia%'
     or v_segmento like '%patologia%'
     or v_segmento like '%diagnostico%'
     or v_segmento like '%diagnóstico%'
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
     or v_segmento like '%armazenamento termico%'
     or v_segmento like '%armazenamento térmico%' then
    v_chaves := array_append(v_chaves, 'cadeia_fria');
  end if;

  if v_tipo like '%banco biologico%'
     or v_tipo like '%banco biológico%'
     or v_segmento like '%biotecnologia%'
     or v_segmento like '%biologico%'
     or v_segmento like '%biológico%' then
    v_chaves := array_append(v_chaves, 'biologico');
  end if;

  if v_segmento like '%alimentos%' then
    v_chaves := array_append(v_chaves, 'alimentos');
  end if;

  if v_tipo like '%clinica%'
     or v_tipo like '%clínica%'
     or v_tipo like '%centro medico%'
     or v_tipo like '%centro médico%'
     or v_segmento like '%saude%'
     or v_segmento like '%saúde%'
     or v_segmento like '%cardiologia%'
     or v_segmento like '%neurologia%'
     or v_segmento like '%dermatologia%'
     or v_segmento like '%gastro%'
     or v_segmento like '%oftalmo%'
     or v_segmento like '%preventiva%'
     or v_segmento like '%oncologia%'
     or v_segmento like '%imunizacao%'
     or v_segmento like '%imunização%' then
    v_chaves := array_append(v_chaves, 'clinica');
  end if;

  return array(select distinct unnest(v_chaves));
end $$;

revoke all on function public.segmento_documental_chaves(text,text) from public, anon;
grant execute on function public.segmento_documental_chaves(text,text) to authenticated;
