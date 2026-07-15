-- Conform Flow - consolidated migrations

-- === 20260701000100_initial_schema.sql ===

-- Conform Flow â€” schema base
create extension if not exists pgcrypto;

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  limite_usuarios integer not null default 5,
  limite_documentos integer,
  limite_equipamentos integer,
  limite_storage_mb integer not null default 1024,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text not null,
  cnpj text not null unique,
  tipo_estabelecimento text,
  segmento text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado char(2),
  cep text,
  telefone text,
  email_principal text,
  responsavel_legal text,
  responsavel_tecnico text,
  conselho_profissional text,
  plano_id uuid references public.planos(id),
  status text not null default 'ativa' check (status in ('ativa','bloqueada','cancelada')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  cargo text,
  is_master boolean not null default false,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  ultimo_acesso timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.usuarios_empresas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  empresa_id uuid not null references public.empresas(id),
  perfil text not null check (perfil in ('administrador','responsavel_tecnico','colaborador','somente_leitura')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (usuario_id, empresa_id)
);

create table if not exists public.categorias_documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  nome text not null,
  descricao text,
  padrao_plataforma boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.tipos_documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  nome text not null,
  exige_anexo boolean not null default true,
  padrao_plataforma boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.tipos_equipamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  nome text not null,
  padrao_plataforma boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  nome text not null,
  categoria_id uuid references public.categorias_documentos(id),
  tipo_documento_id uuid references public.tipos_documentos(id),
  numero_documento text,
  orgao_emissor text,
  responsavel_id uuid references public.usuarios(id),
  data_emissao date,
  data_vencimento date,
  periodicidade_meses integer,
  alerta_antecedencia_dias integer[] default array[60,30,15,7,0],
  exige_anexo boolean not null default true,
  setor_unidade text,
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  nome text not null,
  tipo_equipamento_id uuid references public.tipos_equipamentos(id),
  codigo_interno text,
  numero_serie text,
  fabricante text,
  modelo text,
  setor text,
  localizacao text,
  criticidade text not null default 'media' check (criticidade in ('baixa','media','alta','critica')),
  status text not null default 'ativo' check (status in ('ativo','inativo','em_manutencao','descartado')),
  responsavel_id uuid references public.usuarios(id),
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id),
  unique (empresa_id, codigo_interno)
);

create table if not exists public.calibracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid not null references public.equipamentos(id),
  data_calibracao date not null,
  data_vencimento date,
  numero_certificado text,
  laboratorio_responsavel text,
  resultado text not null check (resultado in ('aprovado','reprovado','aprovado_restricao','nao_aplicavel')),
  responsavel_id uuid references public.usuarios(id),
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id),
  unique (empresa_id, numero_certificado)
);

create table if not exists public.qualificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid not null references public.equipamentos(id),
  tipo text not null check (tipo in ('instalacao','operacao','desempenho','mapeamento_termico','requalificacao_periodica','outro')),
  data_qualificacao date not null,
  data_vencimento date,
  resultado text not null check (resultado in ('aprovado','reprovado','aprovado_restricao','nao_aplicavel')),
  responsavel_tecnico_id uuid references public.usuarios(id),
  empresa_executora text,
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.manutencoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  equipamento_id uuid references public.equipamentos(id),
  nome_servico text,
  natureza text not null check (natureza in ('preventiva','corretiva')),
  tipo_servico text not null default 'outro' check (tipo_servico in ('inspecao','limpeza','validacao','reparo','troca_peca','ajuste','outro')),
  status_execucao text not null default 'concluida' check (status_execucao in ('programada','em_andamento','concluida','cancelada')),
  data_manutencao date not null,
  proxima_manutencao date,
  periodicidade_meses integer check (periodicidade_meses is null or periodicidade_meses > 0),
  empresa_responsavel text,
  tecnico_responsavel text,
  numero_ordem_servico text,
  responsavel_interno_id uuid references public.usuarios(id),
  exige_evidencia boolean not null default true,
  falha_apresentada text,
  prioridade text check (prioridade is null or prioridade in ('baixa','media','alta','critica')),
  diagnostico text,
  causa_raiz text,
  acao_realizada text,
  equipamento_parado_desde timestamptz,
  retorno_operacao_at timestamptz,
  observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id),
  check (equipamento_id is not null or nullif(trim(nome_servico),'') is not null),
  check (natureza <> 'corretiva' or equipamento_id is not null),
  check (retorno_operacao_at is null or equipamento_parado_desde is null or retorno_operacao_at >= equipamento_parado_desde)
);

create table if not exists public.anexos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  modulo text not null check (modulo in ('documentos','equipamentos','calibracoes','qualificacoes','manutencoes','pendencias')),
  registro_id uuid not null,
  finalidade text not null default 'principal',
  storage_path text not null unique,
  nome_original text not null,
  mime_type text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0),
  versao integer not null default 1,
  substitui_anexo_id uuid references public.anexos(id),
  status text not null default 'ativo' check (status in ('ativo','substituido','excluido')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.pendencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  modulo text not null,
  registro_id uuid not null,
  tipo text not null,
  titulo text not null,
  responsavel_id uuid references public.usuarios(id),
  prazo date,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluida','cancelada')),
  concluida_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.tratativas_pendencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  pendencia_id uuid not null references public.pendencias(id),
  descricao text not null,
  responsavel_id uuid references public.usuarios(id),
  prazo date,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluida','cancelada')),
  data_conclusao timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  usuario_id uuid references public.usuarios(id),
  modulo text not null,
  registro_id uuid not null,
  marco_dias integer not null,
  titulo text not null,
  mensagem text not null,
  data_vencimento date,
  status text not null default 'nao_lido' check (status in ('nao_lido','lido','arquivado')),
  email_status text not null default 'pendente' check (email_status in ('pendente','enviado','falhou','dispensado')),
  email_enviado_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id),
  unique (empresa_id, usuario_id, modulo, registro_id, marco_dias)
);

create table if not exists public.configuracoes_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id),
  dias_alerta integer[] not null default array[60,30,15,7,0],
  enviar_email boolean not null default true,
  email_remetente_nome text default 'Conform Flow',
  categorias_alerta uuid[],
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  created_by uuid references public.usuarios(id), updated_by uuid references public.usuarios(id)
);

create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  usuario_id uuid references public.usuarios(id),
  modulo text not null,
  acao text not null,
  registro_id uuid,
  valor_anterior jsonb,
  novo_valor jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_documentos_empresa_vencimento on public.documentos(empresa_id, data_vencimento) where deleted_at is null;
create index if not exists idx_equipamentos_empresa on public.equipamentos(empresa_id) where deleted_at is null;
create index if not exists idx_calibracoes_equipamento_data on public.calibracoes(equipamento_id, data_calibracao desc) where deleted_at is null;
create index if not exists idx_qualificacoes_equipamento_data on public.qualificacoes(equipamento_id, data_qualificacao desc) where deleted_at is null;
create index if not exists idx_manutencoes_empresa_proxima on public.manutencoes(empresa_id, proxima_manutencao) where deleted_at is null;
create index if not exists idx_anexos_registro on public.anexos(empresa_id, modulo, registro_id) where deleted_at is null;
create index if not exists idx_pendencias_empresa_status on public.pendencias(empresa_id, status) where deleted_at is null;
create index if not exists idx_alertas_usuario_status on public.alertas(usuario_id, status) where deleted_at is null;
create index if not exists idx_logs_empresa_data on public.logs_auditoria(empresa_id, created_at desc);


-- === 20260701000200_functions_and_views.sql ===

-- Conform Flow â€” funÃ§Ãµes, status dinÃ¢micos e auditoria

create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select u.is_master from public.usuarios u where u.id = auth.uid() and u.status = 'ativo' and u.deleted_at is null), false)
$$;

create or replace function public.has_company_access(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_master() or exists (
    select 1 from public.usuarios_empresas ue
    join public.usuarios u on u.id = ue.usuario_id
    join public.empresas e on e.id = ue.empresa_id
    where ue.usuario_id = auth.uid() and ue.empresa_id = p_empresa_id
      and ue.ativo = true and ue.deleted_at is null
      and u.status = 'ativo' and u.deleted_at is null
      and e.status = 'ativa' and e.deleted_at is null
  )
$$;

create or replace function public.company_role(p_empresa_id uuid)
returns text language sql stable security definer set search_path = public
as $$
  select case when public.is_master() then 'master' else (
    select ue.perfil from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid() and ue.empresa_id = p_empresa_id
      and ue.ativo = true and ue.deleted_at is null limit 1
  ) end
$$;

create or replace function public.can_write_company(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.company_role(p_empresa_id) in ('master','administrador','responsavel_tecnico','colaborador'), false) $$;

create or replace function public.can_admin_company(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.company_role(p_empresa_id) in ('master','administrador'), false) $$;

create or replace function public.status_vencimento(p_data date)
returns text language sql stable
as $$
  select case
    when p_data is null then 'sem_validade'
    when p_data < current_date then 'vencido'
    when p_data = current_date then 'vence_hoje'
    when p_data <= current_date + 7 then 'critico'
    when p_data <= current_date + 30 then 'a_vencer'
    when p_data <= current_date + 60 then 'atencao'
    else 'em_dia'
  end
$$;

create or replace function public.tem_anexo_ativo(p_empresa_id uuid, p_modulo text, p_registro_id uuid, p_finalidade text default null)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.anexos a
    where a.empresa_id = p_empresa_id and a.modulo = p_modulo and a.registro_id = p_registro_id
      and a.status = 'ativo' and a.deleted_at is null
      and (p_finalidade is null or a.finalidade = p_finalidade)
  )
$$;

create or replace view public.vw_documentos_status with (security_invoker = true) as
select d.*,
  case when d.exige_anexo and not public.tem_anexo_ativo(d.empresa_id,'documentos',d.id) then 'pendente_anexo'
       else public.status_vencimento(d.data_vencimento) end as status_calculado
from public.documentos d where d.deleted_at is null;

create or replace view public.vw_calibracoes_status with (security_invoker = true) as
select c.*,
  row_number() over (partition by c.equipamento_id order by c.data_calibracao desc, c.created_at desc) = 1 as vigente,
  case when c.resultado = 'reprovado' then 'reprovado'
       when not public.tem_anexo_ativo(c.empresa_id,'calibracoes',c.id,'certificado') then 'sem_certificado'
       else public.status_vencimento(c.data_vencimento) end as status_calculado
from public.calibracoes c where c.deleted_at is null;

create or replace view public.vw_qualificacoes_status with (security_invoker = true) as
select q.*,
  row_number() over (partition by q.equipamento_id order by q.data_qualificacao desc, q.created_at desc) = 1 as vigente,
  case when q.resultado = 'reprovado' then 'reprovada'
       when not public.tem_anexo_ativo(q.empresa_id,'qualificacoes',q.id,'relatorio') then 'pendente_relatorio'
       else public.status_vencimento(q.data_vencimento) end as status_calculado
from public.qualificacoes q where q.deleted_at is null;

create or replace view public.vw_manutencoes_status with (security_invoker = true) as
select m.*,
  case when m.exige_evidencia and not public.tem_anexo_ativo(m.empresa_id,'manutencoes',m.id) then 'pendente_evidencia'
       else public.status_vencimento(m.proxima_manutencao) end as status_calculado
from public.manutencoes m where m.deleted_at is null;

create or replace view public.vw_equipamentos_conformidade with (security_invoker = true) as
select e.*,
  c.id as calibracao_vigente_id, c.status_calculado as status_calibracao,
  q.id as qualificacao_vigente_id, q.status_calculado as status_qualificacao,
  m.id as manutencao_recente_id, m.status_calculado as status_manutencao,
  case
    when 'reprovado' in (coalesce(c.status_calculado,''),coalesce(q.status_calculado,'')) then 'reprovado'
    when 'vencido' in (coalesce(c.status_calculado,''),coalesce(q.status_calculado,''),coalesce(m.status_calculado,'')) then 'vencido'
    when 'critico' in (coalesce(c.status_calculado,''),coalesce(q.status_calculado,''),coalesce(m.status_calculado,'')) then 'critico'
    when 'a_vencer' in (coalesce(c.status_calculado,''),coalesce(q.status_calculado,''),coalesce(m.status_calculado,'')) then 'a_vencer'
    else 'em_dia'
  end as status_consolidado
from public.equipamentos e
left join public.vw_calibracoes_status c on c.equipamento_id = e.id and c.vigente
left join public.vw_qualificacoes_status q on q.equipamento_id = e.id and q.vigente
left join lateral (
  select vm.* from public.vw_manutencoes_status vm where vm.equipamento_id = e.id
  order by vm.data_manutencao desc, vm.created_at desc limit 1
) m on true
where e.deleted_at is null;

create or replace function public.set_audit_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());
    new.created_at := coalesce(new.created_at, now());
  else
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
  v_id uuid;
begin
  v_empresa_id := case when tg_op = 'DELETE' then old.empresa_id else new.empresa_id end;
  v_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, valor_anterior, novo_valor)
  values (
    v_empresa_id, auth.uid(), tg_table_name,
    case when tg_op = 'INSERT' then 'criacao'
         when tg_op = 'DELETE' then 'exclusao_fisica_bloqueada'
         when old.deleted_at is null and new.deleted_at is not null then 'exclusao_logica'
         else 'edicao' end,
    v_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create or replace function public.registrar_acesso_master(p_empresa_id uuid, p_modulo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_master() then raise exception 'Acesso restrito ao Admin Master'; end if;
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, novo_valor)
  values (p_empresa_id, auth.uid(), p_modulo, 'acesso_admin_master', jsonb_build_object('accessed_at',now()));
end $$;

do $$
declare t text;
begin
  foreach t in array array['categorias_documentos','tipos_documentos','tipos_equipamentos','documentos','equipamentos','calibracoes','qualificacoes','manutencoes','anexos','pendencias','tratativas_pendencias','alertas','configuracoes_empresa'] loop
    execute format('drop trigger if exists trg_%I_audit_fields on public.%I',t,t);
    execute format('create trigger trg_%I_audit_fields before insert or update on public.%I for each row execute function public.set_audit_fields()',t,t);
    execute format('drop trigger if exists trg_%I_audit_log on public.%I',t,t);
    execute format('create trigger trg_%I_audit_log after insert or update or delete on public.%I for each row execute function public.audit_row_change()',t,t);
  end loop;
end $$;



-- === 20260701000300_rls_and_storage.sql ===

-- Conform Flow â€” RLS multiempresa e storage privado

alter table public.planos enable row level security;
alter table public.empresas enable row level security;
alter table public.usuarios enable row level security;
alter table public.usuarios_empresas enable row level security;
alter table public.logs_auditoria enable row level security;

create policy planos_read on public.planos for select to authenticated using (ativo or public.is_master());
create policy planos_master_write on public.planos for all to authenticated using (public.is_master()) with check (public.is_master());

create policy empresas_read on public.empresas for select to authenticated using (public.has_company_access(id));
create policy empresas_master_insert on public.empresas for insert to authenticated with check (public.is_master());
create policy empresas_update on public.empresas for update to authenticated using (public.can_admin_company(id)) with check (public.can_admin_company(id));

create policy usuarios_read on public.usuarios for select to authenticated using (
  id = auth.uid() or public.is_master() or exists (
    select 1 from public.usuarios_empresas mine
    join public.usuarios_empresas theirs on theirs.empresa_id = mine.empresa_id
    where mine.usuario_id = auth.uid() and theirs.usuario_id = usuarios.id
      and mine.ativo and theirs.ativo and mine.deleted_at is null and theirs.deleted_at is null
  )
);
create policy usuarios_self_update on public.usuarios for update to authenticated using (id = auth.uid() or public.is_master()) with check (id = auth.uid() or public.is_master());
create policy usuarios_master_insert on public.usuarios for insert to authenticated with check (public.is_master() or id = auth.uid());

create policy usuarios_empresas_read on public.usuarios_empresas for select to authenticated using (
  usuario_id = auth.uid() or public.has_company_access(empresa_id)
);
create policy usuarios_empresas_insert on public.usuarios_empresas for insert to authenticated with check (public.can_admin_company(empresa_id));
create policy usuarios_empresas_update on public.usuarios_empresas for update to authenticated using (public.can_admin_company(empresa_id)) with check (public.can_admin_company(empresa_id));

create policy logs_read on public.logs_auditoria for select to authenticated using (public.has_company_access(empresa_id));

do $$
declare t text;
begin
  foreach t in array array['documentos','equipamentos','calibracoes','qualificacoes','manutencoes','anexos','pendencias','tratativas_pendencias','alertas','configuracoes_empresa'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_company_access(empresa_id) and deleted_at is null)',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_write_company(empresa_id) and deleted_at is null)',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_write_company(empresa_id)) with check (public.can_write_company(empresa_id) and (deleted_at is null or public.can_admin_company(empresa_id)))',t||'_update',t);
  end loop;

  foreach t in array array['categorias_documentos','tipos_documentos','tipos_equipamentos'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy %I on public.%I for select to authenticated using ((empresa_id is null and padrao_plataforma) or public.has_company_access(empresa_id))',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((empresa_id is null and public.is_master()) or public.can_admin_company(empresa_id))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using ((empresa_id is null and public.is_master()) or public.can_admin_company(empresa_id)) with check ((empresa_id is null and public.is_master()) or public.can_admin_company(empresa_id))',t||'_update',t);
  end loop;
end $$;

-- Valida que registros filhos e catÃ¡logos pertencem ao mesmo tenant.
create or replace function public.validate_company_relationships()
returns trigger language plpgsql set search_path = public as $$
declare linked_empresa uuid;
begin
  if tg_table_name in ('calibracoes','qualificacoes') then
    select empresa_id into linked_empresa from public.equipamentos where id = new.equipamento_id and deleted_at is null;
    if linked_empresa is null or linked_empresa <> new.empresa_id then raise exception 'Equipamento nÃ£o pertence Ã  empresa informada'; end if;
  end if;
  if tg_table_name = 'manutencoes' then
    if new.equipamento_id is not null then
      select empresa_id into linked_empresa from public.equipamentos where id = new.equipamento_id and deleted_at is null;
      if linked_empresa is null or linked_empresa <> new.empresa_id then raise exception 'Equipamento nÃ£o pertence Ã  empresa informada'; end if;
    end if;
  end if;
  if tg_table_name = 'documentos' then
    if new.categoria_id is not null then
      select empresa_id into linked_empresa from public.categorias_documentos where id = new.categoria_id and deleted_at is null;
      if linked_empresa is not null and linked_empresa <> new.empresa_id then raise exception 'Categoria nÃ£o pertence Ã  empresa informada'; end if;
    end if;
    if new.tipo_documento_id is not null then
      select empresa_id into linked_empresa from public.tipos_documentos where id = new.tipo_documento_id and deleted_at is null;
      if linked_empresa is not null and linked_empresa <> new.empresa_id then raise exception 'Tipo de documento nÃ£o pertence Ã  empresa informada'; end if;
    end if;
  end if;
  if tg_table_name = 'equipamentos' then
    if new.tipo_equipamento_id is not null then
      select empresa_id into linked_empresa from public.tipos_equipamentos where id = new.tipo_equipamento_id and deleted_at is null;
      if linked_empresa is not null and linked_empresa <> new.empresa_id then raise exception 'Tipo de equipamento nÃ£o pertence Ã  empresa informada'; end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_calibracoes_company on public.calibracoes;
create trigger trg_calibracoes_company before insert or update on public.calibracoes for each row execute function public.validate_company_relationships();
drop trigger if exists trg_qualificacoes_company on public.qualificacoes;
create trigger trg_qualificacoes_company before insert or update on public.qualificacoes for each row execute function public.validate_company_relationships();
drop trigger if exists trg_manutencoes_company on public.manutencoes;
create trigger trg_manutencoes_company before insert or update on public.manutencoes for each row execute function public.validate_company_relationships();
drop trigger if exists trg_documentos_company on public.documentos;
create trigger trg_documentos_company before insert or update on public.documentos for each row execute function public.validate_company_relationships();
drop trigger if exists trg_equipamentos_company on public.equipamentos;
create trigger trg_equipamentos_company before insert or update on public.equipamentos for each row execute function public.validate_company_relationships();

-- Bucket privado. Execute apÃ³s habilitar Storage no projeto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias','evidencias',false,20971520,array[
  'application/pdf','image/jpeg','image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]) on conflict (id) do update set public = false;

create policy evidencias_read on storage.objects for select to authenticated using (
  bucket_id = 'evidencias'
  and public.has_company_access(((storage.foldername(name))[1])::uuid)
);
create policy evidencias_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'evidencias'
  and public.can_write_company(((storage.foldername(name))[1])::uuid)
);
create policy evidencias_update on storage.objects for update to authenticated using (
  bucket_id = 'evidencias'
  and public.can_write_company(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'evidencias'
  and public.can_write_company(((storage.foldername(name))[1])::uuid)
);



-- === 20260701000400_default_catalogs.sql ===

-- Conform Flow â€” catÃ¡logos iniciais idempotentes
insert into public.planos(nome, limite_usuarios, limite_documentos, limite_equipamentos, limite_storage_mb)
values
  ('Essencial',3,200,30,1024),
  ('Profissional',10,1000,150,5120),
  ('Enterprise',50,null,null,20480)
on conflict (nome) do nothing;

insert into public.categorias_documentos(nome,padrao_plataforma,ativo)
select x.nome,true,true from (values
  ('AlvarÃ¡ sanitÃ¡rio'),('LicenÃ§a de funcionamento'),('AVCB'),('Contrato de resÃ­duos'),
  ('Contrato de dedetizaÃ§Ã£o'),('Limpeza de caixa d''Ã¡gua'),('POP'),('Manual de boas prÃ¡ticas'),
  ('Certificado de treinamento'),('Responsabilidade tÃ©cnica'),('Certificado'),('Documento interno'),('Outro')
) x(nome)
where not exists (select 1 from public.categorias_documentos c where c.empresa_id is null and lower(c.nome)=lower(x.nome));

insert into public.tipos_documentos(nome,exige_anexo,padrao_plataforma,ativo)
select x.nome,x.exige,true,true from (values
  ('LicenÃ§a',true),('Contrato',true),('Procedimento',true),('Certificado',true),
  ('Manual',true),('Registro interno',false),('Outro',true)
) x(nome,exige)
where not exists (select 1 from public.tipos_documentos t where t.empresa_id is null and lower(t.nome)=lower(x.nome));

insert into public.tipos_equipamentos(nome,padrao_plataforma,ativo)
select x.nome,true,true from (values
  ('Geladeira'),('Freezer'),('CÃ¢mara fria'),('TermÃ´metro'),('TermohigrÃ´metro'),
  ('BalanÃ§a'),('Autoclave'),('Data logger'),('OxÃ­metro'),('Aparelho de pressÃ£o'),
  ('Ar-condicionado'),('Equipamento assistencial'),('Outro')
) x(nome)
where not exists (select 1 from public.tipos_equipamentos t where t.empresa_id is null and lower(t.nome)=lower(x.nome));



-- === 20260701000500_alerting.sql ===

-- Conform Flow â€” fila idempotente de alertas
create or replace view public.vw_itens_vencimento with (security_invoker = true) as
select d.empresa_id, 'documentos'::text modulo, d.id registro_id, d.nome titulo,
       d.data_vencimento, d.responsavel_id
from public.documentos d where d.deleted_at is null and d.data_vencimento is not null
union all
select c.empresa_id, 'calibracoes', c.id, 'CalibraÃ§Ã£o â€” ' || e.nome,
       c.data_vencimento, c.responsavel_id
from public.calibracoes c join public.equipamentos e on e.id = c.equipamento_id
where c.deleted_at is null and e.deleted_at is null and c.data_vencimento is not null
union all
select q.empresa_id, 'qualificacoes', q.id, 'QualificaÃ§Ã£o â€” ' || e.nome,
       q.data_vencimento, q.responsavel_tecnico_id
from public.qualificacoes q join public.equipamentos e on e.id = q.equipamento_id
where q.deleted_at is null and e.deleted_at is null and q.data_vencimento is not null
union all
select m.empresa_id, 'manutencoes', m.id,
       'ManutenÃ§Ã£o â€” ' || coalesce(e.nome,m.nome_servico), m.proxima_manutencao, m.responsavel_interno_id
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
    case when r.marco = -1 then r.titulo || ' estÃ¡ vencido desde ' || to_char(r.data_vencimento,'DD/MM/YYYY')
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
  if p_acao not in ('visualizacao_anexo','download_anexo') then raise exception 'AÃ§Ã£o invÃ¡lida'; end if;
  select * into a from public.anexos where id = p_anexo_id and deleted_at is null;
  if a.id is null or not public.has_company_access(a.empresa_id) then raise exception 'Acesso negado'; end if;
  insert into public.logs_auditoria(empresa_id,usuario_id,modulo,acao,registro_id,ip,user_agent)
  values(a.empresa_id,auth.uid(),a.modulo,p_acao,a.registro_id,p_ip,p_user_agent);
end $$;



-- === 20260701000600_backend_api.sql ===

-- Conform Flow â€” API transacional consumida pelo Lovable
-- O frontend nÃ£o deve escrever diretamente nas tabelas operacionais.

create or replace function public.api_contexto_usuario()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'SessÃ£o invÃ¡lida' using errcode = '28000'; end if;
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
  if result is null then raise exception 'Perfil nÃ£o encontrado'; end if;
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
  if not exists(select 1 from public.equipamentos where id=p_equipamento_id and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'Equipamento nÃ£o encontrado'; end if;
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
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  if nullif(trim(p_payload->>'nome'),'') is null then raise exception 'Nome Ã© obrigatÃ³rio'; end if;
  insert into public.documentos(empresa_id,nome,categoria_id,tipo_documento_id,numero_documento,orgao_emissor,responsavel_id,data_emissao,data_vencimento,periodicidade_meses,alerta_antecedencia_dias,exige_anexo,setor_unidade,observacoes)
  values(p_empresa_id,trim(p_payload->>'nome'),nullif(p_payload->>'categoria_id','')::uuid,nullif(p_payload->>'tipo_documento_id','')::uuid,nullif(p_payload->>'numero_documento',''),nullif(p_payload->>'orgao_emissor',''),nullif(p_payload->>'responsavel_id','')::uuid,nullif(p_payload->>'data_emissao','')::date,nullif(p_payload->>'data_vencimento','')::date,nullif(p_payload->>'periodicidade_meses','')::integer,coalesce(array(select jsonb_array_elements_text(p_payload->'dias_alerta')::integer),array[60,30,15,7,0]),coalesce((p_payload->>'exige_anexo')::boolean,true),nullif(p_payload->>'setor_unidade',''),nullif(p_payload->>'observacoes','')) returning * into row_created;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_criar_equipamento(p_empresa_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row_created public.equipamentos;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  if nullif(trim(p_payload->>'nome'),'') is null then raise exception 'Nome Ã© obrigatÃ³rio'; end if;
  insert into public.equipamentos(empresa_id,nome,tipo_equipamento_id,codigo_interno,numero_serie,fabricante,modelo,setor,localizacao,criticidade,status,responsavel_id,observacoes)
  values(p_empresa_id,trim(p_payload->>'nome'),nullif(p_payload->>'tipo_equipamento_id','')::uuid,nullif(p_payload->>'codigo_interno',''),nullif(p_payload->>'numero_serie',''),nullif(p_payload->>'fabricante',''),nullif(p_payload->>'modelo',''),nullif(p_payload->>'setor',''),nullif(p_payload->>'localizacao',''),coalesce(nullif(p_payload->>'criticidade',''),'media'),coalesce(nullif(p_payload->>'status',''),'ativo'),nullif(p_payload->>'responsavel_id','')::uuid,nullif(p_payload->>'observacoes','')) returning * into row_created;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_criar_calibracao(p_empresa_id uuid,p_equipamento_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row_created public.calibracoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  if not exists(select 1 from public.equipamentos where id=p_equipamento_id and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'Equipamento invÃ¡lido'; end if;
  if nullif(p_payload->>'data_calibracao','') is null or nullif(p_payload->>'resultado','') is null then raise exception 'Data e resultado sÃ£o obrigatÃ³rios'; end if;
  insert into public.calibracoes(empresa_id,equipamento_id,data_calibracao,data_vencimento,numero_certificado,laboratorio_responsavel,resultado,responsavel_id,observacoes)
  values(p_empresa_id,p_equipamento_id,(p_payload->>'data_calibracao')::date,nullif(p_payload->>'data_vencimento','')::date,nullif(p_payload->>'numero_certificado',''),nullif(p_payload->>'laboratorio_responsavel',''),p_payload->>'resultado',nullif(p_payload->>'responsavel_id','')::uuid,nullif(p_payload->>'observacoes','')) returning * into row_created;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_criar_qualificacao(p_empresa_id uuid,p_equipamento_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row_created public.qualificacoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  if not exists(select 1 from public.equipamentos where id=p_equipamento_id and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'Equipamento invÃ¡lido'; end if;
  if nullif(p_payload->>'data_qualificacao','') is null or nullif(p_payload->>'tipo','') is null or nullif(p_payload->>'resultado','') is null then raise exception 'Tipo, data e resultado sÃ£o obrigatÃ³rios'; end if;
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
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  if equipment is null and nullif(trim(p_payload->>'nome_servico'),'') is null then raise exception 'Informe equipamento ou serviÃ§o'; end if;
  if equipment is not null and not exists(select 1 from public.equipamentos where id=equipment and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'Equipamento invÃ¡lido'; end if;
  if maintenance_nature not in ('preventiva','corretiva') then raise exception 'Natureza da manutenÃ§Ã£o invÃ¡lida'; end if;
  if nullif(p_payload->>'data_manutencao','') is null then raise exception 'Data da manutenÃ§Ã£o Ã© obrigatÃ³ria'; end if;
  if maintenance_nature='corretiva' and equipment is null then raise exception 'ManutenÃ§Ã£o corretiva deve estar vinculada a um equipamento'; end if;
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
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  if not exists(select 1 from public.pendencias where id=p_pendencia_id and empresa_id=p_empresa_id and deleted_at is null) then raise exception 'PendÃªncia invÃ¡lida'; end if;
  if nullif(trim(p_payload->>'descricao'),'') is null then raise exception 'DescriÃ§Ã£o Ã© obrigatÃ³ria'; end if;
  insert into public.tratativas_pendencias(empresa_id,pendencia_id,descricao,responsavel_id,prazo,status,data_conclusao)
  values(p_empresa_id,p_pendencia_id,trim(p_payload->>'descricao'),nullif(p_payload->>'responsavel_id','')::uuid,nullif(p_payload->>'prazo','')::date,coalesce(nullif(p_payload->>'status',''),'pendente'),case when p_payload->>'status'='concluida' then now() end) returning * into row_created;
  update public.pendencias set status=case when row_created.status='concluida' then 'concluida' else 'em_andamento' end,concluida_at=case when row_created.status='concluida' then now() end where id=p_pendencia_id;
  return to_jsonb(row_created);
end $$;

create or replace function public.api_excluir_logicamente(p_empresa_id uuid,p_modulo text,p_registro_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare allowed text[] := array['documentos','equipamentos','calibracoes','qualificacoes','manutencoes','pendencias']; affected integer;
begin
  if not public.can_admin_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  if not (p_modulo=any(allowed)) then raise exception 'MÃ³dulo invÃ¡lido'; end if;
  execute format('update public.%I set deleted_at=now(),updated_at=now(),updated_by=$1 where id=$2 and empresa_id=$3 and deleted_at is null',p_modulo)
  using auth.uid(),p_registro_id,p_empresa_id;
  get diagnostics affected=row_count;
  if affected=0 then raise exception 'Registro nÃ£o encontrado'; end if;
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


-- === 20260701000700_backend_lockdown.sql ===

-- Conform Flow â€” impede que o Lovable contorne a API de negÃ³cio.

create or replace function public.api_marcar_alerta_lido(p_alerta_id uuid,p_lido boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.alertas set status=case when p_lido then 'lido' else 'nao_lido' end,updated_at=now(),updated_by=auth.uid()
  where id=p_alerta_id and usuario_id=auth.uid() and deleted_at is null;
  if not found then raise exception 'Alerta nÃ£o encontrado'; end if;
end $$;

create or replace function public.api_salvar_configuracoes(p_empresa_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare saved public.configuracoes_empresa;
begin
  if not public.can_admin_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
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

-- Leitura Ã© feita com RLS. Toda escrita passa por RPC ou Edge Function.
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



-- === 20260701000800_backend_queries.sql ===

-- Conform Flow â€” consultas paginadas; filtros e contagens permanecem no backend.

create or replace function public.api_listar_documentos(
  p_empresa_id uuid,p_busca text default null,p_status text default null,p_limite integer default 25,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  p_limite:=least(greatest(p_limite,1),100); p_offset:=greatest(p_offset,0);
  with filtered as (
    select d.* from public.vw_documentos_status d where d.empresa_id=p_empresa_id
      and (p_busca is null or d.nome ilike '%'||p_busca||'%' or coalesce(d.numero_documento,'') ilike '%'||p_busca||'%')
      and (p_status is null or d.status_calculado=p_status)
  ), page as (select * from filtered order by data_vencimento nulls last,nome limit p_limite offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'limit',p_limite,'offset',p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_equipamentos(
  p_empresa_id uuid,p_busca text default null,p_status text default null,p_limite integer default 25,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  p_limite:=least(greatest(p_limite,1),100); p_offset:=greatest(p_offset,0);
  with filtered as (
    select e.* from public.vw_equipamentos_conformidade e where e.empresa_id=p_empresa_id
      and (p_busca is null or e.nome ilike '%'||p_busca||'%' or coalesce(e.codigo_interno,'') ilike '%'||p_busca||'%' or coalesce(e.numero_serie,'') ilike '%'||p_busca||'%')
      and (p_status is null or e.status_consolidado=p_status)
  ), page as (select * from filtered order by nome limit p_limite offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'limit',p_limite,'offset',p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_manutencoes(
  p_empresa_id uuid,p_busca text default null,p_status text default null,p_natureza text default null,
  p_equipamento_id uuid default null,p_limite integer default 25,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  p_limite:=least(greatest(p_limite,1),100); p_offset:=greatest(p_offset,0);
  with filtered as (
    select m.*,e.nome equipamento_nome,coalesce(e.nome,m.nome_servico) item_nome
    from public.vw_manutencoes_status m left join public.equipamentos e on e.id=m.equipamento_id
    where m.empresa_id=p_empresa_id
      and (p_busca is null or coalesce(e.nome,m.nome_servico,'') ilike '%'||p_busca||'%' or coalesce(m.numero_ordem_servico,'') ilike '%'||p_busca||'%')
      and (p_status is null or m.status_calculado=p_status)
      and (p_natureza is null or m.natureza=p_natureza)
      and (p_equipamento_id is null or m.equipamento_id=p_equipamento_id)
  ), page as (select * from filtered order by proxima_manutencao nulls last limit p_limite offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'limit',p_limite,'offset',p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_pendencias(
  p_empresa_id uuid,p_status text default null,p_responsavel_id uuid default null,p_limite integer default 25,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  p_limite:=least(greatest(p_limite,1),100); p_offset:=greatest(p_offset,0);
  with filtered as (
    select p.*,u.nome responsavel_nome,(current_date-p.prazo) dias_atraso
    from public.pendencias p left join public.usuarios u on u.id=p.responsavel_id
    where p.empresa_id=p_empresa_id and p.deleted_at is null
      and (p_status is null or p.status=p_status) and (p_responsavel_id is null or p.responsavel_id=p_responsavel_id)
  ), page as (select * from filtered order by prazo nulls last limit p_limite offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'limit',p_limite,'offset',p_offset) into result;
  return result;
end $$;

create or replace function public.api_listar_alertas(p_empresa_id uuid,p_somente_nao_lidos boolean default false,p_limite integer default 50)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc),'[]'::jsonb) into result from (
    select id,modulo,registro_id,titulo,mensagem,data_vencimento,status,created_at
    from public.alertas where empresa_id=p_empresa_id and usuario_id=auth.uid() and deleted_at is null
      and (not p_somente_nao_lidos or status='nao_lido') order by created_at desc limit least(greatest(p_limite,1),100)
  ) a;
  return result;
end $$;

revoke all on function public.api_listar_documentos(uuid,text,text,integer,integer) from public,anon;
revoke all on function public.api_listar_equipamentos(uuid,text,text,integer,integer) from public,anon;
revoke all on function public.api_listar_manutencoes(uuid,text,text,text,uuid,integer,integer) from public,anon;
revoke all on function public.api_listar_pendencias(uuid,text,uuid,integer,integer) from public,anon;
revoke all on function public.api_listar_alertas(uuid,boolean,integer) from public,anon;
grant execute on function public.api_listar_documentos(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.api_listar_equipamentos(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.api_listar_manutencoes(uuid,text,text,text,uuid,integer,integer) to authenticated;
grant execute on function public.api_listar_pendencias(uuid,text,uuid,integer,integer) to authenticated;
grant execute on function public.api_listar_alertas(uuid,boolean,integer) to authenticated;


-- === 20260701000900_backend_updates.sql ===

-- Conform Flow â€” atualizaÃ§Ãµes validadas no backend.

create or replace function public.api_atualizar_documento(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.documentos;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
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
  if saved.id is null then raise exception 'Documento nÃ£o encontrado'; end if;
  if nullif(saved.nome,'') is null then raise exception 'Nome Ã© obrigatÃ³rio'; end if;
  return to_jsonb(saved);
end $$;

create or replace function public.api_atualizar_equipamento(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.equipamentos;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
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
  if saved.id is null then raise exception 'Equipamento nÃ£o encontrado'; end if;
  if nullif(saved.nome,'') is null then raise exception 'Nome Ã© obrigatÃ³rio'; end if;
  return to_jsonb(saved);
end $$;

create or replace function public.api_atualizar_calibracao(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.calibracoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  update public.calibracoes c set
    data_calibracao=case when p_payload?'data_calibracao' then (p_payload->>'data_calibracao')::date else c.data_calibracao end,
    data_vencimento=case when p_payload?'data_vencimento' then nullif(p_payload->>'data_vencimento','')::date else c.data_vencimento end,
    numero_certificado=case when p_payload?'numero_certificado' then nullif(p_payload->>'numero_certificado','') else c.numero_certificado end,
    laboratorio_responsavel=case when p_payload?'laboratorio_responsavel' then nullif(p_payload->>'laboratorio_responsavel','') else c.laboratorio_responsavel end,
    resultado=case when p_payload?'resultado' then p_payload->>'resultado' else c.resultado end,
    responsavel_id=case when p_payload?'responsavel_id' then nullif(p_payload->>'responsavel_id','')::uuid else c.responsavel_id end,
    observacoes=case when p_payload?'observacoes' then nullif(p_payload->>'observacoes','') else c.observacoes end
  where c.id=p_id and c.empresa_id=p_empresa_id and c.deleted_at is null returning c.* into saved;
  if saved.id is null then raise exception 'CalibraÃ§Ã£o nÃ£o encontrada'; end if;
  return to_jsonb(saved);
end $$;

create or replace function public.api_atualizar_qualificacao(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.qualificacoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  update public.qualificacoes q set
    tipo=case when p_payload?'tipo' then p_payload->>'tipo' else q.tipo end,
    data_qualificacao=case when p_payload?'data_qualificacao' then (p_payload->>'data_qualificacao')::date else q.data_qualificacao end,
    data_vencimento=case when p_payload?'data_vencimento' then nullif(p_payload->>'data_vencimento','')::date else q.data_vencimento end,
    resultado=case when p_payload?'resultado' then p_payload->>'resultado' else q.resultado end,
    responsavel_tecnico_id=case when p_payload?'responsavel_tecnico_id' then nullif(p_payload->>'responsavel_tecnico_id','')::uuid else q.responsavel_tecnico_id end,
    empresa_executora=case when p_payload?'empresa_executora' then nullif(p_payload->>'empresa_executora','') else q.empresa_executora end,
    observacoes=case when p_payload?'observacoes' then nullif(p_payload->>'observacoes','') else q.observacoes end
  where q.id=p_id and q.empresa_id=p_empresa_id and q.deleted_at is null returning q.* into saved;
  if saved.id is null then raise exception 'QualificaÃ§Ã£o nÃ£o encontrada'; end if;
  return to_jsonb(saved);
end $$;

create or replace function public.api_atualizar_manutencao(p_empresa_id uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.manutencoes;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
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
  if saved.id is null then raise exception 'ManutenÃ§Ã£o nÃ£o encontrada'; end if;
  if saved.natureza='corretiva' and saved.equipamento_id is null then raise exception 'ManutenÃ§Ã£o corretiva deve estar vinculada a um equipamento'; end if;
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


-- === 20260701001000_scale_and_plan_limits.sql ===

-- Conform Flow â€” integridade multi-tenant, quotas e Ã­ndices para escala.

alter table public.equipamentos add constraint uq_equipamentos_id_empresa unique(id,empresa_id);
alter table public.calibracoes add constraint fk_calibracoes_equipamento_empresa
  foreign key(equipamento_id,empresa_id) references public.equipamentos(id,empresa_id);
alter table public.qualificacoes add constraint fk_qualificacoes_equipamento_empresa
  foreign key(equipamento_id,empresa_id) references public.equipamentos(id,empresa_id);
alter table public.manutencoes add constraint fk_manutencoes_equipamento_empresa
  foreign key(equipamento_id,empresa_id) references public.equipamentos(id,empresa_id);

create index if not exists idx_documentos_empresa_status_dates on public.documentos(empresa_id,deleted_at,data_vencimento);
create index if not exists idx_calibracoes_empresa_equipamento on public.calibracoes(empresa_id,equipamento_id,data_calibracao desc) where deleted_at is null;
create index if not exists idx_qualificacoes_empresa_equipamento on public.qualificacoes(empresa_id,equipamento_id,data_qualificacao desc) where deleted_at is null;
create index if not exists idx_manutencoes_empresa_equipamento on public.manutencoes(empresa_id,equipamento_id,data_manutencao desc) where deleted_at is null;
create index if not exists idx_alertas_dispatch on public.alertas(empresa_id,email_status,created_at) where deleted_at is null;
create index if not exists idx_logs_created_brin on public.logs_auditoria using brin(created_at);

create or replace view public.vw_consumo_empresa with (security_invoker=true) as
select e.id empresa_id,e.nome_fantasia,
  (select count(*) from public.documentos d where d.empresa_id=e.id and d.deleted_at is null) documentos,
  (select count(*) from public.equipamentos eq where eq.empresa_id=e.id and eq.deleted_at is null) equipamentos,
  (select coalesce(sum(a.tamanho_bytes),0) from public.anexos a where a.empresa_id=e.id and a.deleted_at is null and a.status='ativo') storage_bytes,
  p.limite_documentos,p.limite_equipamentos,p.limite_storage_mb
from public.empresas e left join public.planos p on p.id=e.plano_id
where e.deleted_at is null;

create or replace function public.validate_plan_record_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare limit_value integer; current_value bigint;
begin
  if tg_table_name='documentos' then
    select p.limite_documentos into limit_value from public.empresas e join public.planos p on p.id=e.plano_id where e.id=new.empresa_id;
    if limit_value is not null then
      select count(*) into current_value from public.documentos where empresa_id=new.empresa_id and deleted_at is null;
    end if;
  elsif tg_table_name='equipamentos' then
    select p.limite_equipamentos into limit_value from public.empresas e join public.planos p on p.id=e.plano_id where e.id=new.empresa_id;
    if limit_value is not null then
      select count(*) into current_value from public.equipamentos where empresa_id=new.empresa_id and deleted_at is null;
    end if;
  end if;
  if limit_value is not null and current_value>=limit_value then
    raise exception 'Limite do plano atingido para %',tg_table_name using errcode='P0001';
  end if;
  return new;
end $$;

create trigger trg_documentos_plan_limit before insert on public.documentos for each row execute function public.validate_plan_record_limit();
create trigger trg_equipamentos_plan_limit before insert on public.equipamentos for each row execute function public.validate_plan_record_limit();

create or replace function public.api_verificar_limite_storage(p_empresa_id uuid,p_novos_bytes bigint)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare used_bytes bigint; max_bytes bigint;
begin
  if not public.can_write_company(p_empresa_id) then raise exception 'Sem permissÃ£o' using errcode='42501'; end if;
  if p_novos_bytes<=0 then raise exception 'Tamanho invÃ¡lido'; end if;
  select coalesce(c.storage_bytes,0),case when c.limite_storage_mb is null then null else c.limite_storage_mb::bigint*1024*1024 end
  into used_bytes,max_bytes from public.vw_consumo_empresa c where c.empresa_id=p_empresa_id;
  return jsonb_build_object(
    'permitido',max_bytes is null or used_bytes+p_novos_bytes<=max_bytes,
    'usado_bytes',used_bytes,'limite_bytes',max_bytes,'apos_upload_bytes',used_bytes+p_novos_bytes
  );
end $$;

revoke all on function public.api_verificar_limite_storage(uuid,bigint) from public,anon;
grant execute on function public.api_verificar_limite_storage(uuid,bigint) to authenticated;
grant select on public.vw_consumo_empresa to authenticated;

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Logs de auditoria sÃ£o imutÃ¡veis';
end $$;

create trigger trg_logs_immutable before update or delete on public.logs_auditoria for each row execute function public.prevent_audit_mutation();



-- === 20260701001100_tenant_security_hardening.sql ===

-- Conform Flow â€” hardening de seguranÃ§a multiempresa.
-- CNPJ Ã© identificador cadastral. O isolamento real usa empresa_id + auth.uid() + RLS.

create or replace function public.normalize_cnpj(p_cnpj text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g')
$$;

alter table public.empresas
  add column if not exists cnpj_normalizado text;

update public.empresas
set cnpj_normalizado = public.normalize_cnpj(cnpj)
where cnpj_normalizado is null
   or cnpj_normalizado <> public.normalize_cnpj(cnpj);

alter table public.empresas
  alter column cnpj_normalizado set not null;

alter table public.empresas
  drop constraint if exists empresas_cnpj_normalizado_len;

alter table public.empresas
  add constraint empresas_cnpj_normalizado_len
  check (cnpj_normalizado ~ '^[0-9]{14}$');

create unique index if not exists uq_empresas_cnpj_normalizado_ativo
  on public.empresas(cnpj_normalizado)
  where deleted_at is null;

alter table public.pendencias
  drop constraint if exists pendencias_modulo_allowed;

alter table public.pendencias
  add constraint pendencias_modulo_allowed
  check (modulo in ('documentos','equipamentos','calibracoes','qualificacoes','manutencoes'));

alter table public.alertas
  drop constraint if exists alertas_modulo_allowed;

alter table public.alertas
  add constraint alertas_modulo_allowed
  check (modulo in ('documentos','equipamentos','calibracoes','qualificacoes','manutencoes','pendencias'));

create or replace function public.set_empresa_cnpj_normalizado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cnpj_normalizado := public.normalize_cnpj(new.cnpj);
  if new.cnpj_normalizado !~ '^[0-9]{14}$' then
    raise exception 'CNPJ invÃ¡lido. Informe 14 dÃ­gitos.';
  end if;
  return new;
end $$;

drop trigger if exists trg_empresas_cnpj_normalizado on public.empresas;
create trigger trg_empresas_cnpj_normalizado
before insert or update of cnpj on public.empresas
for each row execute function public.set_empresa_cnpj_normalizado();

create index if not exists idx_usuarios_empresas_usuario_ativo
  on public.usuarios_empresas(usuario_id, empresa_id)
  where ativo and deleted_at is null;

create index if not exists idx_usuarios_empresas_empresa_ativo
  on public.usuarios_empresas(empresa_id, usuario_id)
  where ativo and deleted_at is null;

create or replace function public.user_belongs_to_company(p_usuario_id uuid, p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_usuario_id is null or exists (
    select 1
    from public.usuarios_empresas ue
    join public.usuarios u on u.id = ue.usuario_id
    where ue.usuario_id = p_usuario_id
      and ue.empresa_id = p_empresa_id
      and ue.ativo
      and ue.deleted_at is null
      and u.status = 'ativo'
      and u.deleted_at is null
  )
$$;

create or replace function public.assert_user_in_company(
  p_usuario_id uuid,
  p_empresa_id uuid,
  p_field text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_usuario_id is not null and not public.user_belongs_to_company(p_usuario_id, p_empresa_id) then
    raise exception 'UsuÃ¡rio informado no campo % nÃ£o pertence Ã  empresa do registro.', p_field
      using errcode = '42501';
  end if;
end $$;

create or replace function public.record_exists_in_company(
  p_table_name text,
  p_record_id uuid,
  p_empresa_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed_tables constant text[] := array[
    'documentos',
    'equipamentos',
    'calibracoes',
    'qualificacoes',
    'manutencoes',
    'pendencias'
  ];
  exists_record boolean;
begin
  if p_table_name <> all(allowed_tables) then
    raise exception 'MÃ³dulo invÃ¡lido para validaÃ§Ã£o de tenant: %', p_table_name;
  end if;

  execute format(
    'select exists(select 1 from public.%I where id = $1 and empresa_id = $2 and deleted_at is null)',
    p_table_name
  )
  using p_record_id, p_empresa_id
  into exists_record;

  return coalesce(exists_record, false);
end $$;

create or replace function public.validate_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_prefix text;
begin
  if tg_table_name = 'documentos' then
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'equipamentos' then
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'calibracoes' then
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'qualificacoes' then
    perform public.assert_user_in_company(new.responsavel_tecnico_id, new.empresa_id, 'responsavel_tecnico_id');

  elsif tg_table_name = 'manutencoes' then
    perform public.assert_user_in_company(new.responsavel_interno_id, new.empresa_id, 'responsavel_interno_id');

  elsif tg_table_name = 'pendencias' then
    if not public.record_exists_in_company(new.modulo, new.registro_id, new.empresa_id) then
      raise exception 'PendÃªncia aponta para registro inexistente ou de outra empresa.' using errcode = '42501';
    end if;
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'tratativas_pendencias' then
    if not exists (
      select 1 from public.pendencias p
      where p.id = new.pendencia_id
        and p.empresa_id = new.empresa_id
        and p.deleted_at is null
    ) then
      raise exception 'PendÃªncia nÃ£o pertence Ã  empresa informada.' using errcode = '42501';
    end if;
    perform public.assert_user_in_company(new.responsavel_id, new.empresa_id, 'responsavel_id');

  elsif tg_table_name = 'alertas' then
    if not public.record_exists_in_company(new.modulo, new.registro_id, new.empresa_id) then
      raise exception 'Alerta aponta para registro inexistente ou de outra empresa.' using errcode = '42501';
    end if;
    perform public.assert_user_in_company(new.usuario_id, new.empresa_id, 'usuario_id');

  elsif tg_table_name = 'anexos' then
    if not public.record_exists_in_company(new.modulo, new.registro_id, new.empresa_id) then
      raise exception 'Anexo aponta para registro inexistente ou de outra empresa.' using errcode = '42501';
    end if;

    expected_prefix := new.empresa_id::text || '/' || new.modulo || '/' || new.registro_id::text || '/';
    if new.storage_path is null or new.storage_path not like expected_prefix || '%' then
      raise exception 'Caminho do arquivo nÃ£o corresponde Ã  empresa/mÃ³dulo/registro do anexo.' using errcode = '42501';
    end if;

    if new.substitui_anexo_id is not null and not exists (
      select 1
      from public.anexos previous
      where previous.id = new.substitui_anexo_id
        and previous.empresa_id = new.empresa_id
        and previous.modulo = new.modulo
        and previous.registro_id = new.registro_id
        and previous.deleted_at is null
    ) then
      raise exception 'Anexo substituÃ­do nÃ£o pertence ao mesmo registro da empresa.' using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
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
    execute format('drop trigger if exists trg_%I_tenant_integrity on public.%I', t, t);
    execute format(
      'create trigger trg_%I_tenant_integrity before insert or update on public.%I for each row execute function public.validate_tenant_integrity()',
      t,
      t
    );
  end loop;
end $$;

create or replace function public.api_empresa_atual(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  company public.empresas;
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select * into company
  from public.empresas
  where id = p_empresa_id
    and deleted_at is null;

  if company.id is null then
    raise exception 'Empresa nÃ£o encontrada';
  end if;

  return jsonb_build_object(
    'id', company.id,
    'razao_social', company.razao_social,
    'nome_fantasia', company.nome_fantasia,
    'cnpj', company.cnpj,
    'status', company.status,
    'perfil', public.company_role(company.id)
  );
end $$;

revoke all on function public.api_empresa_atual(uuid) from public, anon;
grant execute on function public.api_empresa_atual(uuid) to authenticated;


-- === 20260701001200_finance_plans_and_feature_gates.sql ===

-- Conform Flow â€” financeiro, planos comerciais e controle de recursos por plano.
-- O Admin Master pode alterar planos/valores; empresas sÃ³ usam recursos permitidos.

alter table public.planos
  add column if not exists codigo text,
  add column if not exists descricao text,
  add column if not exists valor_mensal_centavos integer not null default 0,
  add column if not exists valor_anual_centavos integer,
  add column if not exists moeda char(3) not null default 'BRL',
  add column if not exists trial_dias integer not null default 0,
  add column if not exists disponivel_venda boolean not null default true,
  add column if not exists recursos jsonb not null default '{}'::jsonb,
  add column if not exists ordem integer not null default 0;

update public.planos
set
  codigo = coalesce(codigo, lower(regexp_replace(nome, '[^a-zA-Z0-9]+', '-', 'g'))),
  recursos = case nome
    when 'Essencial' then jsonb_build_object(
      'documentos', true,
      'equipamentos', true,
      'calibracoes', true,
      'qualificacoes', false,
      'manutencoes', true,
      'pendencias', true,
      'alertas', true,
      'relatorios', false,
      'auditoria', false,
      'usuarios', true,
      'anexos', true
    )
    when 'Profissional' then jsonb_build_object(
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
      'anexos', true
    )
    when 'Enterprise' then jsonb_build_object(
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
    else recursos
  end,
  valor_mensal_centavos = case nome
    when 'Essencial' then 19700
    when 'Profissional' then 39700
    when 'Enterprise' then 149000
    else valor_mensal_centavos
  end,
  valor_anual_centavos = case nome
    when 'Essencial' then 197000
    when 'Profissional' then 397000
    when 'Enterprise' then 1490000
    else valor_anual_centavos
  end,
  ordem = case nome
    when 'Essencial' then 10
    when 'Profissional' then 20
    when 'Enterprise' then 30
    else ordem
  end;

alter table public.planos
  alter column codigo set not null;

create unique index if not exists uq_planos_codigo
  on public.planos(codigo);

alter table public.planos
  drop constraint if exists planos_valores_validos;

alter table public.planos
  add constraint planos_valores_validos
  check (
    valor_mensal_centavos >= 0
    and (valor_anual_centavos is null or valor_anual_centavos >= 0)
    and trial_dias >= 0
    and moeda ~ '^[A-Z]{3}$'
  );

create table if not exists public.assinaturas_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id),
  plano_id uuid not null references public.planos(id),
  status text not null default 'trial' check (status in ('trial','ativa','pagamento_pendente','inadimplente','bloqueada','cancelada')),
  ciclo text not null default 'mensal' check (ciclo in ('mensal','anual','personalizado')),
  valor_mensal_centavos integer not null default 0 check (valor_mensal_centavos >= 0),
  valor_anual_centavos integer check (valor_anual_centavos is null or valor_anual_centavos >= 0),
  desconto_centavos integer not null default 0 check (desconto_centavos >= 0),
  desconto_percentual numeric(5,2) not null default 0 check (desconto_percentual >= 0 and desconto_percentual <= 100),
  moeda char(3) not null default 'BRL' check (moeda ~ '^[A-Z]{3}$'),
  gateway text,
  gateway_customer_id text,
  gateway_subscription_id text,
  trial_termina_em date,
  proximo_vencimento date,
  ultimo_pagamento_em date,
  cancelada_em timestamptz,
  bloqueada_em timestamptz,
  observacoes_internas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.usuarios(id),
  updated_by uuid references public.usuarios(id)
);

create table if not exists public.faturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  assinatura_id uuid not null references public.assinaturas_empresas(id),
  competencia date not null,
  vencimento date not null,
  valor_centavos integer not null check (valor_centavos >= 0),
  desconto_centavos integer not null default 0 check (desconto_centavos >= 0),
  valor_pago_centavos integer check (valor_pago_centavos is null or valor_pago_centavos >= 0),
  moeda char(3) not null default 'BRL' check (moeda ~ '^[A-Z]{3}$'),
  status text not null default 'pendente' check (status in ('pendente','paga','vencida','cancelada','estornada')),
  forma_pagamento text check (forma_pagamento is null or forma_pagamento in ('pix','boleto','cartao','transferencia','manual')),
  gateway text,
  gateway_invoice_id text,
  link_pagamento text,
  paga_em timestamptz,
  observacoes_internas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.usuarios(id),
  updated_by uuid references public.usuarios(id),
  unique (empresa_id, competencia)
);

create table if not exists public.historico_planos_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  assinatura_id uuid references public.assinaturas_empresas(id),
  plano_anterior_id uuid references public.planos(id),
  plano_novo_id uuid references public.planos(id),
  valor_anterior_centavos integer,
  valor_novo_centavos integer,
  motivo text,
  alterado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now()
);

alter table public.assinaturas_empresas enable row level security;
alter table public.faturas enable row level security;
alter table public.historico_planos_empresas enable row level security;

drop policy if exists assinaturas_master_all on public.assinaturas_empresas;
create policy assinaturas_master_all on public.assinaturas_empresas
  for all to authenticated using (public.is_master()) with check (public.is_master());

drop policy if exists assinaturas_company_read on public.assinaturas_empresas;
create policy assinaturas_company_read on public.assinaturas_empresas
  for select to authenticated using (public.has_company_access(empresa_id));

drop policy if exists faturas_master_all on public.faturas;
create policy faturas_master_all on public.faturas
  for all to authenticated using (public.is_master()) with check (public.is_master());

drop policy if exists faturas_company_read on public.faturas;
create policy faturas_company_read on public.faturas
  for select to authenticated using (public.has_company_access(empresa_id));

drop policy if exists historico_planos_master_read on public.historico_planos_empresas;
create policy historico_planos_master_read on public.historico_planos_empresas
  for select to authenticated using (public.is_master());

create index if not exists idx_assinaturas_status_vencimento
  on public.assinaturas_empresas(status, proximo_vencimento)
  where deleted_at is null;

create index if not exists idx_faturas_status_vencimento
  on public.faturas(status, vencimento)
  where deleted_at is null;

create or replace function public.sync_company_plan_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.empresas
  set
    plano_id = new.plano_id,
    status = case
      when new.status in ('inadimplente','bloqueada','cancelada') then 'bloqueada'
      else 'ativa'
    end,
    updated_at = now()
  where id = new.empresa_id;

  return new;
end $$;

drop trigger if exists trg_assinaturas_sync_empresa on public.assinaturas_empresas;
create trigger trg_assinaturas_sync_empresa
after insert or update of plano_id, status on public.assinaturas_empresas
for each row execute function public.sync_company_plan_from_subscription();

create or replace function public.company_billing_allows_write(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select a.status in ('trial','ativa','pagamento_pendente')
    from public.assinaturas_empresas a
    where a.empresa_id = p_empresa_id
      and a.deleted_at is null
    limit 1
  ), true)
$$;

create or replace function public.plan_feature_enabled(p_empresa_id uuid, p_recurso text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select coalesce((p.recursos ->> p_recurso)::boolean, false)
    from public.empresas e
    join public.planos p on p.id = e.plano_id
    where e.id = p_empresa_id
      and e.deleted_at is null
      and p.ativo
  ), false)
$$;

create or replace function public.assert_plan_feature(p_empresa_id uuid, p_recurso text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.plan_feature_enabled(p_empresa_id, p_recurso) then
    raise exception 'Recurso % nÃ£o estÃ¡ disponÃ­vel no plano contratado.', p_recurso
      using errcode = '42501';
  end if;
end $$;

create or replace function public.can_write_company(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.company_role(p_empresa_id) in ('master','administrador','responsavel_tecnico','colaborador')
    and public.company_billing_allows_write(p_empresa_id),
    false
  )
$$;

create or replace function public.validate_plan_record_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_value integer;
  current_value bigint;
begin
  if tg_table_name = 'documentos' then
    perform public.assert_plan_feature(new.empresa_id, 'documentos');
    select p.limite_documentos into limit_value
    from public.empresas e join public.planos p on p.id = e.plano_id
    where e.id = new.empresa_id;

    if limit_value is not null then
      select count(*) into current_value
      from public.documentos
      where empresa_id = new.empresa_id and deleted_at is null;
    end if;

  elsif tg_table_name = 'equipamentos' then
    perform public.assert_plan_feature(new.empresa_id, 'equipamentos');
    select p.limite_equipamentos into limit_value
    from public.empresas e join public.planos p on p.id = e.plano_id
    where e.id = new.empresa_id;

    if limit_value is not null then
      select count(*) into current_value
      from public.equipamentos
      where empresa_id = new.empresa_id and deleted_at is null;
    end if;
  end if;

  if limit_value is not null and current_value >= limit_value then
    raise exception 'Limite do plano atingido para %', tg_table_name using errcode = 'P0001';
  end if;

  return new;
end $$;

create or replace function public.validate_plan_feature_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'calibracoes' then
    perform public.assert_plan_feature(new.empresa_id, 'calibracoes');
  elsif tg_table_name = 'qualificacoes' then
    perform public.assert_plan_feature(new.empresa_id, 'qualificacoes');
  elsif tg_table_name = 'manutencoes' then
    perform public.assert_plan_feature(new.empresa_id, 'manutencoes');
  elsif tg_table_name = 'pendencias' then
    perform public.assert_plan_feature(new.empresa_id, 'pendencias');
  elsif tg_table_name = 'alertas' then
    perform public.assert_plan_feature(new.empresa_id, 'alertas');
  elsif tg_table_name = 'anexos' then
    perform public.assert_plan_feature(new.empresa_id, 'anexos');
  end if;

  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['calibracoes','qualificacoes','manutencoes','pendencias','alertas','anexos'] loop
    execute format('drop trigger if exists trg_%I_plan_feature on public.%I', t, t);
    execute format(
      'create trigger trg_%I_plan_feature before insert or update on public.%I for each row execute function public.validate_plan_feature_usage()',
      t,
      t
    );
  end loop;
end $$;

create or replace function public.validate_user_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_value integer;
  current_value bigint;
begin
  if new.ativo and new.deleted_at is null then
    perform public.assert_plan_feature(new.empresa_id, 'usuarios');

    select p.limite_usuarios into limit_value
    from public.empresas e join public.planos p on p.id = e.plano_id
    where e.id = new.empresa_id;

    if limit_value is not null then
      select count(*) into current_value
      from public.usuarios_empresas ue
      where ue.empresa_id = new.empresa_id
        and ue.ativo
        and ue.deleted_at is null
        and (tg_op = 'INSERT' or ue.id <> new.id);

      if current_value >= limit_value then
        raise exception 'Limite de usuÃ¡rios do plano atingido.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_usuarios_empresas_plan_limit on public.usuarios_empresas;
create trigger trg_usuarios_empresas_plan_limit
before insert or update on public.usuarios_empresas
for each row execute function public.validate_user_plan_limit();

create or replace function public.api_master_financeiro_resumo()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'empresas_ativas', (select count(*) from public.empresas where status = 'ativa' and deleted_at is null),
    'empresas_bloqueadas', (select count(*) from public.empresas where status = 'bloqueada' and deleted_at is null),
    'assinaturas_ativas', (select count(*) from public.assinaturas_empresas where status in ('trial','ativa','pagamento_pendente') and deleted_at is null),
    'assinaturas_inadimplentes', (select count(*) from public.assinaturas_empresas where status in ('inadimplente','bloqueada') and deleted_at is null),
    'usuarios_ativos', (
      select count(distinct ue.usuario_id)
      from public.usuarios_empresas ue
      join public.usuarios u on u.id = ue.usuario_id
      where ue.ativo and ue.deleted_at is null and u.status = 'ativo' and u.deleted_at is null
    ),
    'receita_mensal_prevista_centavos', (
      select coalesce(sum(greatest(a.valor_mensal_centavos - a.desconto_centavos, 0)), 0)
      from public.assinaturas_empresas a
      where a.status in ('trial','ativa','pagamento_pendente') and a.deleted_at is null
    ),
    'receita_recebida_mes_centavos', (
      select coalesce(sum(f.valor_pago_centavos), 0)
      from public.faturas f
      where f.status = 'paga'
        and f.paga_em >= date_trunc('month', now())
        and f.deleted_at is null
    ),
    'proximos_pagamentos', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.proximo_vencimento), '[]'::jsonb)
      from (
        select e.id empresa_id, e.nome_fantasia, e.cnpj, a.status, a.proximo_vencimento,
               greatest(a.valor_mensal_centavos - a.desconto_centavos, 0) valor_centavos
        from public.assinaturas_empresas a
        join public.empresas e on e.id = a.empresa_id
        where a.deleted_at is null
          and a.status in ('trial','ativa','pagamento_pendente')
        order by a.proximo_vencimento nulls last
        limit 10
      ) x
    ),
    'pagamentos_atrasados', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.vencimento), '[]'::jsonb)
      from (
        select e.id empresa_id, e.nome_fantasia, e.cnpj, f.id fatura_id, f.vencimento, f.valor_centavos, f.status
        from public.faturas f
        join public.empresas e on e.id = f.empresa_id
        where f.deleted_at is null
          and f.status in ('pendente','vencida')
          and f.vencimento < current_date
        order by f.vencimento
        limit 10
      ) x
    )
  );
end $$;

create or replace function public.api_master_listar_planos()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(p) order by p.ordem, p.valor_mensal_centavos), '[]'::jsonb)
    from public.planos p
  );
end $$;

create or replace function public.api_master_salvar_plano(p_plano_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.planos;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  if p_plano_id is null then
    insert into public.planos(
      nome, codigo, descricao, limite_usuarios, limite_documentos, limite_equipamentos, limite_storage_mb,
      valor_mensal_centavos, valor_anual_centavos, moeda, trial_dias, disponivel_venda, recursos, ativo, ordem
    )
    values (
      trim(p_payload->>'nome'),
      lower(regexp_replace(coalesce(nullif(p_payload->>'codigo',''), p_payload->>'nome'), '[^a-zA-Z0-9]+', '-', 'g')),
      nullif(p_payload->>'descricao',''),
      coalesce(nullif(p_payload->>'limite_usuarios','')::integer, 5),
      nullif(p_payload->>'limite_documentos','')::integer,
      nullif(p_payload->>'limite_equipamentos','')::integer,
      coalesce(nullif(p_payload->>'limite_storage_mb','')::integer, 1024),
      coalesce(nullif(p_payload->>'valor_mensal_centavos','')::integer, 0),
      nullif(p_payload->>'valor_anual_centavos','')::integer,
      coalesce(nullif(p_payload->>'moeda',''), 'BRL'),
      coalesce(nullif(p_payload->>'trial_dias','')::integer, 0),
      coalesce((p_payload->>'disponivel_venda')::boolean, true),
      coalesce(p_payload->'recursos', '{}'::jsonb),
      coalesce((p_payload->>'ativo')::boolean, true),
      coalesce(nullif(p_payload->>'ordem','')::integer, 0)
    )
    returning * into saved;
  else
    update public.planos p
    set
      nome = coalesce(nullif(trim(p_payload->>'nome'), ''), p.nome),
      codigo = coalesce(nullif(lower(regexp_replace(p_payload->>'codigo', '[^a-zA-Z0-9]+', '-', 'g')), ''), p.codigo),
      descricao = coalesce(p_payload->>'descricao', p.descricao),
      limite_usuarios = coalesce(nullif(p_payload->>'limite_usuarios','')::integer, p.limite_usuarios),
      limite_documentos = case when p_payload ? 'limite_documentos' then nullif(p_payload->>'limite_documentos','')::integer else p.limite_documentos end,
      limite_equipamentos = case when p_payload ? 'limite_equipamentos' then nullif(p_payload->>'limite_equipamentos','')::integer else p.limite_equipamentos end,
      limite_storage_mb = coalesce(nullif(p_payload->>'limite_storage_mb','')::integer, p.limite_storage_mb),
      valor_mensal_centavos = coalesce(nullif(p_payload->>'valor_mensal_centavos','')::integer, p.valor_mensal_centavos),
      valor_anual_centavos = case when p_payload ? 'valor_anual_centavos' then nullif(p_payload->>'valor_anual_centavos','')::integer else p.valor_anual_centavos end,
      moeda = coalesce(nullif(p_payload->>'moeda',''), p.moeda),
      trial_dias = coalesce(nullif(p_payload->>'trial_dias','')::integer, p.trial_dias),
      disponivel_venda = coalesce((p_payload->>'disponivel_venda')::boolean, p.disponivel_venda),
      recursos = coalesce(p_payload->'recursos', p.recursos),
      ativo = coalesce((p_payload->>'ativo')::boolean, p.ativo),
      ordem = coalesce(nullif(p_payload->>'ordem','')::integer, p.ordem),
      updated_at = now()
    where p.id = p_plano_id
    returning * into saved;
  end if;

  return to_jsonb(saved);
end $$;

create or replace function public.api_master_atualizar_assinatura(p_empresa_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  previous public.assinaturas_empresas;
  saved public.assinaturas_empresas;
  target_plan public.planos;
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  select * into target_plan
  from public.planos
  where id = nullif(p_payload->>'plano_id','')::uuid;

  if target_plan.id is null then
    raise exception 'Plano invÃ¡lido.';
  end if;

  select * into previous
  from public.assinaturas_empresas
  where empresa_id = p_empresa_id and deleted_at is null;

  insert into public.assinaturas_empresas(
    empresa_id, plano_id, status, ciclo, valor_mensal_centavos, valor_anual_centavos,
    desconto_centavos, desconto_percentual, moeda, gateway, gateway_customer_id,
    gateway_subscription_id, trial_termina_em, proximo_vencimento, ultimo_pagamento_em,
    observacoes_internas, updated_by, created_by
  )
  values (
    p_empresa_id,
    target_plan.id,
    coalesce(nullif(p_payload->>'status',''), 'ativa'),
    coalesce(nullif(p_payload->>'ciclo',''), 'mensal'),
    coalesce(nullif(p_payload->>'valor_mensal_centavos','')::integer, target_plan.valor_mensal_centavos),
    coalesce(nullif(p_payload->>'valor_anual_centavos','')::integer, target_plan.valor_anual_centavos),
    coalesce(nullif(p_payload->>'desconto_centavos','')::integer, 0),
    coalesce(nullif(p_payload->>'desconto_percentual','')::numeric, 0),
    coalesce(nullif(p_payload->>'moeda',''), target_plan.moeda),
    nullif(p_payload->>'gateway',''),
    nullif(p_payload->>'gateway_customer_id',''),
    nullif(p_payload->>'gateway_subscription_id',''),
    nullif(p_payload->>'trial_termina_em','')::date,
    nullif(p_payload->>'proximo_vencimento','')::date,
    nullif(p_payload->>'ultimo_pagamento_em','')::date,
    nullif(p_payload->>'observacoes_internas',''),
    auth.uid(),
    auth.uid()
  )
  on conflict (empresa_id) do update set
    plano_id = excluded.plano_id,
    status = excluded.status,
    ciclo = excluded.ciclo,
    valor_mensal_centavos = excluded.valor_mensal_centavos,
    valor_anual_centavos = excluded.valor_anual_centavos,
    desconto_centavos = excluded.desconto_centavos,
    desconto_percentual = excluded.desconto_percentual,
    moeda = excluded.moeda,
    gateway = excluded.gateway,
    gateway_customer_id = excluded.gateway_customer_id,
    gateway_subscription_id = excluded.gateway_subscription_id,
    trial_termina_em = excluded.trial_termina_em,
    proximo_vencimento = excluded.proximo_vencimento,
    ultimo_pagamento_em = excluded.ultimo_pagamento_em,
    observacoes_internas = excluded.observacoes_internas,
    updated_by = auth.uid(),
    updated_at = now(),
    deleted_at = null
  returning * into saved;

  insert into public.historico_planos_empresas(
    empresa_id, assinatura_id, plano_anterior_id, plano_novo_id,
    valor_anterior_centavos, valor_novo_centavos, motivo, alterado_por
  )
  values (
    p_empresa_id,
    saved.id,
    previous.plano_id,
    saved.plano_id,
    previous.valor_mensal_centavos,
    saved.valor_mensal_centavos,
    nullif(p_payload->>'motivo',''),
    auth.uid()
  );

  return to_jsonb(saved);
end $$;

create or replace function public.api_master_listar_assinaturas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    raise exception 'Acesso restrito ao Admin Master' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.proximo_vencimento nulls last, x.nome_fantasia), '[]'::jsonb)
    from (
      select
        e.id as empresa_id,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        e.status as empresa_status,
        p.nome as plano_nome,
        p.id as plano_id,
        a.status,
        a.ciclo,
        a.valor_mensal_centavos,
        a.valor_anual_centavos,
        a.desconto_centavos,
        a.desconto_percentual,
        a.proximo_vencimento,
        a.ultimo_pagamento_em,
        (select count(*) from public.usuarios_empresas ue where ue.empresa_id = e.id and ue.ativo and ue.deleted_at is null) usuarios_ativos
      from public.empresas e
      left join public.assinaturas_empresas a on a.empresa_id = e.id and a.deleted_at is null
      left join public.planos p on p.id = coalesce(a.plano_id, e.plano_id)
      where e.deleted_at is null
    ) x
  );
end $$;

revoke all on function public.company_billing_allows_write(uuid) from public, anon;
revoke all on function public.plan_feature_enabled(uuid,text) from public, anon;
revoke all on function public.assert_plan_feature(uuid,text) from public, anon;
revoke all on function public.api_master_financeiro_resumo() from public, anon;
revoke all on function public.api_master_listar_planos() from public, anon;
revoke all on function public.api_master_salvar_plano(uuid,jsonb) from public, anon;
revoke all on function public.api_master_atualizar_assinatura(uuid,jsonb) from public, anon;
revoke all on function public.api_master_listar_assinaturas() from public, anon;

grant execute on function public.company_billing_allows_write(uuid) to authenticated;
grant execute on function public.plan_feature_enabled(uuid,text) to authenticated;
grant execute on function public.api_master_financeiro_resumo() to authenticated;
grant execute on function public.api_master_listar_planos() to authenticated;
grant execute on function public.api_master_salvar_plano(uuid,jsonb) to authenticated;
grant execute on function public.api_master_atualizar_assinatura(uuid,jsonb) to authenticated;
grant execute on function public.api_master_listar_assinaturas() to authenticated;

grant select on public.assinaturas_empresas, public.faturas, public.historico_planos_empresas to authenticated;


-- === 20260701001300_ai_assistant_and_blocked_access.sql ===

-- Conform Flow â€” bloqueio de acesso inadimplente e base do assistente seguro.

create table if not exists public.interacoes_assistente (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  usuario_id uuid references public.usuarios(id),
  pergunta text not null,
  escopo text not null default 'geral' check (escopo in ('geral','equipamento','setor','manutencoes','vencimentos')),
  equipamento_id uuid references public.equipamentos(id),
  setor text,
  resposta text,
  fontes jsonb not null default '[]'::jsonb,
  modelo text not null default 'structured-safe-assistant',
  leu_anexos boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.interacoes_assistente enable row level security;

drop policy if exists interacoes_assistente_read on public.interacoes_assistente;
create policy interacoes_assistente_read on public.interacoes_assistente
  for select to authenticated using (public.has_company_access(empresa_id));

drop policy if exists interacoes_assistente_insert on public.interacoes_assistente;
create policy interacoes_assistente_insert on public.interacoes_assistente
  for insert to authenticated with check (public.can_write_company(empresa_id));

create index if not exists idx_interacoes_assistente_empresa_data
  on public.interacoes_assistente(empresa_id, created_at desc);

create or replace function public.api_assistente_contexto(
  p_empresa_id uuid,
  p_escopo text default 'geral',
  p_equipamento_id uuid default null,
  p_setor text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_company_access(p_empresa_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  perform public.assert_plan_feature(p_empresa_id, 'alertas');

  if p_equipamento_id is not null and not exists (
    select 1 from public.equipamentos e
    where e.id = p_equipamento_id
      and e.empresa_id = p_empresa_id
      and e.deleted_at is null
  ) then
    raise exception 'Equipamento nÃ£o encontrado na empresa informada.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'politica_privacidade', jsonb_build_object(
      'le_anexos', false,
      'usa_storage_path', false,
      'fontes', 'somente metadados estruturados do banco'
    ),
    'equipamentos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id,
        'nome', e.nome,
        'codigo', e.codigo_interno,
        'setor', e.setor,
        'criticidade', e.criticidade,
        'status_consolidado', ec.status_consolidado,
        'status_calibracao', ec.status_calibracao,
        'status_qualificacao', ec.status_qualificacao,
        'status_manutencao', ec.status_manutencao
      ) order by e.nome), '[]'::jsonb)
      from public.equipamentos e
      left join public.vw_equipamentos_conformidade ec on ec.id = e.id
      where e.empresa_id = p_empresa_id
        and e.deleted_at is null
        and (p_equipamento_id is null or e.id = p_equipamento_id)
        and (p_setor is null or lower(e.setor) = lower(p_setor))
    ),
    'manutencoes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'equipamento_id', m.equipamento_id,
        'equipamento', e.nome,
        'setor', e.setor,
        'natureza', m.natureza,
        'tipo_servico', m.tipo_servico,
        'status_execucao', m.status_execucao,
        'data_manutencao', m.data_manutencao,
        'proxima_manutencao', m.proxima_manutencao,
        'status_calculado', vm.status_calculado,
        'prioridade', m.prioridade
      ) order by m.proxima_manutencao nulls last, m.data_manutencao desc), '[]'::jsonb)
      from public.manutencoes m
      left join public.equipamentos e on e.id = m.equipamento_id
      left join public.vw_manutencoes_status vm on vm.id = m.id
      where m.empresa_id = p_empresa_id
        and m.deleted_at is null
        and (p_equipamento_id is null or m.equipamento_id = p_equipamento_id)
        and (p_setor is null or lower(e.setor) = lower(p_setor))
      limit 50
    ),
    'vencimentos', (
      select coalesce(jsonb_agg(item order by item->>'data_vencimento'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'modulo', 'documentos',
          'registro_id', d.id,
          'titulo', d.nome,
          'data_vencimento', d.data_vencimento,
          'status', d.status_calculado
        ) item
        from public.vw_documentos_status d
        where d.empresa_id = p_empresa_id
          and d.data_vencimento is not null
          and d.status_calculado in ('vencido','vence_hoje','critico','a_vencer','atencao')
        union all
        select jsonb_build_object(
          'modulo', 'calibracoes',
          'registro_id', c.id,
          'titulo', 'CalibraÃ§Ã£o â€” ' || e.nome,
          'data_vencimento', c.data_vencimento,
          'status', c.status_calculado
        )
        from public.vw_calibracoes_status c
        join public.equipamentos e on e.id = c.equipamento_id
        where c.empresa_id = p_empresa_id
          and (p_equipamento_id is null or c.equipamento_id = p_equipamento_id)
          and (p_setor is null or lower(e.setor) = lower(p_setor))
          and c.data_vencimento is not null
          and c.status_calculado in ('vencido','vence_hoje','critico','a_vencer','atencao')
        union all
        select jsonb_build_object(
          'modulo', 'qualificacoes',
          'registro_id', q.id,
          'titulo', 'QualificaÃ§Ã£o â€” ' || e.nome,
          'data_vencimento', q.data_vencimento,
          'status', q.status_calculado
        )
        from public.vw_qualificacoes_status q
        join public.equipamentos e on e.id = q.equipamento_id
        where q.empresa_id = p_empresa_id
          and (p_equipamento_id is null or q.equipamento_id = p_equipamento_id)
          and (p_setor is null or lower(e.setor) = lower(p_setor))
          and q.data_vencimento is not null
          and q.status_calculado in ('vencido','vence_hoje','critico','a_vencer','atencao')
        limit 50
      ) s
    ),
    'pendencias', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'modulo', p.modulo,
        'registro_id', p.registro_id,
        'titulo', p.titulo,
        'prazo', p.prazo,
        'status', p.status
      ) order by p.prazo nulls last), '[]'::jsonb)
      from public.pendencias p
      where p.empresa_id = p_empresa_id
        and p.deleted_at is null
        and p.status in ('pendente','em_andamento')
    )
  );
end $$;

revoke all on function public.api_assistente_contexto(uuid,text,uuid,text) from public, anon;
grant execute on function public.api_assistente_contexto(uuid,text,uuid,text) to authenticated;

