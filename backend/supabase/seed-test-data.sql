-- Conform Flow - dados ficticios para testes de plataforma
-- Idempotente: pode rodar novamente sem duplicar os principais registros.

create or replace function public.validate_company_relationships()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare linked_empresa uuid;
begin
  if tg_table_name in ('calibracoes','qualificacoes') then
    select empresa_id into linked_empresa from public.equipamentos where id = new.equipamento_id and deleted_at is null;
    if linked_empresa is null or linked_empresa <> new.empresa_id then
      raise exception 'Equipamento não pertence à empresa informada';
    end if;
  end if;

  if tg_table_name = 'manutencoes' then
    if new.equipamento_id is not null then
      select empresa_id into linked_empresa from public.equipamentos where id = new.equipamento_id and deleted_at is null;
      if linked_empresa is null or linked_empresa <> new.empresa_id then
        raise exception 'Equipamento não pertence à empresa informada';
      end if;
    end if;
  end if;

  if tg_table_name = 'documentos' then
    if new.categoria_id is not null then
      select empresa_id into linked_empresa from public.categorias_documentos where id = new.categoria_id and deleted_at is null;
      if linked_empresa is not null and linked_empresa <> new.empresa_id then
        raise exception 'Categoria não pertence à empresa informada';
      end if;
    end if;

    if new.tipo_documento_id is not null then
      select empresa_id into linked_empresa from public.tipos_documentos where id = new.tipo_documento_id and deleted_at is null;
      if linked_empresa is not null and linked_empresa <> new.empresa_id then
        raise exception 'Tipo de documento não pertence à empresa informada';
      end if;
    end if;
  end if;

  if tg_table_name = 'equipamentos' then
    if new.tipo_equipamento_id is not null then
      select empresa_id into linked_empresa from public.tipos_equipamentos where id = new.tipo_equipamento_id and deleted_at is null;
      if linked_empresa is not null and linked_empresa <> new.empresa_id then
        raise exception 'Tipo de equipamento não pertence à empresa informada';
      end if;
    end if;
  end if;

  return new;
end
$fn$;

do $$
declare
  v_admin_id uuid := 'ea8818d0-ddac-4d5e-91ff-54b59fe1e10d';
  v_plano_id uuid;
  v_clinica_id uuid;
  v_laboratorio_id uuid;
  v_tipo_refrigeracao uuid;
  v_tipo_balanca uuid;
  v_tipo_termometro uuid;
  v_tipo_generico uuid;
begin
  select id into v_plano_id
  from public.planos
  where nome = 'Enterprise'
  limit 1;

  if v_plano_id is null then
    select id into v_plano_id
    from public.planos
    order by created_at desc
    limit 1;
  end if;

  update public.planos
  set recursos = recursos || jsonb_build_object(
    'documentos', true,
    'equipamentos', true,
    'calibracoes', true,
    'qualificacoes', true,
    'manutencoes', true,
    'pendencias', true,
    'alertas', true,
    'relatorios', true,
    'auditoria', true,
    'usuarios', true,
    'anexos', true,
    'multi_unidades', true,
    'suporte_prioritario', true
  )
  where id = v_plano_id;

  insert into public.empresas (
    razao_social, nome_fantasia, cnpj, tipo_estabelecimento, segmento,
    cidade, estado, email_principal, responsavel_legal, responsavel_tecnico,
    plano_id, status, observacoes
  )
  values
    (
      'Clinica Vitalis Ltda',
      'Clinica Vitalis Ltda.',
      '12.345.678/0001-90',
      'Clinica',
      'Saude',
      'Sao Paulo',
      'SP',
      'contato@clinicavitalis.test',
      'Dra. Ana Vitalis',
      'Dra. Camila Rocha',
      v_plano_id,
      'ativa',
      'Empresa ficticia para testes do Conform Flow.'
    ),
    (
      'Laboratorio Horizonte Ltda',
      'Laboratorio Horizonte',
      '23.456.789/0001-01',
      'Laboratorio',
      'Analises clinicas',
      'Campinas',
      'SP',
      'qualidade@horizonte.test',
      'Marcos Lima',
      'Biom. Paula Neves',
      v_plano_id,
      'ativa',
      'Empresa ficticia para testes de isolamento multiempresa.'
    )
  on conflict (cnpj) do update set
    nome_fantasia = excluded.nome_fantasia,
    plano_id = excluded.plano_id,
    status = excluded.status,
    updated_at = now();

  select id into v_clinica_id
  from public.empresas
  where cnpj = '12.345.678/0001-90';

  select id into v_laboratorio_id
  from public.empresas
  where cnpj = '23.456.789/0001-01';

  insert into public.usuarios_empresas (usuario_id, empresa_id, perfil, ativo)
  values
    (v_admin_id, v_clinica_id, 'administrador', true),
    (v_admin_id, v_laboratorio_id, 'administrador', true)
  on conflict (usuario_id, empresa_id) do update set
    perfil = excluded.perfil,
    ativo = true,
    deleted_at = null,
    updated_at = now();

  select id into v_tipo_generico
  from public.tipos_equipamentos
  where ativo and deleted_at is null
  order by padrao_plataforma desc, nome
  limit 1;

  select coalesce(
    (select id from public.tipos_equipamentos where ativo and deleted_at is null and nome ilike '%frig%' limit 1),
    v_tipo_generico
  ) into v_tipo_refrigeracao;

  select coalesce(
    (select id from public.tipos_equipamentos where ativo and deleted_at is null and (nome ilike '%balan%' or nome ilike '%balan%') limit 1),
    v_tipo_generico
  ) into v_tipo_balanca;

  select coalesce(
    (select id from public.tipos_equipamentos where ativo and deleted_at is null and nome ilike '%term%' limit 1),
    v_tipo_generico
  ) into v_tipo_termometro;

  insert into public.equipamentos (
    id, empresa_id, nome, tipo_equipamento_id, codigo_interno, numero_serie,
    fabricante, modelo, setor, localizacao, criticidade, status, observacoes
  )
  values
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      v_clinica_id,
      'Geladeira 01',
      v_tipo_refrigeracao,
      'EQ-VIT-001',
      'GLD-2026-001',
      'Elber',
      'CSV 280',
      'Sala de Vacinas',
      'Unidade Centro',
      'critica',
      'ativo',
      'Armazenamento de vacinas. Teste: calibracao vencida.'
    ),
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      v_clinica_id,
      'Balanca BL-04',
      v_tipo_balanca,
      'EQ-VIT-002',
      'BAL-8842',
      'Marte',
      'AD500',
      'Manipulacao',
      'Sala tecnica',
      'alta',
      'ativo',
      'Teste: calibracao vence em 15 dias.'
    ),
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      v_clinica_id,
      'Termometro Digital TD-02',
      v_tipo_termometro,
      'EQ-VIT-003',
      'TD-2044',
      'Incoterm',
      '7663',
      'Sala de Vacinas',
      'Geladeira 01',
      'alta',
      'ativo',
      'Teste: calibracao em dia.'
    ),
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      v_clinica_id,
      'Autoclave AC-01',
      v_tipo_generico,
      'EQ-VIT-004',
      'AUTO-991',
      'Cristofoli',
      'Vitale 21',
      'Esterilizacao',
      'Expurgo',
      'critica',
      'em_manutencao',
      'Teste: equipamento em manutencao corretiva.'
    ),
    (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      v_laboratorio_id,
      'Centrifuga CT-01',
      v_tipo_generico,
      'EQ-HOR-001',
      'CENT-1102',
      'Eppendorf',
      '5702',
      'Analises',
      'Bancada 02',
      'alta',
      'ativo',
      'Equipamento de outra empresa para teste de isolamento.'
    )
  on conflict (empresa_id, codigo_interno) do update set
    nome = excluded.nome,
    tipo_equipamento_id = excluded.tipo_equipamento_id,
    numero_serie = excluded.numero_serie,
    fabricante = excluded.fabricante,
    modelo = excluded.modelo,
    setor = excluded.setor,
    localizacao = excluded.localizacao,
    criticidade = excluded.criticidade,
    status = excluded.status,
    observacoes = excluded.observacoes,
    deleted_at = null,
    updated_at = now();

  insert into public.calibracoes (
    id, empresa_id, equipamento_id, data_calibracao, data_vencimento,
    numero_certificado, laboratorio_responsavel, resultado, observacoes
  )
  values
    (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      v_clinica_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      current_date - interval '13 months',
      current_date - interval '10 days',
      'CAL-VIT-001',
      'LabCal Metrologia',
      'aprovado',
      'Ficticio: vencida para teste de IA.'
    ),
    (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
      v_clinica_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      current_date - interval '11 months',
      current_date + interval '15 days',
      'CAL-VIT-002',
      'MetroCheck',
      'aprovado',
      'Ficticio: vence em 15 dias.'
    ),
    (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      v_clinica_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      current_date - interval '3 months',
      current_date + interval '9 months',
      'CAL-VIT-003',
      'LabCal Metrologia',
      'aprovado',
      'Ficticio: em dia.'
    ),
    (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
      v_clinica_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      current_date - interval '8 months',
      current_date + interval '45 days',
      'CAL-VIT-004',
      'QualiMed',
      'aprovado_restricao',
      'Ficticio: atencao por restricao.'
    ),
    (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      v_laboratorio_id,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      current_date - interval '14 months',
      current_date - interval '35 days',
      'CAL-HOR-001',
      'Lab Horizonte',
      'aprovado',
      'Ficticio: dado de outra empresa.'
    )
  on conflict (empresa_id, numero_certificado) do update set
    equipamento_id = excluded.equipamento_id,
    data_calibracao = excluded.data_calibracao,
    data_vencimento = excluded.data_vencimento,
    laboratorio_responsavel = excluded.laboratorio_responsavel,
    resultado = excluded.resultado,
    observacoes = excluded.observacoes,
    deleted_at = null,
    updated_at = now();

  insert into public.qualificacoes (
    id, empresa_id, equipamento_id, tipo, data_qualificacao, data_vencimento,
    resultado, empresa_executora, observacoes
  )
  values
    (
      '99999999-9999-4999-8999-999999999991',
      v_clinica_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'mapeamento_termico',
      current_date - interval '11 months',
      current_date + interval '20 days',
      'aprovado',
      'QualiTemp',
      'Ficticio: qualificacao termica vence em 20 dias.'
    ),
    (
      '99999999-9999-4999-8999-999999999992',
      v_clinica_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      'operacao',
      current_date - interval '14 months',
      current_date - interval '20 days',
      'aprovado',
      'ValidaMed',
      'Ficticio: qualificacao vencida.'
    )
  on conflict (id) do update set
    data_qualificacao = excluded.data_qualificacao,
    data_vencimento = excluded.data_vencimento,
    resultado = excluded.resultado,
    empresa_executora = excluded.empresa_executora,
    observacoes = excluded.observacoes,
    deleted_at = null,
    updated_at = now();

  insert into public.documentos (
    id, empresa_id, nome, numero_documento, orgao_emissor, data_emissao,
    data_vencimento, periodicidade_meses, exige_anexo, setor_unidade, observacoes
  )
  values
    (
      '77777777-7777-4777-8777-777777777771',
      v_clinica_id,
      'AVCB - Auto de Vistoria do Corpo de Bombeiros',
      'AVCB-2026-VIT-001',
      'Corpo de Bombeiros SP',
      current_date - interval '11 months',
      current_date + interval '28 days',
      12,
      false,
      'Unidade Centro',
      'Ficticio: AVCB vence em 28 dias.'
    ),
    (
      '77777777-7777-4777-8777-777777777772',
      v_clinica_id,
      'Licenca Sanitaria',
      'LS-2026-VIT-002',
      'Vigilancia Sanitaria',
      current_date - interval '13 months',
      current_date - interval '5 days',
      12,
      false,
      'Unidade Centro',
      'Ficticio: licenca sanitaria vencida.'
    ),
    (
      '77777777-7777-4777-8777-777777777773',
      v_clinica_id,
      'Contrato de Controle de Pragas',
      'CP-2026-VIT-003',
      'Fornecedor Externo',
      current_date - interval '2 months',
      current_date + interval '55 days',
      6,
      false,
      'Todas as areas',
      'Ficticio: contrato em atencao.'
    ),
    (
      '88888888-8888-4888-8888-888888888881',
      v_laboratorio_id,
      'AVCB - Auto de Vistoria do Corpo de Bombeiros',
      'AVCB-2026-HOR-001',
      'Corpo de Bombeiros SP',
      current_date - interval '15 months',
      current_date - interval '45 days',
      12,
      false,
      'Unidade Campinas',
      'Ficticio: AVCB de outra empresa, usado para testar isolamento.'
    )
  on conflict (id) do update set
    nome = excluded.nome,
    numero_documento = excluded.numero_documento,
    orgao_emissor = excluded.orgao_emissor,
    data_emissao = excluded.data_emissao,
    data_vencimento = excluded.data_vencimento,
    periodicidade_meses = excluded.periodicidade_meses,
    exige_anexo = excluded.exige_anexo,
    setor_unidade = excluded.setor_unidade,
    observacoes = excluded.observacoes,
    deleted_at = null,
    updated_at = now();

  insert into public.manutencoes (
    id, empresa_id, equipamento_id, nome_servico, natureza, tipo_servico,
    status_execucao, data_manutencao, proxima_manutencao, periodicidade_meses,
    empresa_responsavel, tecnico_responsavel, prioridade, falha_apresentada,
    diagnostico, causa_raiz, acao_realizada, observacoes
  )
  values
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
      v_clinica_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'Preventiva refrigerador',
      'preventiva',
      'inspecao',
      'programada',
      current_date - interval '6 months',
      current_date + interval '7 days',
      6,
      'TecFrio',
      'Joao Mendes',
      'alta',
      null,
      null,
      null,
      null,
      'Ficticio: proxima manutencao em 7 dias.'
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
      v_clinica_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      'Correcao falha de pressao',
      'corretiva',
      'reparo',
      'em_andamento',
      current_date,
      null,
      null,
      'Autoclave Service',
      'Rafael Souza',
      'critica',
      'Oscilacao de pressao durante ciclo.',
      'Valvula com desgaste.',
      'Uso acima da periodicidade recomendada.',
      'Troca de valvula em andamento.',
      'Ficticio: corretiva critica.'
    )
  on conflict (id) do update set
    status_execucao = excluded.status_execucao,
    data_manutencao = excluded.data_manutencao,
    proxima_manutencao = excluded.proxima_manutencao,
    prioridade = excluded.prioridade,
    observacoes = excluded.observacoes,
    deleted_at = null,
    updated_at = now();

  insert into public.anexos (
    id, empresa_id, modulo, registro_id, finalidade, storage_path,
    nome_original, mime_type, tamanho_bytes, versao, status
  )
  values
    (
      '12121212-1212-4121-8121-121212121211',
      v_clinica_id,
      'calibracoes',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      'certificado',
      v_clinica_id || '/calibracoes/cccccccc-cccc-4ccc-8ccc-ccccccccccc1/certificado-ficticio-cal-vit-001.pdf',
      'certificado-ficticio-cal-vit-001.pdf',
      'application/pdf',
      1024,
      1,
      'ativo'
    ),
    (
      '12121212-1212-4121-8121-121212121212',
      v_clinica_id,
      'calibracoes',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
      'certificado',
      v_clinica_id || '/calibracoes/cccccccc-cccc-4ccc-8ccc-ccccccccccc2/certificado-ficticio-cal-vit-002.pdf',
      'certificado-ficticio-cal-vit-002.pdf',
      'application/pdf',
      1024,
      1,
      'ativo'
    ),
    (
      '12121212-1212-4121-8121-121212121213',
      v_clinica_id,
      'calibracoes',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      'certificado',
      v_clinica_id || '/calibracoes/cccccccc-cccc-4ccc-8ccc-ccccccccccc3/certificado-ficticio-cal-vit-003.pdf',
      'certificado-ficticio-cal-vit-003.pdf',
      'application/pdf',
      1024,
      1,
      'ativo'
    ),
    (
      '12121212-1212-4121-8121-121212121214',
      v_clinica_id,
      'calibracoes',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
      'certificado',
      v_clinica_id || '/calibracoes/cccccccc-cccc-4ccc-8ccc-ccccccccccc4/certificado-ficticio-cal-vit-004.pdf',
      'certificado-ficticio-cal-vit-004.pdf',
      'application/pdf',
      1024,
      1,
      'ativo'
    ),
    (
      '13131313-1313-4131-8131-131313131311',
      v_clinica_id,
      'qualificacoes',
      '99999999-9999-4999-8999-999999999991',
      'relatorio',
      v_clinica_id || '/qualificacoes/99999999-9999-4999-8999-999999999991/relatorio-ficticio-geladeira-01.pdf',
      'relatorio-ficticio-geladeira-01.pdf',
      'application/pdf',
      1024,
      1,
      'ativo'
    ),
    (
      '13131313-1313-4131-8131-131313131312',
      v_clinica_id,
      'qualificacoes',
      '99999999-9999-4999-8999-999999999992',
      'relatorio',
      v_clinica_id || '/qualificacoes/99999999-9999-4999-8999-999999999992/relatorio-ficticio-autoclave.pdf',
      'relatorio-ficticio-autoclave.pdf',
      'application/pdf',
      1024,
      1,
      'ativo'
    ),
    (
      '14141414-1414-4141-8141-141414141411',
      v_clinica_id,
      'manutencoes',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
      'principal',
      v_clinica_id || '/manutencoes/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1/evidencia-ficticia-preventiva.pdf',
      'evidencia-ficticia-preventiva.pdf',
      'application/pdf',
      1024,
      1,
      'ativo'
    )
  on conflict (id) do update set
    storage_path = excluded.storage_path,
    nome_original = excluded.nome_original,
    mime_type = excluded.mime_type,
    tamanho_bytes = excluded.tamanho_bytes,
    status = 'ativo',
    deleted_at = null,
    updated_at = now();
end $$;

select
  e.nome_fantasia as empresa,
  (select count(*) from public.equipamentos x where x.empresa_id = e.id and x.deleted_at is null) as equipamentos,
  (select count(*) from public.calibracoes x where x.empresa_id = e.id and x.deleted_at is null) as calibracoes,
  (select count(*) from public.qualificacoes x where x.empresa_id = e.id and x.deleted_at is null) as qualificacoes,
  (select count(*) from public.documentos x where x.empresa_id = e.id and x.deleted_at is null) as documentos,
  (select count(*) from public.manutencoes x where x.empresa_id = e.id and x.deleted_at is null) as manutencoes
from public.empresas e
where e.id in (
  (select id from public.empresas where cnpj = '12.345.678/0001-90'),
  (select id from public.empresas where cnpj = '23.456.789/0001-01')
)
order by e.nome_fantasia;
