-- Conform Flow — 30 empresas fictícias para teste multiempresa.
-- Idempotente: pode rodar novamente sem duplicar empresas, assinaturas ou vínculos.
-- Segurança: usuários comuns continuam acessando apenas empresas vinculadas em usuarios_empresas.
-- Admin Master continua com acesso global via public.is_master()/public.has_company_access().

do $$
declare
  v_admin_id uuid := 'ea8818d0-ddac-4d5e-91ff-54b59fe1e10d';
  v_plano_enterprise uuid;
  v_plano_professional uuid;
begin
  select id into v_plano_enterprise
  from public.planos
  where lower(nome) = 'enterprise'
  limit 1;

  select id into v_plano_professional
  from public.planos
  where lower(nome) in ('professional', 'pro')
  order by nome
  limit 1;

  v_plano_enterprise := coalesce(
    v_plano_enterprise,
    v_plano_professional,
    (select id from public.planos where ativo order by created_at desc limit 1)
  );

  v_plano_professional := coalesce(v_plano_professional, v_plano_enterprise);

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
  values
    ('Alpha Saúde Integrada Ltda', 'Alpha Saúde Integrada', '90.000.001/0001-01', 'Clínica', 'Saúde', 'São Paulo', 'SP', 'qualidade@alphasaude.test', 'Renata Moreira', 'Dra. Helena Martins', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('BioPrime Diagnósticos Ltda', 'BioPrime Diagnósticos', '90.000.002/0001-02', 'Laboratório', 'Análises clínicas', 'Campinas', 'SP', 'qualidade@bioprime.test', 'Eduardo Lima', 'Biom. Lucas Andrade', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('VitaCore Clínica Médica Ltda', 'VitaCore Clínica Médica', '90.000.003/0001-03', 'Clínica', 'Saúde ocupacional', 'Ribeirão Preto', 'SP', 'qualidade@vitacore.test', 'Mariana Costa', 'Dra. Laura Farias', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('LabNorte Controle Analítico Ltda', 'LabNorte Controle Analítico', '90.000.004/0001-04', 'Laboratório', 'Controle de qualidade', 'Belém', 'PA', 'qualidade@labnorte.test', 'Rafael Nogueira', 'Farm. Paula Reis', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('MedSul Serviços Clínicos Ltda', 'MedSul Serviços Clínicos', '90.000.005/0001-05', 'Clínica', 'Medicina diagnóstica', 'Porto Alegre', 'RS', 'qualidade@medsul.test', 'Juliana Vargas', 'Dra. Beatriz Ramos', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('OncoLife Instituto de Saúde Ltda', 'OncoLife Instituto de Saúde', '90.000.006/0001-06', 'Instituto', 'Oncologia', 'Curitiba', 'PR', 'qualidade@oncolife.test', 'Fernando Silveira', 'Dr. Renato Paiva', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('ClinMais Atendimento Integrado Ltda', 'ClinMais Atendimento Integrado', '90.000.007/0001-07', 'Clínica', 'Atendimento ambulatorial', 'Belo Horizonte', 'MG', 'qualidade@clinmais.test', 'Patrícia Melo', 'Dra. Camila Torres', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('HematoCare Diagnósticos Ltda', 'HematoCare Diagnósticos', '90.000.008/0001-08', 'Laboratório', 'Hematologia', 'Goiânia', 'GO', 'qualidade@hematocare.test', 'Sérgio Batista', 'Biom. André Lopes', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('ImunoLab Pesquisa Clínica Ltda', 'ImunoLab Pesquisa Clínica', '90.000.009/0001-09', 'Laboratório', 'Imunologia', 'Recife', 'PE', 'qualidade@imunolab.test', 'Larissa Duarte', 'Dra. Mirela Azevedo', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('CardioPlus Centro Médico Ltda', 'CardioPlus Centro Médico', '90.000.010/0001-10', 'Clínica', 'Cardiologia', 'Rio de Janeiro', 'RJ', 'qualidade@cardioplus.test', 'Ricardo Almeida', 'Dr. Daniel Barbosa', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('NeuroVita Clínica Especializada Ltda', 'NeuroVita Clínica Especializada', '90.000.011/0001-11', 'Clínica', 'Neurologia', 'Florianópolis', 'SC', 'qualidade@neurovita.test', 'Aline Moraes', 'Dra. Sofia Mendes', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('SafePharma Controle Sanitário Ltda', 'SafePharma Controle Sanitário', '90.000.012/0001-12', 'Distribuidora', 'Farmacêutico', 'Guarulhos', 'SP', 'qualidade@safepharma.test', 'César Rocha', 'Farm. Tiago Cunha', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('NutriLab Análises Técnicas Ltda', 'NutriLab Análises Técnicas', '90.000.013/0001-13', 'Laboratório', 'Alimentos', 'Joinville', 'SC', 'qualidade@nutrilab.test', 'Vanessa Pires', 'Eng. Alim. Joana Matos', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('Dermaclin Saúde Estética Ltda', 'Dermaclin Saúde Estética', '90.000.014/0001-14', 'Clínica', 'Dermatologia', 'Fortaleza', 'CE', 'qualidade@dermaclin.test', 'Marcelo Teixeira', 'Dra. Elisa Duarte', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('OdontoPrime Especialidades Ltda', 'OdontoPrime Especialidades', '90.000.015/0001-15', 'Clínica', 'Odontologia', 'Salvador', 'BA', 'qualidade@odontoprime.test', 'Priscila Araújo', 'Dra. Vanessa Lima', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('MegaLab Diagnóstico Avançado Ltda', 'MegaLab Diagnóstico Avançado', '90.000.016/0001-16', 'Laboratório', 'Diagnóstico avançado', 'São José dos Campos', 'SP', 'qualidade@megalab.test', 'Gustavo Leal', 'Biom. Felipe Braga', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('QualiMed Gestão Clínica Ltda', 'QualiMed Gestão Clínica', '90.000.017/0001-17', 'Clínica', 'Gestão clínica', 'Uberlândia', 'MG', 'qualidade@qualimed.test', 'Simone Nunes', 'Dra. Natália Souza', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('ThermoCare Banco Biológico Ltda', 'ThermoCare Banco Biológico', '90.000.018/0001-18', 'Banco biológico', 'Armazenamento térmico', 'Maringá', 'PR', 'qualidade@thermocare.test', 'Alexandre Gama', 'Biom. Roberta Salles', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('CitoLab Patologia Ltda', 'CitoLab Patologia', '90.000.019/0001-19', 'Laboratório', 'Patologia', 'Vitória', 'ES', 'qualidade@citolab.test', 'Daniela Prado', 'Dra. Raquel Campos', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('GastroVita Centro Clínico Ltda', 'GastroVita Centro Clínico', '90.000.020/0001-20', 'Clínica', 'Gastroenterologia', 'Natal', 'RN', 'qualidade@gastrovita.test', 'Leonardo Matias', 'Dr. Hugo Oliveira', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('OftalmoCare Serviços Médicos Ltda', 'OftalmoCare Serviços Médicos', '90.000.021/0001-21', 'Clínica', 'Oftalmologia', 'Santos', 'SP', 'qualidade@oftalmocare.test', 'Letícia Freitas', 'Dra. Amanda Ribeiro', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('RespiraLab Função Pulmonar Ltda', 'RespiraLab Função Pulmonar', '90.000.022/0001-22', 'Laboratório', 'Pneumologia', 'Sorocaba', 'SP', 'qualidade@respiralab.test', 'Henrique Dias', 'Dr. Vitor Neves', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('LifeCheck Medicina Preventiva Ltda', 'LifeCheck Medicina Preventiva', '90.000.023/0001-23', 'Clínica', 'Medicina preventiva', 'Niterói', 'RJ', 'qualidade@lifecheck.test', 'Carolina Martins', 'Dra. Júlia Andrade', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('BioStorage Soluções Frias Ltda', 'BioStorage Soluções Frias', '90.000.024/0001-24', 'Armazenamento', 'Cadeia fria', 'Barueri', 'SP', 'qualidade@biostorage.test', 'Márcio Campos', 'Farm. Carla Ribeiro', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('Centro Médico Nova Era Ltda', 'Centro Médico Nova Era', '90.000.025/0001-25', 'Centro médico', 'Saúde integrada', 'Cuiabá', 'MT', 'qualidade@novaera.test', 'Bruna Assis', 'Dra. Fernanda Castro', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('GenomaLab Biotecnologia Ltda', 'GenomaLab Biotecnologia', '90.000.026/0001-26', 'Laboratório', 'Biotecnologia', 'São Carlos', 'SP', 'qualidade@genomalab.test', 'Pedro Henrique Faria', 'Dra. Luana Batista', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('VaccineCare Imunização Ltda', 'VaccineCare Imunização', '90.000.027/0001-27', 'Clínica', 'Imunização', 'Brasília', 'DF', 'qualidade@vaccinecare.test', 'Helena Fonseca', 'Enf. Marina Lopes', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('UltraMed Diagnóstico por Imagem Ltda', 'UltraMed Diagnóstico por Imagem', '90.000.028/0001-28', 'Clínica', 'Imagem diagnóstica', 'Maceió', 'AL', 'qualidade@ultramed.test', 'André Figueiredo', 'Dr. Paulo Cerqueira', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('Santa Clara Saúde Integrada Ltda', 'Santa Clara Saúde Integrada', '90.000.029/0001-29', 'Clínica', 'Saúde integrada', 'João Pessoa', 'PB', 'qualidade@santaclara.test', 'Fabiana Teles', 'Dra. Marcela Antunes', v_plano_professional, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.'),
    ('QualityBio Laboratório Central Ltda', 'QualityBio Laboratório Central', '90.000.030/0001-30', 'Laboratório', 'Análises clínicas', 'Manaus', 'AM', 'qualidade@qualitybio.test', 'Otávio Carvalho', 'Biom. Caio Pacheco', v_plano_enterprise, 'ativa', 'Empresa fictícia para testes multiempresa do Conform Flow.')
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
    updated_at = now();

  insert into public.usuarios_empresas (usuario_id, empresa_id, perfil, ativo)
  select v_admin_id, e.id, 'administrador', true
  from public.empresas e
  where e.cnpj between '90.000.001/0001-01' and '90.000.030/0001-30'
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
    ultimo_pagamento_em,
    observacoes_internas
  )
  select
    e.id,
    coalesce(e.plano_id, v_plano_professional),
    'ativa',
    'mensal',
    case when e.plano_id = v_plano_enterprise then 89900 else 34900 end,
    case when e.plano_id = v_plano_enterprise then 899000 else 349000 end,
    'BRL',
    current_date + 14,
    current_date + 30,
    current_date - 1,
    'Assinatura fictícia para testes comerciais e financeiros.'
  from public.empresas e
  where e.cnpj between '90.000.001/0001-01' and '90.000.030/0001-30'
  on conflict (empresa_id) do update set
    plano_id = excluded.plano_id,
    status = excluded.status,
    ciclo = excluded.ciclo,
    valor_mensal_centavos = excluded.valor_mensal_centavos,
    valor_anual_centavos = excluded.valor_anual_centavos,
    proximo_vencimento = excluded.proximo_vencimento,
    ultimo_pagamento_em = excluded.ultimo_pagamento_em,
    deleted_at = null,
    updated_at = now();
end $$;
