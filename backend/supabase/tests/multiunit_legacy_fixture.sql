\set ON_ERROR_STOP on

-- Este arquivo é executado deliberadamente antes das migrations de
-- multiunidade. Os UUIDs fixos permitem conferir preservação e backfill depois.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '82000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'legacy-multiunit@test.local',
  '',
  now(),
  now(),
  now(),
  '{}'::jsonb,
  '{}'::jsonb
);

insert into public.usuarios (id, nome, email, status, is_master)
values (
  '82000000-0000-4000-8000-000000000001',
  'Usuário legado multiunidade',
  'legacy-multiunit@test.local',
  'ativo',
  false
);

insert into public.empresas (
  id, razao_social, nome_fantasia, cnpj, status,
  verification_status, access_status, plano_id
)
select
  '82000000-0000-4000-8000-000000000010',
  'Empresa Legada Multiunidade Ltda.',
  'Empresa Legada Multiunidade',
  '82.000.000/0001-10',
  'ativa',
  'verified',
  'active',
  p.id
from public.planos p
where p.codigo = 'rede'
limit 1;

insert into public.usuarios_empresas (usuario_id, empresa_id, perfil, ativo)
values (
  '82000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000010',
  'administrador',
  true
);

insert into public.documentos (
  id, empresa_id, nome, numero_documento, exige_anexo, setor_unidade
) values (
  '82000000-0000-4000-8000-000000000020',
  '82000000-0000-4000-8000-000000000010',
  'Documento legado com setor',
  'LEGACY-DOC-001',
  false,
  'Operação histórica'
);

insert into public.equipamentos (
  id, empresa_id, nome, codigo_interno, setor, criticidade
) values (
  '82000000-0000-4000-8000-000000000030',
  '82000000-0000-4000-8000-000000000010',
  'Equipamento legado',
  'LEGACY-EQ-001',
  'Operação histórica',
  'alta'
);

insert into public.calibracoes (
  id, empresa_id, equipamento_id, data_calibracao, data_vencimento,
  numero_certificado, resultado
) values (
  '82000000-0000-4000-8000-000000000040',
  '82000000-0000-4000-8000-000000000010',
  '82000000-0000-4000-8000-000000000030',
  current_date - 30,
  current_date + 335,
  'LEGACY-CAL-001',
  'aprovado'
);

insert into public.qualificacoes (
  id, empresa_id, equipamento_id, tipo, data_qualificacao,
  data_vencimento, resultado
) values (
  '82000000-0000-4000-8000-000000000050',
  '82000000-0000-4000-8000-000000000010',
  '82000000-0000-4000-8000-000000000030',
  'operacao',
  current_date - 20,
  current_date + 345,
  'aprovado'
);

insert into public.manutencoes (
  id, empresa_id, equipamento_id, nome_servico, natureza,
  tipo_servico, status_execucao, data_manutencao, exige_evidencia
) values (
  '82000000-0000-4000-8000-000000000060',
  '82000000-0000-4000-8000-000000000010',
  '82000000-0000-4000-8000-000000000030',
  'Preventiva legada',
  'preventiva',
  'inspecao',
  'concluida',
  current_date - 10,
  false
);

insert into public.pendencias (
  id, empresa_id, modulo, registro_id, tipo, titulo, status
) values (
  '82000000-0000-4000-8000-000000000070',
  '82000000-0000-4000-8000-000000000010',
  'documentos',
  '82000000-0000-4000-8000-000000000020',
  'validade',
  'Pendência legada',
  'pendente'
);

insert into public.anexos (
  id, empresa_id, modulo, registro_id, finalidade, storage_path,
  nome_original, mime_type, tamanho_bytes, status
) values (
  '82000000-0000-4000-8000-000000000080',
  '82000000-0000-4000-8000-000000000010',
  'documentos',
  '82000000-0000-4000-8000-000000000020',
  'principal',
  'legacy/documentos/LEGACY-DOC-001.pdf',
  'LEGACY-DOC-001.pdf',
  'application/pdf',
  1024,
  'ativo'
);

insert into public.alertas (
  id, empresa_id, modulo, registro_id, marco_dias, titulo, mensagem, status
) values (
  '82000000-0000-4000-8000-000000000090',
  '82000000-0000-4000-8000-000000000010',
  'documentos',
  '82000000-0000-4000-8000-000000000020',
  30,
  'Alerta legado',
  'Alerta anterior à multiunidade',
  'nao_lido'
);

insert into public.interacoes_assistente (
  id, empresa_id, usuario_id, pergunta, escopo, equipamento_id, resposta
) values (
  '82000000-0000-4000-8000-0000000000a0',
  '82000000-0000-4000-8000-000000000010',
  '82000000-0000-4000-8000-000000000001',
  'Qual é a situação do equipamento legado?',
  'equipamento',
  '82000000-0000-4000-8000-000000000030',
  'Registro legado preservado.'
);

insert into public.relatorios_agendados (
  id, empresa_id, nome, frequencia, destinatarios, created_by
) values (
  '82000000-0000-4000-8000-0000000000b0',
  '82000000-0000-4000-8000-000000000010',
  'Relatório corporativo legado',
  'mensal',
  array['legacy-multiunit@test.local'],
  '82000000-0000-4000-8000-000000000001'
);
