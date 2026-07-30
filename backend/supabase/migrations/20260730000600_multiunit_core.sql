-- Conform Flow — núcleo operacional de multiunidade.
-- Migration aditiva, idempotente e sem remoção dos campos textuais legados.
-- O executor local usa 15 s por lote; o backfill histórico completo precisa de
-- uma janela própria. O timeout normal da sessão é restaurado no fim do arquivo.
set statement_timeout = '5min';

create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  codigo text not null,
  nome text not null,
  tipo text,
  descricao text,
  cnpj text,
  telefone text,
  email text,
  responsavel_id uuid references public.usuarios(id) on delete set null,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado char(2),
  cep text,
  timezone text not null default 'America/Sao_Paulo',
  is_matriz boolean not null default false,
  status text not null default 'ativa',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  constraint unidades_status_check
    check (status in ('ativa', 'inativa', 'em_implantacao', 'arquivada')),
  constraint unidades_codigo_check check (btrim(codigo) <> ''),
  constraint unidades_nome_check check (btrim(nome) <> ''),
  constraint unidades_cnpj_check
    check (cnpj is null or length(regexp_replace(cnpj, '\D', '', 'g')) = 14),
  constraint unidades_id_empresa_unique unique (id, empresa_id)
);

create unique index if not exists uq_unidades_empresa_codigo_ativo
  on public.unidades (empresa_id, lower(btrim(codigo)))
  where deleted_at is null;

create unique index if not exists uq_unidades_empresa_matriz_ativa
  on public.unidades (empresa_id)
  where is_matriz and deleted_at is null and status <> 'arquivada';

create index if not exists idx_unidades_empresa_status
  on public.unidades (empresa_id, status)
  where deleted_at is null;

create index if not exists idx_unidades_responsavel
  on public.unidades (responsavel_id)
  where deleted_at is null;

-- Toda empresa pré-existente recebe exatamente uma matriz, inclusive empresas
-- arquivadas que ainda possuem registros históricos sujeitos às novas FKs.
insert into public.unidades (
  empresa_id,
  codigo,
  nome,
  tipo,
  cnpj,
  telefone,
  email,
  endereco,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  cep,
  is_matriz,
  status,
  observacoes
)
select
  e.id,
  'MATRIZ',
  coalesce(nullif(btrim(e.nome_fantasia), ''), 'Matriz'),
  'matriz',
  case
    when length(regexp_replace(coalesce(e.cnpj, ''), '\D', '', 'g')) = 14
      then regexp_replace(e.cnpj, '\D', '', 'g')
    else null
  end,
  e.telefone,
  e.email_principal,
  e.endereco,
  e.numero,
  e.complemento,
  e.bairro,
  e.cidade,
  e.estado,
  e.cep,
  true,
  case when e.deleted_at is null then 'ativa' else 'arquivada' end,
  'Unidade matriz criada automaticamente na implantação da multiunidade.'
from public.empresas e
where not exists (
    select 1
    from public.unidades u
    where u.empresa_id = e.id
      and u.deleted_at is null
  );

-- Empresas criadas depois desta migration também recebem a matriz na mesma
-- transação. A matriz é infraestrutura obrigatória e não depende do plano.
create or replace function public.ensure_company_matrix_unit()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_cnpj text;
begin
  v_cnpj := regexp_replace(coalesce(new.cnpj, ''), '\D', '', 'g');

  insert into public.unidades (
    empresa_id,
    codigo,
    nome,
    tipo,
    cnpj,
    telefone,
    email,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    is_matriz,
    status,
    observacoes
  )
  select
    new.id,
    'MATRIZ',
    coalesce(nullif(btrim(new.nome_fantasia), ''), 'Matriz'),
    'matriz',
    case when length(v_cnpj) = 14 then v_cnpj else null end,
    new.telefone,
    new.email_principal,
    new.endereco,
    new.numero,
    new.complemento,
    new.bairro,
    new.cidade,
    new.estado,
    new.cep,
    true,
    'ativa',
    'Unidade matriz criada automaticamente no cadastro da empresa.'
  where not exists (
    select 1
    from public.unidades u
    where u.empresa_id = new.id
      and u.deleted_at is null
  );

  return new;
end
$$;

drop trigger if exists trg_empresas_ensure_matrix_unit on public.empresas;
create trigger trg_empresas_ensure_matrix_unit
after insert on public.empresas
for each row execute function public.ensure_company_matrix_unit();

alter table public.usuarios_empresas
  add column if not exists acesso_todas_unidades boolean not null default true,
  add column if not exists unidade_principal_id uuid references public.unidades(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_empresas_unidade_principal_empresa_fk'
      and conrelid = 'public.usuarios_empresas'::regclass
  ) then
    alter table public.usuarios_empresas
      add constraint usuarios_empresas_unidade_principal_empresa_fk
      foreign key (unidade_principal_id, empresa_id)
      references public.unidades(id, empresa_id)
      not valid;
  end if;
end
$$;

alter table public.usuarios_empresas
  validate constraint usuarios_empresas_unidade_principal_empresa_fk;

create table if not exists public.usuarios_unidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  unidade_id uuid not null,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  ativo boolean not null default true,
  perfil_unidade text,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  constraint usuarios_unidades_unidade_empresa_fk
    foreign key (unidade_id, empresa_id)
    references public.unidades(id, empresa_id),
  constraint usuarios_unidades_perfil_check
    check (
      perfil_unidade is null
      or perfil_unidade in (
        'administrador',
        'responsavel_tecnico',
        'colaborador',
        'somente_leitura'
      )
    ),
  unique (usuario_id, unidade_id)
);

create unique index if not exists uq_usuarios_unidades_principal
  on public.usuarios_unidades (usuario_id, empresa_id)
  where principal and ativo and deleted_at is null;

create index if not exists idx_usuarios_unidades_empresa_usuario
  on public.usuarios_unidades (empresa_id, usuario_id)
  where ativo and deleted_at is null;

create index if not exists idx_usuarios_unidades_unidade_usuario
  on public.usuarios_unidades (unidade_id, usuario_id)
  where ativo and deleted_at is null;

create table if not exists public.transferencias_unidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid not null references public.equipamentos(id),
  unidade_origem_id uuid not null,
  unidade_destino_id uuid not null,
  motivo text not null,
  responsavel_id uuid references public.usuarios(id) on delete set null,
  data_transferencia timestamptz not null default now(),
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios(id) on delete set null,
  constraint transferencias_unidades_origem_empresa_fk
    foreign key (unidade_origem_id, empresa_id)
    references public.unidades(id, empresa_id),
  constraint transferencias_unidades_destino_empresa_fk
    foreign key (unidade_destino_id, empresa_id)
    references public.unidades(id, empresa_id),
  constraint transferencias_unidades_distintas_check
    check (unidade_origem_id <> unidade_destino_id),
  constraint transferencias_unidades_motivo_check
    check (btrim(motivo) <> '')
);

create index if not exists idx_transferencias_unidades_equipamento_data
  on public.transferencias_unidades (empresa_id, equipamento_id, data_transferencia desc);

-- Escopo explícito nos registros principais e snapshot da unidade nos históricos.
alter table public.documentos
  add column if not exists escopo_documento text not null default 'corporativo',
  add column if not exists unidade_id uuid;

alter table public.equipamentos add column if not exists unidade_id uuid;
alter table public.calibracoes add column if not exists unidade_id uuid;
alter table public.qualificacoes add column if not exists unidade_id uuid;
alter table public.manutencoes add column if not exists unidade_id uuid;
alter table public.pendencias add column if not exists unidade_id uuid;
alter table public.tratativas_pendencias add column if not exists unidade_id uuid;
alter table public.alertas add column if not exists unidade_id uuid;
alter table public.anexos add column if not exists unidade_id uuid;
alter table public.logs_auditoria add column if not exists unidade_id uuid;
alter table public.interacoes_assistente add column if not exists unidade_id uuid;
alter table public.relatorios_agendados add column if not exists unidade_id uuid;
alter table public.execucoes_relatorios_agendados add column if not exists unidade_id uuid;

-- Documentos com setor/unidade textual já demonstravam intenção operacional.
-- O trigger legado revalida vínculos de categoria/tipo em qualquer UPDATE.
-- A migração altera somente o novo escopo, portanto ele é suspenso estritamente
-- durante o backfill e reativado na mesma transação.
alter table public.documentos disable trigger trg_documentos_company;

update public.documentos d
set
  escopo_documento = case
    when nullif(btrim(d.setor_unidade), '') is null then 'corporativo'
    else 'unidade'
  end,
  unidade_id = case
    when nullif(btrim(d.setor_unidade), '') is null then null
    else (
      select u.id
      from public.unidades u
      where u.empresa_id = d.empresa_id
        and u.is_matriz
        and u.deleted_at is null
      limit 1
    )
  end
where d.escopo_documento is distinct from case
    when nullif(btrim(d.setor_unidade), '') is null then 'corporativo'
    else 'unidade'
  end
  or (
    nullif(btrim(d.setor_unidade), '') is not null
    and d.unidade_id is null
  );

alter table public.documentos enable trigger trg_documentos_company;

alter table public.documentos drop constraint if exists documentos_escopo_documento_check;
alter table public.documentos add constraint documentos_escopo_documento_check
  check (
    (escopo_documento = 'corporativo' and unidade_id is null)
    or (escopo_documento = 'unidade' and unidade_id is not null)
  ) not valid;

-- Os validadores legados consideram somente relacionamentos ativos. Para
-- preservar e migrar também o histórico arquivado, suspendemos apenas esses
-- validadores enquanto unidade_id é preenchido; todos são reativados abaixo.
alter table public.equipamentos disable trigger trg_equipamentos_company;
alter table public.calibracoes disable trigger trg_calibracoes_company;
alter table public.qualificacoes disable trigger trg_qualificacoes_company;
alter table public.manutencoes disable trigger trg_manutencoes_company;

update public.equipamentos e
set unidade_id = (
  select u.id
  from public.unidades u
  where u.empresa_id = e.empresa_id
    and u.is_matriz
    and u.deleted_at is null
  limit 1
)
where e.unidade_id is null;

update public.calibracoes c
set unidade_id = e.unidade_id
from public.equipamentos e
where e.id = c.equipamento_id
  and c.unidade_id is null;

update public.qualificacoes q
set unidade_id = e.unidade_id
from public.equipamentos e
where e.id = q.equipamento_id
  and q.unidade_id is null;

update public.manutencoes m
set unidade_id = coalesce(
  (
    select e.unidade_id
    from public.equipamentos e
    where e.id = m.equipamento_id
  ),
  (
    select u.id
    from public.unidades u
    where u.empresa_id = m.empresa_id
      and u.is_matriz
      and u.deleted_at is null
    limit 1
  )
)
where m.unidade_id is null;

alter table public.equipamentos enable trigger trg_equipamentos_company;
alter table public.calibracoes enable trigger trg_calibracoes_company;
alter table public.qualificacoes enable trigger trg_qualificacoes_company;
alter table public.manutencoes enable trigger trg_manutencoes_company;

create or replace function public.resolve_record_unit(
  p_empresa_id uuid,
  p_modulo text,
  p_registro_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unidade_id uuid;
begin
  case lower(coalesce(p_modulo, ''))
    when 'documentos' then
      select unidade_id into v_unidade_id
      from public.documentos
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'equipamentos' then
      select unidade_id into v_unidade_id
      from public.equipamentos
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'calibracoes' then
      select unidade_id into v_unidade_id
      from public.calibracoes
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'qualificacoes' then
      select unidade_id into v_unidade_id
      from public.qualificacoes
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'manutencoes' then
      select unidade_id into v_unidade_id
      from public.manutencoes
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'pendencias' then
      select unidade_id into v_unidade_id
      from public.pendencias
      where id = p_registro_id and empresa_id = p_empresa_id;
    else
      v_unidade_id := null;
  end case;

  return v_unidade_id;
end
$$;

update public.pendencias p
set unidade_id = public.resolve_record_unit(p.empresa_id, p.modulo, p.registro_id)
where p.unidade_id is null;

update public.tratativas_pendencias t
set unidade_id = p.unidade_id
from public.pendencias p
where p.id = t.pendencia_id
  and t.unidade_id is null;

update public.alertas a
set unidade_id = public.resolve_record_unit(a.empresa_id, a.modulo, a.registro_id)
where a.unidade_id is null;

-- Backfill técnico não representa ação de usuário. Evita alterar updated_at e
-- criar centenas de eventos artificiais na cadeia imutável de auditoria.
alter table public.anexos disable trigger trg_anexos_audit_fields;
alter table public.anexos disable trigger trg_anexos_audit_log;
alter table public.anexos disable trigger trg_anexos_plan_feature;

with anexos_resolvidos as materialized (
  select
    a.id,
    case a.modulo
      when 'documentos' then d.unidade_id
      when 'equipamentos' then e.unidade_id
      when 'calibracoes' then c.unidade_id
      when 'qualificacoes' then q.unidade_id
      when 'manutencoes' then m.unidade_id
      when 'pendencias' then p.unidade_id
      else null
    end as unidade_id
  from public.anexos a
  left join public.documentos d
    on a.modulo = 'documentos'
    and d.id = a.registro_id
    and d.empresa_id = a.empresa_id
  left join public.equipamentos e
    on a.modulo = 'equipamentos'
    and e.id = a.registro_id
    and e.empresa_id = a.empresa_id
  left join public.calibracoes c
    on a.modulo = 'calibracoes'
    and c.id = a.registro_id
    and c.empresa_id = a.empresa_id
  left join public.qualificacoes q
    on a.modulo = 'qualificacoes'
    and q.id = a.registro_id
    and q.empresa_id = a.empresa_id
  left join public.manutencoes m
    on a.modulo = 'manutencoes'
    and m.id = a.registro_id
    and m.empresa_id = a.empresa_id
  left join public.pendencias p
    on a.modulo = 'pendencias'
    and p.id = a.registro_id
    and p.empresa_id = a.empresa_id
  where a.unidade_id is null
)
update public.anexos a
set unidade_id = r.unidade_id
from anexos_resolvidos r
where r.id = a.id
  and r.unidade_id is not null;

alter table public.anexos enable trigger trg_anexos_audit_fields;
alter table public.anexos enable trigger trg_anexos_audit_log;
alter table public.anexos enable trigger trg_anexos_plan_feature;

update public.interacoes_assistente i
set unidade_id = e.unidade_id
from public.equipamentos e
where e.id = i.equipamento_id
  and i.unidade_id is null;

update public.execucoes_relatorios_agendados e
set unidade_id = r.unidade_id
from public.relatorios_agendados r
where r.id = e.relatorio_agendado_id
  and e.unidade_id is null;

alter table public.equipamentos alter column unidade_id set not null;
alter table public.calibracoes alter column unidade_id set not null;
alter table public.qualificacoes alter column unidade_id set not null;
alter table public.manutencoes alter column unidade_id set not null;

-- Views criadas antes das novas colunas mantêm a lista de colunas congelada.
-- Recriá-las torna unidade_id/escopo_documento disponíveis nas APIs sem mudar
-- o cálculo de conformidade já aprovado.
create or replace view public.vw_documentos_status with (security_invoker = true) as
select
  d.id, d.empresa_id, d.nome, d.categoria_id, d.tipo_documento_id,
  d.numero_documento, d.orgao_emissor, d.responsavel_id, d.data_emissao,
  d.data_vencimento, d.periodicidade_meses, d.alerta_antecedencia_dias,
  d.exige_anexo, d.setor_unidade, d.observacoes, d.created_at, d.updated_at,
  d.deleted_at, d.created_by, d.updated_by,
  case
    when d.exige_anexo and not public.tem_anexo_ativo(d.empresa_id, 'documentos', d.id)
      then 'pendente_anexo'
    else public.status_vencimento(d.data_vencimento)
  end as status_calculado,
  d.workflow_status, d.versao_atual, d.exige_aprovacao, d.politica_aprovacao,
  d.escopo_documento, d.unidade_id
from public.documentos d
where d.deleted_at is null;

create or replace view public.vw_calibracoes_status with (security_invoker = true) as
select
  c.id, c.empresa_id, c.equipamento_id, c.data_calibracao, c.data_vencimento,
  c.numero_certificado, c.laboratorio_responsavel, c.resultado,
  c.responsavel_id, c.observacoes, c.created_at, c.updated_at, c.deleted_at,
  c.created_by, c.updated_by,
  row_number() over (
    partition by c.equipamento_id
    order by c.data_calibracao desc, c.created_at desc
  ) = 1 as vigente,
  case
    when c.resultado = 'reprovado' then 'reprovado'
    when not public.tem_anexo_ativo(c.empresa_id, 'calibracoes', c.id, 'certificado')
      then 'sem_certificado'
    else public.status_vencimento(c.data_vencimento)
  end as status_calculado,
  c.unidade_id
from public.calibracoes c
where c.deleted_at is null;

create or replace view public.vw_qualificacoes_status with (security_invoker = true) as
select
  q.id, q.empresa_id, q.equipamento_id, q.tipo, q.data_qualificacao,
  q.data_vencimento, q.resultado, q.responsavel_tecnico_id,
  q.empresa_executora, q.observacoes, q.created_at, q.updated_at, q.deleted_at,
  q.created_by, q.updated_by,
  row_number() over (
    partition by q.equipamento_id
    order by q.data_qualificacao desc, q.created_at desc
  ) = 1 as vigente,
  case
    when q.resultado = 'reprovado' then 'reprovada'
    when not public.tem_anexo_ativo(q.empresa_id, 'qualificacoes', q.id, 'relatorio')
      then 'pendente_relatorio'
    else public.status_vencimento(q.data_vencimento)
  end as status_calculado,
  q.unidade_id
from public.qualificacoes q
where q.deleted_at is null;

create or replace view public.vw_manutencoes_status with (security_invoker = true) as
select
  m.id, m.empresa_id, m.equipamento_id, m.nome_servico, m.natureza,
  m.tipo_servico, m.status_execucao, m.data_manutencao, m.proxima_manutencao,
  m.periodicidade_meses, m.empresa_responsavel, m.tecnico_responsavel,
  m.numero_ordem_servico, m.responsavel_interno_id, m.exige_evidencia,
  m.falha_apresentada, m.prioridade, m.diagnostico, m.causa_raiz,
  m.acao_realizada, m.equipamento_parado_desde, m.retorno_operacao_at,
  m.observacoes, m.created_at, m.updated_at, m.deleted_at, m.created_by,
  m.updated_by,
  case
    when m.exige_evidencia and not public.tem_anexo_ativo(m.empresa_id, 'manutencoes', m.id)
      then 'pendente_evidencia'
    else public.status_vencimento(m.proxima_manutencao)
  end as status_calculado,
  m.unidade_id
from public.manutencoes m
where m.deleted_at is null;

create or replace view public.vw_equipamentos_conformidade with (security_invoker = true) as
select
  e.id, e.empresa_id, e.nome, e.tipo_equipamento_id, e.codigo_interno,
  e.numero_serie, e.fabricante, e.modelo, e.setor, e.localizacao,
  e.criticidade, e.status, e.responsavel_id, e.observacoes, e.created_at,
  e.updated_at, e.deleted_at, e.created_by, e.updated_by,
  c.id as calibracao_vigente_id,
  c.status_calculado as status_calibracao,
  q.id as qualificacao_vigente_id,
  q.status_calculado as status_qualificacao,
  m.id as manutencao_recente_id,
  m.status_calculado as status_manutencao,
  case
    when 'reprovado' in (
      coalesce(c.status_calculado, ''),
      coalesce(q.status_calculado, '')
    ) then 'reprovado'
    when 'vencido' in (
      coalesce(c.status_calculado, ''),
      coalesce(q.status_calculado, ''),
      coalesce(m.status_calculado, '')
    ) then 'vencido'
    when 'critico' in (
      coalesce(c.status_calculado, ''),
      coalesce(q.status_calculado, ''),
      coalesce(m.status_calculado, '')
    ) then 'critico'
    when 'a_vencer' in (
      coalesce(c.status_calculado, ''),
      coalesce(q.status_calculado, ''),
      coalesce(m.status_calculado, '')
    ) then 'a_vencer'
    else 'em_dia'
  end as status_consolidado,
  e.qr_token,
  e.unidade_id
from public.equipamentos e
left join public.vw_calibracoes_status c
  on c.equipamento_id = e.id and c.vigente
left join public.vw_qualificacoes_status q
  on q.equipamento_id = e.id and q.vigente
left join lateral (
  select vm.*
  from public.vw_manutencoes_status vm
  where vm.equipamento_id = e.id
  order by vm.data_manutencao desc, vm.created_at desc
  limit 1
) m on true
where e.deleted_at is null;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'pendencias',
    'tratativas_pendencias',
    'alertas',
    'anexos',
    'logs_auditoria',
    'interacoes_assistente',
    'relatorios_agendados',
    'execucoes_relatorios_agendados'
  ] loop
    if not exists (
      select 1
      from pg_constraint
      where conname = v_table || '_unidade_empresa_fk'
        and conrelid = format('public.%I', v_table)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (unidade_id, empresa_id) references public.unidades(id, empresa_id) on delete restrict not valid',
        v_table,
        v_table || '_unidade_empresa_fk'
      );
    end if;
  end loop;
end
$$;

alter table public.documentos validate constraint documentos_escopo_documento_check;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'pendencias',
    'tratativas_pendencias',
    'alertas',
    'anexos',
    'logs_auditoria',
    'interacoes_assistente',
    'relatorios_agendados',
    'execucoes_relatorios_agendados'
  ] loop
    execute format(
      'alter table public.%I validate constraint %I',
      v_table,
      v_table || '_unidade_empresa_fk'
    );
  end loop;
end
$$;

create index if not exists idx_documentos_empresa_unidade
  on public.documentos (empresa_id, unidade_id, data_vencimento)
  where deleted_at is null;
create index if not exists idx_equipamentos_empresa_unidade
  on public.equipamentos (empresa_id, unidade_id, status)
  where deleted_at is null;
create index if not exists idx_calibracoes_empresa_unidade
  on public.calibracoes (empresa_id, unidade_id, data_vencimento)
  where deleted_at is null;
create index if not exists idx_qualificacoes_empresa_unidade
  on public.qualificacoes (empresa_id, unidade_id, data_vencimento)
  where deleted_at is null;
create index if not exists idx_manutencoes_empresa_unidade
  on public.manutencoes (empresa_id, unidade_id, proxima_manutencao)
  where deleted_at is null;
create index if not exists idx_pendencias_empresa_unidade
  on public.pendencias (empresa_id, unidade_id, status, prazo)
  where deleted_at is null;
create index if not exists idx_alertas_empresa_unidade
  on public.alertas (empresa_id, unidade_id, status)
  where deleted_at is null;
create index if not exists idx_anexos_empresa_unidade_registro
  on public.anexos (empresa_id, unidade_id, modulo, registro_id)
  where deleted_at is null;
create index if not exists idx_logs_empresa_unidade_data
  on public.logs_auditoria (empresa_id, unidade_id, created_at desc);

create or replace function public.unit_belongs_to_company(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p_unidade_id is not null
    and exists (
      select 1
      from public.unidades u
      where u.id = p_unidade_id
        and u.empresa_id = p_empresa_id
        and u.deleted_at is null
    )
$$;

create or replace function public.has_unit_membership(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_company_membership(p_empresa_id)
    and public.unit_belongs_to_company(p_empresa_id, p_unidade_id)
    and (
      public.is_master()
      or public.company_role(p_empresa_id) in (
        'administrador',
        'administrador_provisorio',
        'parceiro_administrador',
        -- O vínculo parceiro-cliente já foi validado por
        -- has_company_membership. O colaborador do parceiro acessa as
        -- unidades desse cliente, mas não recebe visão consolidada nem
        -- privilégios administrativos.
        'parceiro_colaborador'
      )
      or exists (
        select 1
        from public.usuarios_empresas ue
        where ue.usuario_id = auth.uid()
          and ue.empresa_id = p_empresa_id
          and ue.ativo
          and ue.deleted_at is null
          and ue.acesso_todas_unidades
      )
      or exists (
        select 1
        from public.usuarios_unidades uu
        where uu.usuario_id = auth.uid()
          and uu.empresa_id = p_empresa_id
          and uu.unidade_id = p_unidade_id
          and uu.ativo
          and uu.deleted_at is null
      )
    )
$$;

create or replace function public.has_unit_access(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_company_access(p_empresa_id)
    and public.has_unit_membership(p_empresa_id, p_unidade_id)
$$;

create or replace function public.can_read_unit(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_unit_access(p_empresa_id, p_unidade_id)
$$;

create or replace function public.can_write_unit(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_write_company(p_empresa_id)
    and public.has_unit_membership(p_empresa_id, p_unidade_id)
    and exists (
      select 1
      from public.unidades u
      where u.id = p_unidade_id
        and u.empresa_id = p_empresa_id
        and u.status in ('ativa', 'em_implantacao')
        and u.deleted_at is null
    )
$$;

create or replace function public.can_admin_unit(
  p_empresa_id uuid,
  p_unidade_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_admin_company(p_empresa_id)
    and public.has_unit_membership(p_empresa_id, p_unidade_id)
$$;

create or replace function public.can_use_consolidated_view(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_company_access(p_empresa_id)
    and (
      public.is_master()
      or public.company_role(p_empresa_id) in (
        'administrador',
        'administrador_provisorio',
        'parceiro_administrador'
      )
      or exists (
        select 1
        from public.usuarios_empresas ue
        where ue.usuario_id = auth.uid()
          and ue.empresa_id = p_empresa_id
          and ue.ativo
          and ue.deleted_at is null
          and ue.acesso_todas_unidades
      )
    )
$$;

create or replace function public.current_user_unit_ids(p_empresa_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.id
  from public.unidades u
  where u.empresa_id = p_empresa_id
    and u.deleted_at is null
    and public.has_unit_access(p_empresa_id, u.id)
  order by u.is_matriz desc, u.nome
$$;

create or replace function public.active_company_unit_count(p_empresa_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.role() = 'authenticated'
    and not public.has_company_access(p_empresa_id)
  then
    raise exception 'COMPANY_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  select count(*)::integer
  into v_count
  from public.unidades u
  where u.empresa_id = p_empresa_id
    and u.deleted_at is null
    and u.status in ('ativa', 'inativa', 'em_implantacao');

  return v_count;
end
$$;

create or replace function public.effective_unit_limit(p_empresa_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select greatest(coalesce(public.effective_company_limit(p_empresa_id, 'max_units'), 1), 1)
$$;

create or replace function public.can_create_company_unit(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_admin_company(p_empresa_id)
    and public.company_billing_allows_write(p_empresa_id)
    and public.active_company_unit_count(p_empresa_id) < public.effective_unit_limit(p_empresa_id)
    and (
      public.plan_feature_enabled(p_empresa_id, 'multi_unidades')
      or public.active_company_unit_count(p_empresa_id) = 0
    )
$$;

create or replace function public.validate_unit_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_consumes boolean;
  v_previously_consumed boolean := false;
  v_limit integer;
  v_current integer;
begin
  v_consumes := new.deleted_at is null
    and new.status in ('ativa', 'inativa', 'em_implantacao');

  if not exists (
    select 1
    from public.empresas e
    where e.id = new.empresa_id
      and e.deleted_at is null
  ) then
    raise exception 'ACTIVE_COMPANY_REQUIRED'
      using errcode = '23503',
        detail = 'A unidade deve pertencer a uma empresa existente e não excluída.';
  end if;

  if tg_op = 'UPDATE' then
    v_previously_consumed := old.deleted_at is null
      and old.status in ('ativa', 'inativa', 'em_implantacao');
  end if;

  if v_consumes and not v_previously_consumed then
    perform pg_advisory_xact_lock(hashtextextended(new.empresa_id::text, 93471));
    select count(*)::integer
    into v_current
    from public.unidades u
    where u.empresa_id = new.empresa_id
      and u.deleted_at is null
      and u.status in ('ativa', 'inativa', 'em_implantacao')
      and (tg_op = 'INSERT' or u.id <> new.id);

    -- Toda empresa precisa de uma matriz, inclusive antes de a associação do
    -- primeiro administrador e a assinatura serem gravadas.
    if new.is_matriz and v_current = 0 then
      return new;
    end if;

    v_limit := public.effective_unit_limit(new.empresa_id);
    if v_current >= v_limit then
      raise exception 'UNIT_LIMIT_REACHED'
        using errcode = 'P0001',
          detail = format('A empresa utiliza %s de %s unidades contratadas.', v_current, v_limit);
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists trg_unidades_capacity on public.unidades;
create trigger trg_unidades_capacity
before insert or update of status, deleted_at on public.unidades
for each row execute function public.validate_unit_capacity();

create or replace function public.validate_unit_context()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unidade_id uuid;
  v_empresa_id uuid;
begin
  if tg_table_name = 'documentos' then
    if new.escopo_documento = 'corporativo' then
      new.unidade_id := null;
    elsif new.unidade_id is null then
      raise exception 'UNIT_REQUIRED' using errcode = '23514';
    end if;
  elsif tg_table_name = 'equipamentos' then
    if new.unidade_id is null then
      raise exception 'UNIT_REQUIRED' using errcode = '23514';
    end if;
  elsif tg_table_name in ('calibracoes', 'qualificacoes')
    or (tg_table_name = 'manutencoes' and new.equipamento_id is not null)
  then
    select e.empresa_id, e.unidade_id
    into v_empresa_id, v_unidade_id
    from public.equipamentos e
    where e.id = new.equipamento_id
      and e.deleted_at is null;

    if v_empresa_id is null or v_empresa_id <> new.empresa_id then
      raise exception 'EQUIPMENT_COMPANY_MISMATCH' using errcode = '23503';
    end if;

    if tg_op = 'INSERT'
      or new.equipamento_id is distinct from old.equipamento_id
      or new.unidade_id is null
    then
      new.unidade_id := v_unidade_id;
    elsif new.unidade_id <> v_unidade_id then
      raise exception 'EQUIPMENT_UNIT_MISMATCH' using errcode = '23514';
    end if;
  elsif tg_table_name = 'manutencoes' and new.unidade_id is null then
    raise exception 'UNIT_REQUIRED' using errcode = '23514';
  elsif tg_table_name = 'tratativas_pendencias' then
    select p.empresa_id, p.unidade_id
    into v_empresa_id, v_unidade_id
    from public.pendencias p
    where p.id = new.pendencia_id
      and p.deleted_at is null;

    if v_empresa_id is null or v_empresa_id <> new.empresa_id then
      raise exception 'PENDING_COMPANY_MISMATCH' using errcode = '23503';
    end if;
    new.unidade_id := v_unidade_id;
  elsif tg_table_name in ('pendencias', 'alertas', 'anexos') then
    v_unidade_id := public.resolve_record_unit(new.empresa_id, new.modulo, new.registro_id);
    if v_unidade_id is not null then
      new.unidade_id := v_unidade_id;
    end if;
  elsif tg_table_name = 'execucoes_relatorios_agendados' then
    select r.empresa_id, r.unidade_id
    into v_empresa_id, v_unidade_id
    from public.relatorios_agendados r
    where r.id = new.relatorio_agendado_id;
    if v_empresa_id is null or v_empresa_id <> new.empresa_id then
      raise exception 'REPORT_COMPANY_MISMATCH' using errcode = '23503';
    end if;
    new.unidade_id := v_unidade_id;
  end if;

  if new.unidade_id is not null
    and not public.unit_belongs_to_company(new.empresa_id, new.unidade_id)
  then
    raise exception 'UNIT_COMPANY_MISMATCH' using errcode = '23514';
  end if;

  return new;
end
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'pendencias',
    'tratativas_pendencias',
    'alertas',
    'anexos',
    'relatorios_agendados',
    'execucoes_relatorios_agendados'
  ] loop
    execute format('drop trigger if exists trg_%I_unit_context on public.%I', v_table, v_table);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.validate_unit_context()',
      'trg_' || v_table || '_unit_context',
      v_table
    );
  end loop;
end
$$;

create or replace function public.prevent_unit_physical_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'UNIT_PHYSICAL_DELETE_FORBIDDEN'
    using errcode = '55000',
      detail = 'Arquive a unidade para preservar o histórico.';
end
$$;

drop trigger if exists trg_unidades_no_physical_delete on public.unidades;
create trigger trg_unidades_no_physical_delete
before delete on public.unidades
for each row execute function public.prevent_unit_physical_delete();

drop trigger if exists trg_unidades_audit_fields on public.unidades;
create trigger trg_unidades_audit_fields
before insert or update on public.unidades
for each row execute function public.set_audit_fields();

drop trigger if exists trg_unidades_audit_log on public.unidades;
create trigger trg_unidades_audit_log
after insert or update on public.unidades
for each row execute function public.audit_row_change();

drop trigger if exists trg_usuarios_unidades_audit_fields on public.usuarios_unidades;
create trigger trg_usuarios_unidades_audit_fields
before insert or update on public.usuarios_unidades
for each row execute function public.set_audit_fields();

drop trigger if exists trg_usuarios_unidades_audit_log on public.usuarios_unidades;
create trigger trg_usuarios_unidades_audit_log
after insert or update on public.usuarios_unidades
for each row execute function public.audit_row_change();

alter table public.unidades enable row level security;
alter table public.usuarios_unidades enable row level security;
alter table public.transferencias_unidades enable row level security;

drop policy if exists unidades_read on public.unidades;
create policy unidades_read on public.unidades
for select to authenticated
using (
  deleted_at is null
  and public.has_unit_access(empresa_id, id)
);

drop policy if exists unidades_insert on public.unidades;
create policy unidades_insert on public.unidades
for insert to authenticated
with check (public.can_admin_company(empresa_id));

drop policy if exists unidades_update on public.unidades;
create policy unidades_update on public.unidades
for update to authenticated
using (public.can_admin_unit(empresa_id, id))
with check (public.can_admin_company(empresa_id));

drop policy if exists usuarios_unidades_read on public.usuarios_unidades;
create policy usuarios_unidades_read on public.usuarios_unidades
for select to authenticated
using (
  usuario_id = auth.uid()
  or public.can_admin_company(empresa_id)
);

drop policy if exists usuarios_unidades_insert on public.usuarios_unidades;
create policy usuarios_unidades_insert on public.usuarios_unidades
for insert to authenticated
with check (
  public.can_admin_company(empresa_id)
  and public.unit_belongs_to_company(empresa_id, unidade_id)
);

drop policy if exists usuarios_unidades_update on public.usuarios_unidades;
create policy usuarios_unidades_update on public.usuarios_unidades
for update to authenticated
using (public.can_admin_company(empresa_id))
with check (
  public.can_admin_company(empresa_id)
  and public.unit_belongs_to_company(empresa_id, unidade_id)
);

drop policy if exists transferencias_unidades_read on public.transferencias_unidades;
create policy transferencias_unidades_read on public.transferencias_unidades
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (
    public.can_read_unit(empresa_id, unidade_origem_id)
    or public.can_read_unit(empresa_id, unidade_destino_id)
  )
);

-- Substitui somente as policies operacionais por políticas com duas camadas:
-- empresa e unidade. Documentos corporativos permanecem visíveis no tenant.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'anexos',
    'pendencias',
    'tratativas_pendencias',
    'alertas'
  ] loop
    execute format('drop policy if exists %I on public.%I', v_table || '_read', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_insert', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_update', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        public.has_company_access(empresa_id)
        and deleted_at is null
        and (unidade_id is null or public.can_read_unit(empresa_id, unidade_id))
      )',
      v_table || '_read',
      v_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        public.can_write_company(empresa_id)
        and deleted_at is null
        and (unidade_id is null or public.can_write_unit(empresa_id, unidade_id))
      )',
      v_table || '_insert',
      v_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        public.can_write_company(empresa_id)
        and (unidade_id is null or public.can_write_unit(empresa_id, unidade_id))
      ) with check (
        public.can_write_company(empresa_id)
        and (unidade_id is null or public.can_write_unit(empresa_id, unidade_id))
        and (deleted_at is null or public.can_admin_company(empresa_id))
      )',
      v_table || '_update',
      v_table
    );
  end loop;
end
$$;

drop policy if exists interacoes_assistente_read on public.interacoes_assistente;
create policy interacoes_assistente_read on public.interacoes_assistente
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (unidade_id is null or public.can_read_unit(empresa_id, unidade_id))
);

drop policy if exists interacoes_assistente_insert on public.interacoes_assistente;
create policy interacoes_assistente_insert on public.interacoes_assistente
for insert to authenticated
with check (
  usuario_id = auth.uid()
  and public.can_write_company(empresa_id)
  and (unidade_id is null or public.can_read_unit(empresa_id, unidade_id))
);

drop policy if exists logs_read on public.logs_auditoria;
create policy logs_read on public.logs_auditoria
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (unidade_id is null or public.can_read_unit(empresa_id, unidade_id))
  and (public.is_master() or public.plan_feature_enabled(empresa_id, 'auditoria'))
);

drop policy if exists relatorios_agendados_tenant_read on public.relatorios_agendados;
create policy relatorios_agendados_tenant_read on public.relatorios_agendados
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (
    unidade_id is null and public.can_use_consolidated_view(empresa_id)
    or unidade_id is not null and public.can_read_unit(empresa_id, unidade_id)
  )
);

drop policy if exists execucoes_relatorios_tenant_read on public.execucoes_relatorios_agendados;
create policy execucoes_relatorios_tenant_read on public.execucoes_relatorios_agendados
for select to authenticated
using (
  public.has_company_access(empresa_id)
  and (
    unidade_id is null and public.can_use_consolidated_view(empresa_id)
    or unidade_id is not null and public.can_read_unit(empresa_id, unidade_id)
  )
);

create or replace function public.can_access_evidence_object(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, auth, pg_temp
as $$
  select exists (
    select 1
    from public.anexos a
    where a.storage_path = p_storage_path
      and a.status <> 'excluido'
      and a.deleted_at is null
      and public.has_company_access(a.empresa_id)
      and (a.unidade_id is null or public.can_read_unit(a.empresa_id, a.unidade_id))
  )
$$;

drop policy if exists evidencias_read on storage.objects;
create policy evidencias_read on storage.objects
for select to authenticated
using (
  bucket_id = 'evidencias'
  and public.can_access_evidence_object(name)
);

-- Uploads autenticados passam exclusivamente pela Edge Function, que usa
-- metadados do registro e service_role. Isso evita autorização baseada só no caminho.
drop policy if exists evidencias_insert on storage.objects;
drop policy if exists evidencias_update on storage.objects;

revoke all on table public.unidades, public.usuarios_unidades, public.transferencias_unidades from anon;
grant select on table public.unidades, public.usuarios_unidades, public.transferencias_unidades to authenticated;
grant all on table public.unidades, public.usuarios_unidades, public.transferencias_unidades to service_role;

revoke all on function public.resolve_record_unit(uuid, text, uuid) from public, anon;
revoke all on function public.ensure_company_matrix_unit() from public, anon;
revoke all on function public.unit_belongs_to_company(uuid, uuid) from public, anon;
revoke all on function public.has_unit_membership(uuid, uuid) from public, anon;
revoke all on function public.has_unit_access(uuid, uuid) from public, anon;
revoke all on function public.can_read_unit(uuid, uuid) from public, anon;
revoke all on function public.can_write_unit(uuid, uuid) from public, anon;
revoke all on function public.can_admin_unit(uuid, uuid) from public, anon;
revoke all on function public.can_use_consolidated_view(uuid) from public, anon;
revoke all on function public.current_user_unit_ids(uuid) from public, anon;
revoke all on function public.active_company_unit_count(uuid) from public, anon;
revoke all on function public.effective_unit_limit(uuid) from public, anon;
revoke all on function public.can_create_company_unit(uuid) from public, anon;
revoke all on function public.can_access_evidence_object(text) from public, anon;

grant execute on function public.resolve_record_unit(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.ensure_company_matrix_unit() to service_role;
grant execute on function public.unit_belongs_to_company(uuid, uuid) to authenticated, service_role;
grant execute on function public.has_unit_membership(uuid, uuid) to authenticated, service_role;
grant execute on function public.has_unit_access(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_read_unit(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_write_unit(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_admin_unit(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_use_consolidated_view(uuid) to authenticated, service_role;
grant execute on function public.current_user_unit_ids(uuid) to authenticated, service_role;
grant execute on function public.active_company_unit_count(uuid) to authenticated, service_role;
grant execute on function public.effective_unit_limit(uuid) to authenticated, service_role;
grant execute on function public.can_create_company_unit(uuid) to authenticated, service_role;
grant execute on function public.can_access_evidence_object(text) to authenticated, service_role;

reset statement_timeout;
