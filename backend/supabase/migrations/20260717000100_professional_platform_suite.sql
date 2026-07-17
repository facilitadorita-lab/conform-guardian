-- Conform Flow - suite profissional de governanca, operacao e escala.
-- Todas as regras sensiveis permanecem no backend e respeitam o tenant.

create extension if not exists pgcrypto with schema extensions;

-- O MFA continua disponivel para step-up em operacoes muito sensiveis, mas nao
-- e obrigatorio para o uso administrativo cotidiano (item 6 nao solicitado).
drop trigger if exists trg_planos_privileged_mfa on public.planos;
drop trigger if exists trg_assinaturas_privileged_mfa on public.assinaturas_empresas;
drop trigger if exists trg_usuarios_empresas_privileged_mfa on public.usuarios_empresas;
drop trigger if exists trg_empresas_insert_privileged_mfa on public.empresas;
drop trigger if exists trg_empresas_critical_update_mfa on public.empresas;
drop trigger if exists trg_retencao_privileged_mfa on public.politicas_retencao_empresa;

-- 1. Observabilidade e releases.
create table if not exists public.eventos_erro_sistema (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  ambiente text not null default 'production' check (ambiente in ('development','staging','production')),
  severidade text not null default 'error' check (severidade in ('info','warning','error','fatal')),
  origem text not null,
  rota text,
  mensagem_sanitizada text not null,
  stack_hash text,
  release_version text,
  empresa_id uuid references public.empresas(id) on delete set null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  ocorrencias integer not null default 1 check (ocorrencias > 0),
  primeira_ocorrencia_at timestamptz not null default now(),
  ultima_ocorrencia_at timestamptz not null default now(),
  resolvido_at timestamptz,
  resolvido_por uuid references public.usuarios(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb
);

create unique index if not exists uq_eventos_erro_aberto_fingerprint
  on public.eventos_erro_sistema(ambiente, fingerprint)
  where resolvido_at is null;
create index if not exists idx_eventos_erro_data
  on public.eventos_erro_sistema(ultima_ocorrencia_at desc);

create table if not exists public.implantacoes_sistema (
  id uuid primary key default gen_random_uuid(),
  ambiente text not null check (ambiente in ('development','staging','production')),
  versao text not null,
  commit_sha text,
  origem text not null default 'github_actions',
  status text not null check (status in ('started','succeeded','failed','rolled_back')),
  migrations_aplicadas text[] not null default '{}',
  iniciado_at timestamptz not null default now(),
  concluido_at timestamptz,
  actor_user_id uuid references public.usuarios(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb
);

create index if not exists idx_implantacoes_ambiente_data
  on public.implantacoes_sistema(ambiente, iniciado_at desc);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  chave text not null,
  empresa_id uuid references public.empresas(id),
  ambiente text not null default 'production' check (ambiente in ('development','staging','production')),
  habilitada boolean not null default false,
  rollout_percent integer not null default 100 check (rollout_percent between 0 and 100),
  descricao text,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_feature_flag_scope
  on public.feature_flags(chave, ambiente, coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.eventos_erro_sistema enable row level security;
alter table public.implantacoes_sistema enable row level security;
alter table public.feature_flags enable row level security;
revoke all on public.eventos_erro_sistema, public.implantacoes_sistema, public.feature_flags from anon, authenticated;
grant select on public.eventos_erro_sistema, public.implantacoes_sistema, public.feature_flags to authenticated;
grant all on public.eventos_erro_sistema, public.implantacoes_sistema, public.feature_flags to service_role;

create policy eventos_erro_master_read on public.eventos_erro_sistema
  for select to authenticated using (public.is_master());
create policy implantacoes_master_read on public.implantacoes_sistema
  for select to authenticated using (public.is_master());
create policy feature_flags_master_read on public.feature_flags
  for select to authenticated using (public.is_master());

-- 2. Matriz avancada de permissoes por perfil e por usuario.
create table if not exists public.catalogo_permissoes (
  codigo text primary key,
  modulo text not null,
  acao text not null,
  nome text not null,
  descricao text not null,
  sensivel boolean not null default false,
  ordem integer not null default 0
);

create table if not exists public.permissoes_padrao_perfil (
  perfil text not null,
  permissao_codigo text not null references public.catalogo_permissoes(codigo) on delete cascade,
  permitido boolean not null,
  primary key (perfil, permissao_codigo)
);

create table if not exists public.permissoes_usuario_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  usuario_id uuid not null references public.usuarios(id),
  permissao_codigo text not null references public.catalogo_permissoes(codigo),
  permitido boolean not null,
  justificativa text,
  expira_em timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, usuario_id, permissao_codigo)
);

insert into public.catalogo_permissoes(codigo, modulo, acao, nome, descricao, sensivel, ordem) values
  ('documentos.ler','documentos','ler','Consultar documentos','Visualizar metadados e anexos autorizados.',false,10),
  ('documentos.criar','documentos','criar','Criar documentos','Cadastrar documentos no ambiente.',false,11),
  ('documentos.editar','documentos','editar','Editar documentos','Alterar metadados de documentos.',false,12),
  ('documentos.excluir','documentos','excluir','Arquivar documentos','Executar exclusao logica preservando historico.',true,13),
  ('documentos.submeter','documentos','submeter','Enviar para aprovacao','Criar revisao e iniciar fluxo de aprovacao.',true,14),
  ('documentos.aprovar','documentos','aprovar','Aprovar e assinar','Aprovar, rejeitar e assinar eletronicamente.',true,15),
  ('documentos.exportar','documentos','exportar','Exportar documentos','Gerar exportacoes estruturadas.',true,16),
  ('equipamentos.ler','equipamentos','ler','Consultar equipamentos','Visualizar equipamentos e historicos.',false,20),
  ('equipamentos.criar','equipamentos','criar','Criar equipamentos','Cadastrar equipamentos.',false,21),
  ('equipamentos.editar','equipamentos','editar','Editar equipamentos','Alterar dados de equipamentos.',false,22),
  ('equipamentos.excluir','equipamentos','excluir','Arquivar equipamentos','Executar exclusao logica.',true,23),
  ('calibracoes.criar','calibracoes','criar','Criar calibracoes','Cadastrar calibracoes e certificados.',false,30),
  ('calibracoes.editar','calibracoes','editar','Editar calibracoes','Alterar calibracoes.',false,31),
  ('calibracoes.excluir','calibracoes','excluir','Arquivar calibracoes','Arquivar calibracoes preservando historico.',true,32),
  ('qualificacoes.criar','qualificacoes','criar','Criar qualificacoes','Cadastrar qualificacoes.',false,40),
  ('qualificacoes.editar','qualificacoes','editar','Editar qualificacoes','Alterar qualificacoes.',false,41),
  ('qualificacoes.excluir','qualificacoes','excluir','Arquivar qualificacoes','Arquivar qualificacoes.',true,42),
  ('manutencoes.criar','manutencoes','criar','Criar manutencoes','Cadastrar manutencoes.',false,50),
  ('manutencoes.editar','manutencoes','editar','Editar manutencoes','Alterar manutencoes.',false,51),
  ('manutencoes.excluir','manutencoes','excluir','Arquivar manutencoes','Arquivar manutencoes.',true,52),
  ('pendencias.criar','pendencias','criar','Criar pendencias','Cadastrar pendencias.',false,60),
  ('pendencias.editar','pendencias','editar','Tratar pendencias','Alterar e concluir pendencias.',false,61),
  ('pendencias.excluir','pendencias','excluir','Arquivar pendencias','Arquivar pendencias.',true,62),
  ('anexos.criar','anexos','criar','Enviar anexos','Enviar evidencias privadas.',false,70),
  ('anexos.visualizar','anexos','visualizar','Visualizar anexos','Abrir evidencias privadas.',false,71),
  ('relatorios.ler','relatorios','ler','Gerar relatorios','Gerar e exportar relatorios.',false,80),
  ('relatorios.agendar','relatorios','agendar','Agendar relatorios','Programar envio recorrente.',true,81),
  ('auditoria.ler','auditoria','ler','Consultar auditoria','Visualizar a trilha imutavel.',true,90),
  ('auditoria.exportar','auditoria','exportar','Exportar auditoria','Exportar trilha com hash de integridade.',true,91),
  ('notificacoes.gerenciar','notificacoes','gerenciar','Gerenciar notificacoes','Configurar canais, regras e escalonamento.',true,100),
  ('qualidade.gerenciar','qualidade','gerenciar','Gerenciar qualidade de dados','Executar diagnosticos e tratar achados.',true,110),
  ('usuarios.gerenciar','usuarios','gerenciar','Gerenciar usuarios','Alterar perfis e permissoes.',true,120),
  ('financeiro.visualizar','financeiro','visualizar','Visualizar financeiro','Acessar dados financeiros da empresa.',true,130)
on conflict (codigo) do update set
  modulo = excluded.modulo, acao = excluded.acao, nome = excluded.nome,
  descricao = excluded.descricao, sensivel = excluded.sensivel, ordem = excluded.ordem;

insert into public.permissoes_padrao_perfil(perfil, permissao_codigo, permitido)
select perfil, c.codigo,
  case
    when perfil in ('administrador','administrador_provisorio') then true
    when perfil = 'responsavel_tecnico' then c.codigo not in (
      'usuarios.gerenciar','financeiro.visualizar','documentos.excluir','equipamentos.excluir',
      'calibracoes.excluir','qualificacoes.excluir','manutencoes.excluir','pendencias.excluir'
    )
    when perfil = 'colaborador' then c.codigo in (
      'documentos.ler','documentos.criar','documentos.editar','documentos.submeter',
      'equipamentos.ler','equipamentos.criar','equipamentos.editar',
      'calibracoes.criar','calibracoes.editar','qualificacoes.criar','qualificacoes.editar',
      'manutencoes.criar','manutencoes.editar','pendencias.criar','pendencias.editar',
      'anexos.criar','anexos.visualizar','relatorios.ler'
    )
    when perfil = 'somente_leitura' then c.codigo in (
      'documentos.ler','equipamentos.ler','anexos.visualizar','relatorios.ler'
    )
    else false
  end
from (values ('administrador'),('administrador_provisorio'),('responsavel_tecnico'),('colaborador'),('somente_leitura')) p(perfil)
cross join public.catalogo_permissoes c
on conflict (perfil, permissao_codigo) do update set permitido = excluded.permitido;

alter table public.catalogo_permissoes enable row level security;
alter table public.permissoes_padrao_perfil enable row level security;
alter table public.permissoes_usuario_empresa enable row level security;
revoke all on public.catalogo_permissoes, public.permissoes_padrao_perfil, public.permissoes_usuario_empresa from anon, authenticated;
grant select on public.catalogo_permissoes, public.permissoes_padrao_perfil, public.permissoes_usuario_empresa to authenticated;
grant all on public.catalogo_permissoes, public.permissoes_padrao_perfil, public.permissoes_usuario_empresa to service_role;

create policy catalogo_permissoes_read on public.catalogo_permissoes
  for select to authenticated using (true);
create policy permissoes_padrao_read on public.permissoes_padrao_perfil
  for select to authenticated using (true);
create policy permissoes_usuario_tenant_read on public.permissoes_usuario_empresa
  for select to authenticated using (public.can_admin_company(empresa_id) or usuario_id = auth.uid());

create or replace function public.has_company_permission(p_empresa_id uuid, p_codigo text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select case
    when public.is_master() then true
    else coalesce(
      (
        select pue.permitido
        from public.permissoes_usuario_empresa pue
        where pue.empresa_id = p_empresa_id
          and pue.usuario_id = auth.uid()
          and pue.permissao_codigo = p_codigo
          and (pue.expira_em is null or pue.expira_em > now())
      ),
      (
        select ppp.permitido
        from public.usuarios_empresas ue
        join public.permissoes_padrao_perfil ppp on ppp.perfil = ue.perfil
        where ue.empresa_id = p_empresa_id
          and ue.usuario_id = auth.uid()
          and ue.ativo
          and ue.deleted_at is null
          and ppp.permissao_codigo = p_codigo
      ),
      false
    )
  end
$$;

revoke all on function public.has_company_permission(uuid,text) from public, anon;
grant execute on function public.has_company_permission(uuid,text) to authenticated, service_role;

create or replace function public.api_matriz_permissoes_empresa(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.can_admin_company(p_empresa_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'catalogo', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.ordem, c.codigo) from public.catalogo_permissoes c
    ), '[]'::jsonb),
    'usuarios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'usuario_id', u.id, 'nome', u.nome, 'email', u.email, 'perfil', ue.perfil,
        'permissoes', (
          select jsonb_object_agg(c.codigo, coalesce(o.permitido, d.permitido, false))
          from public.catalogo_permissoes c
          left join public.permissoes_padrao_perfil d on d.perfil = ue.perfil and d.permissao_codigo = c.codigo
          left join public.permissoes_usuario_empresa o on o.empresa_id = p_empresa_id
            and o.usuario_id = u.id and o.permissao_codigo = c.codigo
            and (o.expira_em is null or o.expira_em > now())
        ),
        'overrides', (
          select coalesce(jsonb_object_agg(o.permissao_codigo, o.permitido), '{}'::jsonb)
          from public.permissoes_usuario_empresa o
          where o.empresa_id = p_empresa_id and o.usuario_id = u.id
            and (o.expira_em is null or o.expira_em > now())
        )
      ) order by u.nome)
      from public.usuarios_empresas ue
      join public.usuarios u on u.id = ue.usuario_id
      where ue.empresa_id = p_empresa_id and ue.ativo and ue.deleted_at is null and u.deleted_at is null
    ), '[]'::jsonb)
  );
end
$$;

create or replace function public.api_salvar_permissoes_usuario(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_permissoes jsonb,
  p_justificativa text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_item record;
begin
  if not public.can_admin_company(p_empresa_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_usuario_id = auth.uid() and not public.is_master() then raise exception 'SELF_PERMISSION_CHANGE_NOT_ALLOWED'; end if;
  if not exists (
    select 1 from public.usuarios_empresas ue
    where ue.empresa_id = p_empresa_id and ue.usuario_id = p_usuario_id and ue.ativo and ue.deleted_at is null
  ) then raise exception 'USER_NOT_IN_COMPANY'; end if;
  if jsonb_typeof(p_permissoes) <> 'object' then raise exception 'INVALID_PERMISSIONS'; end if;

  for v_item in select key, value from jsonb_each(p_permissoes)
  loop
    if not exists (select 1 from public.catalogo_permissoes c where c.codigo = v_item.key) then
      raise exception 'UNKNOWN_PERMISSION:%', v_item.key;
    end if;
    insert into public.permissoes_usuario_empresa(
      empresa_id, usuario_id, permissao_codigo, permitido, justificativa, created_by, updated_by
    ) values (
      p_empresa_id, p_usuario_id, v_item.key, (v_item.value #>> '{}')::boolean,
      nullif(trim(p_justificativa), ''), auth.uid(), auth.uid()
    )
    on conflict (empresa_id, usuario_id, permissao_codigo) do update
      set permitido = excluded.permitido, justificativa = excluded.justificativa,
          updated_by = auth.uid(), updated_at = now();
  end loop;

  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, registro_id, novo_valor)
  values (p_empresa_id, auth.uid(), 'usuarios', 'alteracao_matriz_permissoes', p_usuario_id,
          jsonb_build_object('permissoes', p_permissoes, 'justificativa', p_justificativa));
  return jsonb_build_object('ok', true, 'usuario_id', p_usuario_id);
end
$$;

revoke all on function public.api_matriz_permissoes_empresa(uuid) from public, anon;
revoke all on function public.api_salvar_permissoes_usuario(uuid,uuid,jsonb,text) from public, anon;
grant execute on function public.api_matriz_permissoes_empresa(uuid) to authenticated;
grant execute on function public.api_salvar_permissoes_usuario(uuid,uuid,jsonb,text) to authenticated;

create or replace function public.enforce_granular_operation_permission()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_empresa_id uuid;
  v_modulo text;
  v_acao text;
begin
  if auth.uid() is null or public.is_master() then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  v_empresa_id := case when tg_op = 'DELETE' then old.empresa_id else new.empresa_id end;
  v_modulo := tg_table_name;
  v_acao := case tg_op when 'INSERT' then 'criar' when 'UPDATE' then 'editar' else 'excluir' end;
  if not public.has_company_permission(v_empresa_id, v_modulo || '.' || v_acao) then
    raise exception 'PERMISSION_DENIED:%', v_modulo || '.' || v_acao using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end
$$;

do $$
declare v_table text;
begin
  foreach v_table in array array['documentos','equipamentos','calibracoes','qualificacoes','manutencoes','pendencias']
  loop
    execute format('drop trigger if exists trg_%I_granular_permission on public.%I', v_table, v_table);
    execute format(
      'create trigger trg_%I_granular_permission before insert or update or delete on public.%I for each row execute function public.enforce_granular_operation_permission()',
      v_table, v_table
    );
  end loop;
end
$$;

-- 3. Auditoria com cadeia de hash e exportacao verificavel.
alter table public.logs_auditoria
  add column if not exists correlation_id text,
  add column if not exists previous_hash text,
  add column if not exists event_hash text;

drop trigger if exists trg_logs_immutable on public.logs_auditoria;
update public.logs_auditoria
set event_hash = encode(extensions.digest(
  concat_ws('|', id::text, coalesce(empresa_id::text,''), modulo, acao, created_at::text), 'sha256'
), 'hex')
where event_hash is null;

create or replace function public.seal_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext(coalesce(new.empresa_id::text, 'global-audit')));
  select l.event_hash into new.previous_hash
  from public.logs_auditoria l
  where l.empresa_id is not distinct from new.empresa_id
  order by l.created_at desc, l.id desc limit 1;
  new.correlation_id := coalesce(new.correlation_id, gen_random_uuid()::text);
  new.event_hash := encode(digest(
    concat_ws('|', new.id::text, coalesce(new.empresa_id::text,''), coalesce(new.usuario_id::text,''),
      new.modulo, new.acao, coalesce(new.registro_id::text,''), coalesce(new.previous_hash,''),
      coalesce(new.valor_anterior::text,''), coalesce(new.novo_valor::text,''), new.created_at::text),
    'sha256'
  ), 'hex');
  return new;
end
$$;

drop trigger if exists trg_logs_seal on public.logs_auditoria;
create trigger trg_logs_seal before insert on public.logs_auditoria
for each row execute function public.seal_audit_event();
create trigger trg_logs_immutable before update or delete on public.logs_auditoria
for each row execute function public.prevent_audit_mutation();

create or replace function public.api_exportar_auditoria(
  p_empresa_id uuid,
  p_inicio timestamptz default null,
  p_fim timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth, pg_temp
as $$
declare v_events jsonb; v_hash text;
begin
  if not public.has_company_access(p_empresa_id) or not public.has_company_permission(p_empresa_id, 'auditoria.exportar') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at, x.id), '[]'::jsonb)
  into v_events
  from (
    select l.id, l.created_at, l.usuario_id, u.nome usuario, l.modulo, l.acao,
           l.registro_id, l.valor_anterior, l.novo_valor, l.ip::text ip, l.user_agent,
           l.correlation_id, l.previous_hash, l.event_hash
    from public.logs_auditoria l
    left join public.usuarios u on u.id = l.usuario_id
    where l.empresa_id = p_empresa_id
      and (p_inicio is null or l.created_at >= p_inicio)
      and (p_fim is null or l.created_at <= p_fim)
    order by l.created_at, l.id
    limit 10000
  ) x;
  v_hash := encode(digest(v_events::text, 'sha256'), 'hex');
  insert into public.logs_auditoria(empresa_id, usuario_id, modulo, acao, novo_valor)
  values (p_empresa_id, auth.uid(), 'auditoria', 'exportacao_auditoria',
          jsonb_build_object('payload_hash', v_hash, 'inicio', p_inicio, 'fim', p_fim));
  return jsonb_build_object(
    'schema_version', 1, 'empresa_id', p_empresa_id, 'gerado_em', now(),
    'payload_hash_sha256', v_hash, 'eventos', v_events
  );
end
$$;

revoke all on function public.api_exportar_auditoria(uuid,timestamptz,timestamptz) from public, anon;
grant execute on function public.api_exportar_auditoria(uuid,timestamptz,timestamptz) to authenticated;

-- 4. Revisao, aprovacao e assinatura eletronica de documentos.
alter table public.documentos
  add column if not exists workflow_status text not null default 'rascunho',
  add column if not exists versao_atual integer not null default 1,
  add column if not exists exige_aprovacao boolean not null default false,
  add column if not exists politica_aprovacao jsonb not null default '{"separacao_funcoes":true}'::jsonb;

do $$ begin
  alter table public.documentos add constraint documentos_workflow_status_check
    check (workflow_status in ('rascunho','em_aprovacao','aprovado','reprovado','arquivado'));
exception when duplicate_object then null; end $$;

create table if not exists public.documento_revisoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  documento_id uuid not null references public.documentos(id),
  numero_versao integer not null,
  status text not null default 'em_aprovacao' check (status in ('em_aprovacao','aprovada','reprovada','substituida')),
  snapshot_json jsonb not null,
  conteudo_hash text not null,
  comentario_submissao text,
  created_by uuid not null references public.usuarios(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (documento_id, numero_versao)
);

create table if not exists public.assinaturas_eletronicas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  documento_id uuid not null references public.documentos(id),
  documento_revisao_id uuid not null references public.documento_revisoes(id),
  signatario_id uuid not null references public.usuarios(id),
  declaracao text not null,
  documento_hash text not null,
  auth_aal text not null default 'aal1',
  ip inet,
  user_agent text,
  signed_at timestamptz not null default now()
);

create table if not exists public.documento_aprovacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  documento_id uuid not null references public.documentos(id),
  documento_revisao_id uuid not null references public.documento_revisoes(id),
  decisao text not null check (decisao in ('aprovado','reprovado')),
  comentario text,
  decidido_por uuid not null references public.usuarios(id),
  assinatura_id uuid references public.assinaturas_eletronicas(id),
  decidido_at timestamptz not null default now()
);

create index if not exists idx_documento_revisoes_tenant_doc
  on public.documento_revisoes(empresa_id, documento_id, numero_versao desc);
create index if not exists idx_assinaturas_documento
  on public.assinaturas_eletronicas(empresa_id, documento_id, signed_at desc);

alter table public.documento_revisoes enable row level security;
alter table public.assinaturas_eletronicas enable row level security;
alter table public.documento_aprovacoes enable row level security;
revoke all on public.documento_revisoes, public.assinaturas_eletronicas, public.documento_aprovacoes from anon, authenticated;
grant select on public.documento_revisoes, public.assinaturas_eletronicas, public.documento_aprovacoes to authenticated;
grant all on public.documento_revisoes, public.assinaturas_eletronicas, public.documento_aprovacoes to service_role;

create policy documento_revisoes_tenant_read on public.documento_revisoes
  for select to authenticated using (public.has_company_access(empresa_id));
create policy assinaturas_tenant_read on public.assinaturas_eletronicas
  for select to authenticated using (public.has_company_access(empresa_id));
create policy aprovacoes_tenant_read on public.documento_aprovacoes
  for select to authenticated using (public.has_company_access(empresa_id));

drop trigger if exists trg_assinaturas_eletronicas_immutable on public.assinaturas_eletronicas;
create trigger trg_assinaturas_eletronicas_immutable before update or delete on public.assinaturas_eletronicas
for each row execute function public.prevent_audit_mutation();

create or replace function public.api_documento_enviar_aprovacao(
  p_empresa_id uuid,
  p_documento_id uuid,
  p_comentario text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth, pg_temp
as $$
declare v_doc public.documentos; v_version integer; v_hash text; v_revision public.documento_revisoes;
begin
  if not public.has_company_permission(p_empresa_id, 'documentos.submeter') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_doc from public.documentos
  where id = p_documento_id and empresa_id = p_empresa_id and deleted_at is null for update;
  if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  if v_doc.workflow_status = 'em_aprovacao' then raise exception 'DOCUMENT_ALREADY_IN_REVIEW'; end if;
  select coalesce(max(numero_versao),0)+1 into v_version
  from public.documento_revisoes where documento_id = p_documento_id;
  v_hash := encode(digest((to_jsonb(v_doc) || jsonb_build_object(
    'anexo', (select to_jsonb(a) - 'created_by' - 'updated_by' from public.anexos a
      where a.empresa_id=p_empresa_id and a.modulo='documentos' and a.registro_id=p_documento_id
        and a.status='ativo' and a.deleted_at is null order by a.versao desc limit 1)
  ))::text, 'sha256'), 'hex');
  insert into public.documento_revisoes(
    empresa_id, documento_id, numero_versao, snapshot_json, conteudo_hash,
    comentario_submissao, created_by
  ) values (p_empresa_id, p_documento_id, v_version, to_jsonb(v_doc), v_hash,
            nullif(trim(p_comentario),''), auth.uid()) returning * into v_revision;
  update public.documentos set workflow_status='em_aprovacao', exige_aprovacao=true,
    versao_atual=v_version, updated_at=now(), updated_by=auth.uid() where id=p_documento_id;
  insert into public.logs_auditoria(empresa_id,usuario_id,modulo,acao,registro_id,novo_valor)
  values(p_empresa_id,auth.uid(),'documentos','enviar_para_aprovacao',p_documento_id,
    jsonb_build_object('revisao_id',v_revision.id,'versao',v_version,'hash',v_hash));
  return to_jsonb(v_revision);
end
$$;

create or replace function public.api_documento_decidir_aprovacao(
  p_empresa_id uuid,
  p_revisao_id uuid,
  p_decisao text,
  p_comentario text default null,
  p_declaracao text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_revision public.documento_revisoes;
  v_doc public.documentos;
  v_signature_id uuid;
  v_aal text := coalesce(auth.jwt()->>'aal','aal1');
begin
  if not public.has_company_permission(p_empresa_id, 'documentos.aprovar') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_decisao not in ('aprovado','reprovado') then raise exception 'INVALID_DECISION'; end if;
  select * into v_revision from public.documento_revisoes
  where id=p_revisao_id and empresa_id=p_empresa_id for update;
  if not found or v_revision.status <> 'em_aprovacao' then raise exception 'REVISION_NOT_PENDING'; end if;
  select * into v_doc from public.documentos where id=v_revision.documento_id and empresa_id=p_empresa_id for update;
  if coalesce((v_doc.politica_aprovacao->>'separacao_funcoes')::boolean,true)
     and v_revision.created_by=auth.uid() and not public.is_master() then
    raise exception 'SEPARATION_OF_DUTIES_REQUIRED' using errcode='42501';
  end if;
  if p_decisao='aprovado' then
    if length(trim(coalesce(p_declaracao,''))) < 10 then raise exception 'SIGNATURE_STATEMENT_REQUIRED'; end if;
    insert into public.assinaturas_eletronicas(
      empresa_id,documento_id,documento_revisao_id,signatario_id,declaracao,
      documento_hash,auth_aal,user_agent
    ) values (p_empresa_id,v_doc.id,v_revision.id,auth.uid(),trim(p_declaracao),
      v_revision.conteudo_hash,v_aal,left(p_user_agent,500)) returning id into v_signature_id;
    update public.documento_revisoes set status='substituida'
      where documento_id=v_doc.id and status='aprovada' and id<>v_revision.id;
    update public.documento_revisoes set status='aprovada',decided_at=now() where id=v_revision.id;
    update public.documentos set workflow_status='aprovado',updated_at=now(),updated_by=auth.uid() where id=v_doc.id;
  else
    if length(trim(coalesce(p_comentario,''))) < 5 then raise exception 'REJECTION_REASON_REQUIRED'; end if;
    update public.documento_revisoes set status='reprovada',decided_at=now() where id=v_revision.id;
    update public.documentos set workflow_status='reprovado',updated_at=now(),updated_by=auth.uid() where id=v_doc.id;
  end if;
  insert into public.documento_aprovacoes(
    empresa_id,documento_id,documento_revisao_id,decisao,comentario,decidido_por,assinatura_id
  ) values(p_empresa_id,v_doc.id,v_revision.id,p_decisao,nullif(trim(p_comentario),''),auth.uid(),v_signature_id);
  insert into public.logs_auditoria(empresa_id,usuario_id,modulo,acao,registro_id,novo_valor)
  values(p_empresa_id,auth.uid(),'documentos','decisao_aprovacao_documento',v_doc.id,
    jsonb_build_object('revisao_id',v_revision.id,'decisao',p_decisao,'assinatura_id',v_signature_id));
  return jsonb_build_object('documento_id',v_doc.id,'revisao_id',v_revision.id,
    'decisao',p_decisao,'assinatura_id',v_signature_id,'hash',v_revision.conteudo_hash);
end
$$;

create or replace function public.api_documento_workflow(p_empresa_id uuid,p_documento_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return jsonb_build_object(
    'documento', (select jsonb_build_object('id',d.id,'workflow_status',d.workflow_status,
      'versao_atual',d.versao_atual,'exige_aprovacao',d.exige_aprovacao)
      from public.documentos d where d.id=p_documento_id and d.empresa_id=p_empresa_id and d.deleted_at is null),
    'revisoes', coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'numero_versao',r.numero_versao,'status',r.status,'conteudo_hash',r.conteudo_hash,
      'comentario_submissao',r.comentario_submissao,'created_by',r.created_by,'created_at',r.created_at,
      'decided_at',r.decided_at,'aprovacoes',coalesce((select jsonb_agg(to_jsonb(a) order by a.decidido_at desc)
        from public.documento_aprovacoes a where a.documento_revisao_id=r.id),'[]'::jsonb)
    ) order by r.numero_versao desc) from public.documento_revisoes r
      where r.empresa_id=p_empresa_id and r.documento_id=p_documento_id),'[]'::jsonb)
  );
end
$$;

revoke all on function public.api_documento_enviar_aprovacao(uuid,uuid,text) from public,anon;
revoke all on function public.api_documento_decidir_aprovacao(uuid,uuid,text,text,text,text) from public,anon;
revoke all on function public.api_documento_workflow(uuid,uuid) from public,anon;
grant execute on function public.api_documento_enviar_aprovacao(uuid,uuid,text) to authenticated;
grant execute on function public.api_documento_decidir_aprovacao(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function public.api_documento_workflow(uuid,uuid) to authenticated;

-- 5. Central profissional de notificacoes.
create table if not exists public.preferencias_notificacao_usuario (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  usuario_id uuid not null references public.usuarios(id),
  canais text[] not null default array['in_app','email'],
  severidade_minima text not null default 'info' check (severidade_minima in ('info','warning','critical')),
  resumo_diario boolean not null default false,
  hora_resumo time not null default '08:00',
  silencio_inicio time,
  silencio_fim time,
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now(),
  unique(empresa_id,usuario_id)
);

create table if not exists public.regras_notificacao_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  nome text not null,
  evento text not null,
  antecedencia_dias integer[] not null default array[60,30,15,7,0],
  canais text[] not null default array['in_app','email'],
  escalonar_apos_horas integer check (escalonar_apos_horas is null or escalonar_apos_horas > 0),
  destinatarios_perfis text[] not null default array['administrador'],
  ativa boolean not null default true,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id,nome)
);

create table if not exists public.entregas_notificacao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  alerta_id uuid references public.alertas(id),
  notificacao_id uuid references public.notificacoes(id),
  usuario_id uuid references public.usuarios(id),
  canal text not null check (canal in ('in_app','email','webhook')),
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','discarded')),
  tentativa integer not null default 0,
  proxima_tentativa_at timestamptz,
  provider_reference text,
  erro_codigo text,
  erro_sanitizado text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(alerta_id,usuario_id,canal)
);

create index if not exists idx_entregas_notificacao_fila
  on public.entregas_notificacao(status,proxima_tentativa_at,created_at);

alter table public.preferencias_notificacao_usuario enable row level security;
alter table public.regras_notificacao_empresa enable row level security;
alter table public.entregas_notificacao enable row level security;
revoke all on public.preferencias_notificacao_usuario, public.regras_notificacao_empresa, public.entregas_notificacao from anon,authenticated;
grant select on public.preferencias_notificacao_usuario, public.regras_notificacao_empresa, public.entregas_notificacao to authenticated;
grant all on public.preferencias_notificacao_usuario, public.regras_notificacao_empresa, public.entregas_notificacao to service_role;
create policy preferencias_notificacao_read on public.preferencias_notificacao_usuario
  for select to authenticated using (usuario_id=auth.uid() or public.can_admin_company(empresa_id));
create policy regras_notificacao_read on public.regras_notificacao_empresa
  for select to authenticated using (public.has_company_access(empresa_id));
create policy entregas_notificacao_read on public.entregas_notificacao
  for select to authenticated using (usuario_id=auth.uid() or public.can_admin_company(empresa_id));

create or replace function public.api_central_notificacoes(p_empresa_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return jsonb_build_object(
    'preferencias', (select to_jsonb(p) from public.preferencias_notificacao_usuario p
      where p.empresa_id=p_empresa_id and p.usuario_id=auth.uid()),
    'regras', coalesce((select jsonb_agg(to_jsonb(r) order by r.nome) from public.regras_notificacao_empresa r
      where r.empresa_id=p_empresa_id),'[]'::jsonb),
    'entregas_30d', jsonb_build_object(
      'total',(select count(*) from public.entregas_notificacao e where e.empresa_id=p_empresa_id and e.created_at>=now()-interval '30 days'),
      'falhas',(select count(*) from public.entregas_notificacao e where e.empresa_id=p_empresa_id and e.status='failed' and e.created_at>=now()-interval '30 days'),
      'enviadas',(select count(*) from public.entregas_notificacao e where e.empresa_id=p_empresa_id and e.status='sent' and e.created_at>=now()-interval '30 days')
    )
  );
end $$;

create or replace function public.api_salvar_preferencias_notificacao(p_empresa_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_saved public.preferencias_notificacao_usuario;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  insert into public.preferencias_notificacao_usuario(
    empresa_id,usuario_id,canais,severidade_minima,resumo_diario,hora_resumo,silencio_inicio,silencio_fim,timezone
  ) values(
    p_empresa_id,auth.uid(),coalesce(array(select jsonb_array_elements_text(p_payload->'canais')),array['in_app','email']),
    coalesce(nullif(p_payload->>'severidade_minima',''),'info'),coalesce((p_payload->>'resumo_diario')::boolean,false),
    coalesce(nullif(p_payload->>'hora_resumo','')::time,'08:00'::time),nullif(p_payload->>'silencio_inicio','')::time,
    nullif(p_payload->>'silencio_fim','')::time,coalesce(nullif(p_payload->>'timezone',''),'America/Sao_Paulo')
  ) on conflict(empresa_id,usuario_id) do update set
    canais=excluded.canais,severidade_minima=excluded.severidade_minima,resumo_diario=excluded.resumo_diario,
    hora_resumo=excluded.hora_resumo,silencio_inicio=excluded.silencio_inicio,silencio_fim=excluded.silencio_fim,
    timezone=excluded.timezone,updated_at=now() returning * into v_saved;
  return to_jsonb(v_saved);
end $$;

create or replace function public.api_salvar_regra_notificacao(p_empresa_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_saved public.regras_notificacao_empresa;
begin
  if not public.has_company_permission(p_empresa_id,'notificacoes.gerenciar') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  insert into public.regras_notificacao_empresa(
    id,empresa_id,nome,evento,antecedencia_dias,canais,escalonar_apos_horas,destinatarios_perfis,ativa,created_by,updated_by
  ) values(
    coalesce(nullif(p_payload->>'id','')::uuid,gen_random_uuid()),p_empresa_id,trim(p_payload->>'nome'),trim(p_payload->>'evento'),
    coalesce(array(select (jsonb_array_elements_text(p_payload->'antecedencia_dias'))::integer),array[60,30,15,7,0]),
    coalesce(array(select jsonb_array_elements_text(p_payload->'canais')),array['in_app','email']),
    nullif(p_payload->>'escalonar_apos_horas','')::integer,
    coalesce(array(select jsonb_array_elements_text(p_payload->'destinatarios_perfis')),array['administrador']),
    coalesce((p_payload->>'ativa')::boolean,true),auth.uid(),auth.uid()
  ) on conflict(id) do update set nome=excluded.nome,evento=excluded.evento,
    antecedencia_dias=excluded.antecedencia_dias,canais=excluded.canais,
    escalonar_apos_horas=excluded.escalonar_apos_horas,destinatarios_perfis=excluded.destinatarios_perfis,
    ativa=excluded.ativa,updated_by=auth.uid(),updated_at=now() returning * into v_saved;
  return to_jsonb(v_saved);
end $$;

revoke all on function public.api_central_notificacoes(uuid) from public,anon;
revoke all on function public.api_salvar_preferencias_notificacao(uuid,jsonb) from public,anon;
revoke all on function public.api_salvar_regra_notificacao(uuid,jsonb) from public,anon;
grant execute on function public.api_central_notificacoes(uuid) to authenticated;
grant execute on function public.api_salvar_preferencias_notificacao(uuid,jsonb) to authenticated;
grant execute on function public.api_salvar_regra_notificacao(uuid,jsonb) to authenticated;

-- 6. Qualidade de dados estruturados.
create table if not exists public.regras_qualidade_dados (
  codigo text primary key,
  modulo text not null,
  nome text not null,
  descricao text not null,
  severidade text not null check(severidade in ('info','warning','critical')),
  ativa boolean not null default true
);

create table if not exists public.achados_qualidade_dados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  regra_codigo text not null references public.regras_qualidade_dados(codigo),
  modulo text not null,
  registro_id uuid,
  titulo text not null,
  detalhes_json jsonb not null default '{}'::jsonb,
  severidade text not null check(severidade in ('info','warning','critical')),
  detectado_at timestamptz not null default now(),
  ultima_ocorrencia_at timestamptz not null default now(),
  resolvido_at timestamptz,
  resolvido_por uuid references public.usuarios(id) on delete set null
);

create unique index if not exists uq_achado_qualidade_ativo
  on public.achados_qualidade_dados(empresa_id,regra_codigo,coalesce(registro_id,'00000000-0000-0000-0000-000000000000'::uuid))
  where resolvido_at is null;

insert into public.regras_qualidade_dados(codigo,modulo,nome,descricao,severidade) values
 ('DOC_RESPONSAVEL','documentos','Documento sem responsavel','Documento sem pessoa responsavel pela renovacao.','warning'),
 ('DOC_VENCIMENTO','documentos','Documento sem vencimento','Documento sem data de vencimento ou revisao.','warning'),
 ('DOC_DATAS','documentos','Datas inconsistentes','Vencimento anterior a emissao.','critical'),
 ('DOC_DUPLICADO','documentos','Possivel documento duplicado','Nome e numero repetidos no mesmo ambiente.','warning'),
 ('EQ_CODIGO','equipamentos','Equipamento sem codigo','Equipamento sem codigo interno rastreavel.','critical'),
 ('EQ_RASTREIO','equipamentos','Cadastro incompleto','Fabricante, modelo ou serie ausente.','warning'),
 ('MAN_RESPONSAVEL','manutencoes','Manutencao sem responsavel','Manutencao sem tecnico ou responsavel interno.','warning'),
 ('MAN_EVIDENCIA','manutencoes','Manutencao sem evidencia','Manutencao concluida que exige evidencia, mas nao possui anexo.','critical'),
 ('CAL_VENCIMENTO','calibracoes','Calibracao sem vencimento','Calibracao aprovada sem proximo vencimento.','warning'),
 ('QUA_VENCIMENTO','qualificacoes','Qualificacao sem vencimento','Qualificacao aprovada sem proximo vencimento.','warning')
on conflict(codigo) do update set modulo=excluded.modulo,nome=excluded.nome,descricao=excluded.descricao,severidade=excluded.severidade;

alter table public.regras_qualidade_dados enable row level security;
alter table public.achados_qualidade_dados enable row level security;
revoke all on public.regras_qualidade_dados,public.achados_qualidade_dados from anon,authenticated;
grant select on public.regras_qualidade_dados,public.achados_qualidade_dados to authenticated;
grant all on public.regras_qualidade_dados,public.achados_qualidade_dados to service_role;
create policy regras_qualidade_read on public.regras_qualidade_dados for select to authenticated using(true);
create policy achados_qualidade_tenant_read on public.achados_qualidade_dados for select to authenticated using(public.has_company_access(empresa_id));

create or replace function public.api_executar_qualidade_dados(p_empresa_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  if not public.has_company_permission(p_empresa_id,'qualidade.gerenciar') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.achados_qualidade_dados set resolvido_at=now(),resolvido_por=auth.uid()
    where empresa_id=p_empresa_id and resolvido_at is null;

  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'DOC_RESPONSAVEL','documentos',d.id,'Documento sem responsavel: '||d.nome,'warning',jsonb_build_object('nome',d.nome)
  from public.documentos d where d.empresa_id=p_empresa_id and d.deleted_at is null and d.responsavel_id is null;
  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'DOC_VENCIMENTO','documentos',d.id,'Documento sem vencimento: '||d.nome,'warning',jsonb_build_object('nome',d.nome)
  from public.documentos d where d.empresa_id=p_empresa_id and d.deleted_at is null and d.data_vencimento is null;
  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'DOC_DATAS','documentos',d.id,'Datas inconsistentes: '||d.nome,'critical',
    jsonb_build_object('emissao',d.data_emissao,'vencimento',d.data_vencimento)
  from public.documentos d where d.empresa_id=p_empresa_id and d.deleted_at is null
    and d.data_emissao is not null and d.data_vencimento is not null and d.data_vencimento<d.data_emissao;
  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'DOC_DUPLICADO','documentos',x.id,'Possivel duplicidade: '||x.nome,'warning',jsonb_build_object('numero',x.numero_documento)
  from (select d.*,row_number() over(partition by lower(trim(d.nome)),coalesce(lower(trim(d.numero_documento)),'') order by d.created_at) rn
    from public.documentos d where d.empresa_id=p_empresa_id and d.deleted_at is null) x where x.rn>1;
  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'EQ_CODIGO','equipamentos',e.id,'Equipamento sem codigo: '||e.nome,'critical',jsonb_build_object('nome',e.nome)
  from public.equipamentos e where e.empresa_id=p_empresa_id and e.deleted_at is null and nullif(trim(e.codigo_interno),'') is null;
  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'EQ_RASTREIO','equipamentos',e.id,'Cadastro incompleto: '||e.nome,'warning',
    jsonb_build_object('fabricante',e.fabricante,'modelo',e.modelo,'numero_serie',e.numero_serie)
  from public.equipamentos e where e.empresa_id=p_empresa_id and e.deleted_at is null
    and (nullif(trim(e.fabricante),'') is null or nullif(trim(e.modelo),'') is null or nullif(trim(e.numero_serie),'') is null);
  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'MAN_RESPONSAVEL','manutencoes',m.id,'Manutencao sem responsavel','warning',jsonb_build_object('servico',m.nome_servico)
  from public.manutencoes m where m.empresa_id=p_empresa_id and m.deleted_at is null
    and m.responsavel_interno_id is null and nullif(trim(m.tecnico_responsavel),'') is null;
  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'MAN_EVIDENCIA','manutencoes',m.id,'Manutencao concluida sem evidencia','critical',jsonb_build_object('servico',m.nome_servico)
  from public.manutencoes m where m.empresa_id=p_empresa_id and m.deleted_at is null and m.status_execucao='concluida' and m.exige_evidencia
    and not exists(select 1 from public.anexos a where a.empresa_id=p_empresa_id and a.modulo='manutencoes' and a.registro_id=m.id and a.status='ativo' and a.deleted_at is null);
  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'CAL_VENCIMENTO','calibracoes',c.id,'Calibracao aprovada sem vencimento','warning',jsonb_build_object('certificado',c.numero_certificado)
  from public.calibracoes c where c.empresa_id=p_empresa_id and c.deleted_at is null and c.resultado like 'aprovado%' and c.data_vencimento is null;
  insert into public.achados_qualidade_dados(empresa_id,regra_codigo,modulo,registro_id,titulo,severidade,detalhes_json)
  select p_empresa_id,'QUA_VENCIMENTO','qualificacoes',q.id,'Qualificacao aprovada sem vencimento','warning',jsonb_build_object('tipo',q.tipo)
  from public.qualificacoes q where q.empresa_id=p_empresa_id and q.deleted_at is null and q.resultado like 'aprovado%' and q.data_vencimento is null;

  insert into public.logs_auditoria(empresa_id,usuario_id,modulo,acao,novo_valor)
  values(p_empresa_id,auth.uid(),'qualidade','executar_diagnostico_qualidade',
    jsonb_build_object('achados',(select count(*) from public.achados_qualidade_dados a where a.empresa_id=p_empresa_id and a.resolvido_at is null)));
  return public.api_qualidade_dados(p_empresa_id);
end $$;

create or replace function public.api_qualidade_dados(p_empresa_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return jsonb_build_object(
    'resumo',jsonb_build_object(
      'total',(select count(*) from public.achados_qualidade_dados a where a.empresa_id=p_empresa_id and a.resolvido_at is null),
      'criticos',(select count(*) from public.achados_qualidade_dados a where a.empresa_id=p_empresa_id and a.resolvido_at is null and a.severidade='critical'),
      'alertas',(select count(*) from public.achados_qualidade_dados a where a.empresa_id=p_empresa_id and a.resolvido_at is null and a.severidade='warning')
    ),
    'achados',coalesce((select jsonb_agg(to_jsonb(a) order by case a.severidade when 'critical' then 0 when 'warning' then 1 else 2 end,a.detectado_at desc)
      from public.achados_qualidade_dados a where a.empresa_id=p_empresa_id and a.resolvido_at is null),'[]'::jsonb)
  );
end $$;

revoke all on function public.api_executar_qualidade_dados(uuid) from public,anon;
revoke all on function public.api_qualidade_dados(uuid) from public,anon;
grant execute on function public.api_executar_qualidade_dados(uuid) to authenticated;
grant execute on function public.api_qualidade_dados(uuid) to authenticated;

-- 7. QR seguro para equipamentos. O token nao revela o ID interno e exige login.
alter table public.equipamentos add column if not exists qr_token uuid;
update public.equipamentos set qr_token=gen_random_uuid() where qr_token is null;
alter table public.equipamentos alter column qr_token set default gen_random_uuid();
alter table public.equipamentos alter column qr_token set not null;
create unique index if not exists uq_equipamentos_qr_token on public.equipamentos(qr_token);

create or replace function public.api_resolver_qr_equipamento(p_qr_token uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_eq public.equipamentos;
begin
  select * into v_eq from public.equipamentos where qr_token=p_qr_token and deleted_at is null;
  if not found then raise exception 'QR_NOT_FOUND'; end if;
  if not public.has_company_access(v_eq.empresa_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  insert into public.logs_auditoria(empresa_id,usuario_id,modulo,acao,registro_id)
  values(v_eq.empresa_id,auth.uid(),'equipamentos','acesso_por_qr',v_eq.id);
  return jsonb_build_object('empresa_id',v_eq.empresa_id,'equipamento_id',v_eq.id,'nome',v_eq.nome,'codigo',v_eq.codigo_interno);
end $$;

create or replace function public.api_rotacionar_qr_equipamento(p_empresa_id uuid,p_equipamento_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_token uuid;
begin
  if not public.has_company_permission(p_empresa_id,'equipamentos.editar') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.equipamentos set qr_token=gen_random_uuid(),updated_at=now(),updated_by=auth.uid()
  where id=p_equipamento_id and empresa_id=p_empresa_id and deleted_at is null returning qr_token into v_token;
  if v_token is null then raise exception 'EQUIPMENT_NOT_FOUND'; end if;
  insert into public.logs_auditoria(empresa_id,usuario_id,modulo,acao,registro_id)
  values(p_empresa_id,auth.uid(),'equipamentos','rotacionar_qr',p_equipamento_id);
  return jsonb_build_object('qr_token',v_token);
end $$;

revoke all on function public.api_resolver_qr_equipamento(uuid) from public,anon;
revoke all on function public.api_rotacionar_qr_equipamento(uuid,uuid) from public,anon;
grant execute on function public.api_resolver_qr_equipamento(uuid) to authenticated;
grant execute on function public.api_rotacionar_qr_equipamento(uuid,uuid) to authenticated;

-- 8. Relatorios agendados e historico de execucao.
create table if not exists public.relatorios_agendados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  nome text not null,
  tipo_relatorio text not null default 'executivo_ia',
  frequencia text not null check(frequencia in ('semanal','mensal')),
  dia_semana integer check(dia_semana is null or dia_semana between 0 and 6),
  dia_mes integer check(dia_mes is null or dia_mes between 1 and 28),
  horario time not null default '08:00',
  timezone text not null default 'America/Sao_Paulo',
  destinatarios text[] not null,
  filtros_json jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  proxima_execucao_at timestamptz not null default now(),
  ultima_execucao_at timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.execucoes_relatorios_agendados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  relatorio_agendado_id uuid not null references public.relatorios_agendados(id),
  status text not null check(status in ('queued','processing','sent','failed','skipped')),
  snapshot_json jsonb,
  destinatarios text[] not null default '{}',
  erro_codigo text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_relatorios_agendados_due on public.relatorios_agendados(ativo,proxima_execucao_at);
alter table public.relatorios_agendados enable row level security;
alter table public.execucoes_relatorios_agendados enable row level security;
revoke all on public.relatorios_agendados,public.execucoes_relatorios_agendados from anon,authenticated;
grant select on public.relatorios_agendados,public.execucoes_relatorios_agendados to authenticated;
grant all on public.relatorios_agendados,public.execucoes_relatorios_agendados to service_role;
create policy relatorios_agendados_tenant_read on public.relatorios_agendados for select to authenticated using(public.has_company_access(empresa_id));
create policy execucoes_relatorios_tenant_read on public.execucoes_relatorios_agendados for select to authenticated using(public.has_company_access(empresa_id));

create or replace function public.api_listar_relatorios_agendados(p_empresa_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return jsonb_build_object(
    'agendamentos',coalesce((select jsonb_agg(to_jsonb(r) order by r.nome) from public.relatorios_agendados r where r.empresa_id=p_empresa_id),'[]'::jsonb),
    'ultimas_execucoes',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from
      (select * from public.execucoes_relatorios_agendados x where x.empresa_id=p_empresa_id order by x.created_at desc limit 20) e),'[]'::jsonb)
  );
end $$;

create or replace function public.api_salvar_relatorio_agendado(p_empresa_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_saved public.relatorios_agendados; v_freq text; v_recipients text[];
begin
  if not public.has_company_permission(p_empresa_id,'relatorios.agendar') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  v_freq:=coalesce(nullif(p_payload->>'frequencia',''),'semanal');
  v_recipients:=array(select lower(trim(x)) from jsonb_array_elements_text(p_payload->'destinatarios') x where x like '%@%');
  if coalesce(array_length(v_recipients,1),0)=0 then raise exception 'REPORT_RECIPIENT_REQUIRED'; end if;
  insert into public.relatorios_agendados(
    id,empresa_id,nome,tipo_relatorio,frequencia,dia_semana,dia_mes,horario,timezone,destinatarios,
    filtros_json,ativo,proxima_execucao_at,created_by,updated_by
  ) values(
    coalesce(nullif(p_payload->>'id','')::uuid,gen_random_uuid()),p_empresa_id,trim(p_payload->>'nome'),
    coalesce(nullif(p_payload->>'tipo_relatorio',''),'executivo_ia'),v_freq,
    nullif(p_payload->>'dia_semana','')::integer,nullif(p_payload->>'dia_mes','')::integer,
    coalesce(nullif(p_payload->>'horario','')::time,'08:00'::time),coalesce(nullif(p_payload->>'timezone',''),'America/Sao_Paulo'),
    v_recipients,coalesce(p_payload->'filtros','{}'::jsonb),coalesce((p_payload->>'ativo')::boolean,true),
    case when v_freq='mensal' then now()+interval '1 month' else now()+interval '7 days' end,auth.uid(),auth.uid()
  ) on conflict(id) do update set nome=excluded.nome,tipo_relatorio=excluded.tipo_relatorio,
    frequencia=excluded.frequencia,dia_semana=excluded.dia_semana,dia_mes=excluded.dia_mes,
    horario=excluded.horario,timezone=excluded.timezone,destinatarios=excluded.destinatarios,
    filtros_json=excluded.filtros_json,ativo=excluded.ativo,updated_by=auth.uid(),updated_at=now()
  returning * into v_saved;
  return to_jsonb(v_saved);
end $$;

revoke all on function public.api_listar_relatorios_agendados(uuid) from public,anon;
revoke all on function public.api_salvar_relatorio_agendado(uuid,jsonb) from public,anon;
grant execute on function public.api_listar_relatorios_agendados(uuid) to authenticated;
grant execute on function public.api_salvar_relatorio_agendado(uuid,jsonb) to authenticated;

-- 9. Financeiro profissional: dunning, cupons, ajustes e mudancas agendadas.
alter table public.assinaturas_empresas
  add column if not exists grace_period_ends_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_ends_at timestamptz;

create table if not exists public.configuracoes_cobranca (
  id boolean primary key default true check(id),
  dias_carencia integer not null default 3 check(dias_carencia between 0 and 30),
  tentativas_automaticas integer not null default 3 check(tentativas_automaticas between 0 and 10),
  intervalos_tentativas_dias integer[] not null default array[1,3,5],
  bloquear_apos_carencia boolean not null default true,
  updated_by uuid references public.usuarios(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.configuracoes_cobranca(id) values(true) on conflict(id) do nothing;

create table if not exists public.tentativas_cobranca (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  assinatura_id uuid references public.assinaturas_empresas(id),
  fatura_id uuid references public.faturas(id),
  gateway text not null,
  gateway_event_id text,
  tentativa integer not null default 1,
  status text not null check(status in ('queued','processing','succeeded','failed','canceled')),
  valor_centavos integer,
  erro_codigo text,
  proxima_tentativa_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.cupons_comerciais (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text,
  tipo text not null check(tipo in ('percentual','valor_fixo')),
  valor integer not null check(valor>0),
  moeda char(3) default 'BRL',
  limite_usos integer,
  usos integer not null default 0,
  valido_de timestamptz not null default now(),
  valido_ate timestamptz,
  planos_ids uuid[] not null default '{}',
  ativo boolean not null default true,
  created_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.resgates_cupons (
  id uuid primary key default gen_random_uuid(),
  cupom_id uuid not null references public.cupons_comerciais(id),
  empresa_id uuid not null references public.empresas(id),
  assinatura_id uuid references public.assinaturas_empresas(id),
  desconto_centavos integer not null,
  created_at timestamptz not null default now(),
  unique(cupom_id,empresa_id,assinatura_id)
);

create table if not exists public.alteracoes_assinatura_agendadas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  assinatura_id uuid not null references public.assinaturas_empresas(id),
  plano_origem_id uuid references public.planos(id),
  plano_destino_id uuid references public.planos(id),
  tipo text not null check(tipo in ('upgrade','downgrade','cancelamento','reativacao')),
  status text not null default 'pending' check(status in ('pending','applied','canceled','failed')),
  efetivar_em timestamptz not null,
  prorata_centavos integer,
  solicitada_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create index if not exists idx_tentativas_cobranca_data on public.tentativas_cobranca(created_at desc);
create index if not exists idx_alteracoes_assinatura_due on public.alteracoes_assinatura_agendadas(status,efetivar_em);

alter table public.configuracoes_cobranca enable row level security;
alter table public.tentativas_cobranca enable row level security;
alter table public.cupons_comerciais enable row level security;
alter table public.resgates_cupons enable row level security;
alter table public.alteracoes_assinatura_agendadas enable row level security;
revoke all on public.configuracoes_cobranca,public.tentativas_cobranca,public.cupons_comerciais,public.resgates_cupons,public.alteracoes_assinatura_agendadas from anon,authenticated;
grant select on public.configuracoes_cobranca,public.tentativas_cobranca,public.cupons_comerciais,public.resgates_cupons,public.alteracoes_assinatura_agendadas to authenticated;
grant all on public.configuracoes_cobranca,public.tentativas_cobranca,public.cupons_comerciais,public.resgates_cupons,public.alteracoes_assinatura_agendadas to service_role;
create policy cobranca_master_read on public.configuracoes_cobranca for select to authenticated using(public.is_master());
create policy tentativas_cobranca_master_read on public.tentativas_cobranca for select to authenticated using(public.is_master());
create policy cupons_master_read on public.cupons_comerciais for select to authenticated using(public.is_master());
create policy resgates_master_read on public.resgates_cupons for select to authenticated using(public.is_master());
create policy alteracoes_assinatura_master_read on public.alteracoes_assinatura_agendadas for select to authenticated using(public.is_master());

create or replace function public.api_master_financeiro_profissional()
returns jsonb language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare v_mrr bigint; v_active bigint;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(sum(coalesce(a.valor_mensal_centavos,p.valor_mensal_centavos,0)),0),count(*)
  into v_mrr,v_active from public.assinaturas_empresas a left join public.planos p on p.id=a.plano_id
  where a.status='ativa' and a.deleted_at is null;
  return jsonb_build_object(
    'mrr_centavos',v_mrr,'arr_centavos',v_mrr*12,'assinaturas_ativas',v_active,
    'ticket_medio_centavos',case when v_active>0 then round(v_mrr::numeric/v_active) else 0 end,
    'churn_90d',(select count(*) from public.assinaturas_empresas a where a.status='cancelada' and a.cancelada_em>=now()-interval '90 days' and a.deleted_at is null),
    'recebiveis_vencidos_centavos',(select coalesce(sum(f.valor_centavos-coalesce(f.valor_pago_centavos,0)),0) from public.faturas f where f.status='vencida' and f.deleted_at is null),
    'tentativas_30d',(select count(*) from public.tentativas_cobranca t where t.created_at>=now()-interval '30 days'),
    'recuperadas_30d',(select count(*) from public.tentativas_cobranca t where t.status='succeeded' and t.completed_at>=now()-interval '30 days'),
    'cupons_ativos',(select count(*) from public.cupons_comerciais c where c.ativo and c.valido_de<=now() and (c.valido_ate is null or c.valido_ate>now())),
    'mudancas_pendentes',(select count(*) from public.alteracoes_assinatura_agendadas a where a.status='pending'),
    'aging',jsonb_build_object(
      'ate_7_dias',(select coalesce(sum(valor_centavos-coalesce(valor_pago_centavos,0)),0) from public.faturas where status='vencida' and vencimento>=current_date-7 and deleted_at is null),
      'de_8_a_30_dias',(select coalesce(sum(valor_centavos-coalesce(valor_pago_centavos,0)),0) from public.faturas where status='vencida' and vencimento<current_date-7 and vencimento>=current_date-30 and deleted_at is null),
      'mais_30_dias',(select coalesce(sum(valor_centavos-coalesce(valor_pago_centavos,0)),0) from public.faturas where status='vencida' and vencimento<current_date-30 and deleted_at is null)
    ),
    'ultimas_tentativas',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from
      (select tc.*,e.nome_fantasia from public.tentativas_cobranca tc join public.empresas e on e.id=tc.empresa_id order by tc.created_at desc limit 20) t),'[]'::jsonb)
  );
end $$;

revoke all on function public.api_master_financeiro_profissional() from public,anon;
grant execute on function public.api_master_financeiro_profissional() to authenticated;

-- 10. Central de saude consolidada com todos os subsistemas profissionais.
create or replace function public.api_master_saude_sistema()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return jsonb_build_object(
    'components',coalesce((select jsonb_agg(to_jsonb(x) order by x.componente) from
      (select distinct on(componente) componente,status,latencia_ms,detalhes_json,checked_at
       from public.verificacoes_saude_sistema order by componente,checked_at desc) x),'[]'::jsonb),
    'open_alerts',coalesce((select jsonb_agg(to_jsonb(a) order by a.ultima_ocorrencia_at desc)
      from public.alertas_operacionais_sistema a where a.status='open'),'[]'::jsonb),
    'webhook_failures_24h',(select count(*) from public.eventos_webhook_pagamento where not processado and recebido_at>=now()-interval '24 hours'),
    'client_errors_24h',(select coalesce(sum(ocorrencias),0) from public.eventos_erro_sistema where ultima_ocorrencia_at>=now()-interval '24 hours' and resolvido_at is null),
    'notification_failures_24h',(select count(*) from public.entregas_notificacao where status='failed' and created_at>=now()-interval '24 hours'),
    'scheduled_report_failures_24h',(select count(*) from public.execucoes_relatorios_agendados where status='failed' and created_at>=now()-interval '24 hours'),
    'data_quality_critical',(select count(*) from public.achados_qualidade_dados where severidade='critical' and resolvido_at is null),
    'last_restore_test',(select to_jsonb(r) from public.ensaios_restauracao_backup r order by initiated_at desc limit 1),
    'last_deployment',(select to_jsonb(d) from public.implantacoes_sistema d where ambiente='production' order by iniciado_at desc limit 1),
    'pending_dunning',(select count(*) from public.tentativas_cobranca where status in ('queued','processing'))
  );
end $$;

revoke all on function public.api_master_saude_sistema() from public,anon;
grant execute on function public.api_master_saude_sistema() to authenticated;
