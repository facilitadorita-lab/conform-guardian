-- Conform Flow — governança empresarial: MFA privilegiado, observabilidade,
-- histórico comercial, retenção/LGPD, dupla aprovação e onboarding inteligente.

-- 1. MFA obrigatório para alterações privilegiadas. Leituras permanecem
-- disponíveis para que o usuário consiga acessar a tela de ativação do MFA.
create or replace function public.session_has_aal2()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

create or replace function public.enforce_privileged_mfa()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_privileged boolean;
begin
  if auth.role() <> 'authenticated' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select public.is_master() or exists (
    select 1
    from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid()
      and ue.perfil in ('administrador', 'administrador_provisorio')
      and ue.ativo
      and ue.deleted_at is null
  ) into v_privileged;

  if v_privileged and not public.session_has_aal2() then
    raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.session_has_aal2() from public, anon;
grant execute on function public.session_has_aal2() to authenticated, service_role;

drop trigger if exists trg_planos_privileged_mfa on public.planos;
create trigger trg_planos_privileged_mfa
before insert or update or delete on public.planos
for each row execute function public.enforce_privileged_mfa();

drop trigger if exists trg_assinaturas_privileged_mfa on public.assinaturas_empresas;
create trigger trg_assinaturas_privileged_mfa
before insert or update or delete on public.assinaturas_empresas
for each row execute function public.enforce_privileged_mfa();

drop trigger if exists trg_usuarios_empresas_privileged_mfa on public.usuarios_empresas;
create trigger trg_usuarios_empresas_privileged_mfa
before insert or update or delete on public.usuarios_empresas
for each row execute function public.enforce_privileged_mfa();

drop trigger if exists trg_empresas_insert_privileged_mfa on public.empresas;
create trigger trg_empresas_insert_privileged_mfa
before insert on public.empresas
for each row execute function public.enforce_privileged_mfa();

drop trigger if exists trg_empresas_critical_update_mfa on public.empresas;
create trigger trg_empresas_critical_update_mfa
before update of status, verification_status, access_status, plano_id, deleted_at on public.empresas
for each row execute function public.enforce_privileged_mfa();

-- 2. Histórico comercial imutável, inclusive quando a mudança não passa por
-- uma tela específica do Admin Master.
create table if not exists public.historico_comercial_imutavel (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  entidade text not null check (entidade in ('plano', 'assinatura', 'fatura', 'contratacao')),
  entidade_id uuid,
  evento text not null,
  valor_anterior jsonb,
  valor_novo jsonb,
  origem text not null default 'database',
  actor_user_id uuid references public.usuarios(id) on delete set null,
  actor_role text,
  correlation_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_historico_comercial_empresa_data
  on public.historico_comercial_imutavel(empresa_id, created_at desc);

alter table public.historico_comercial_imutavel enable row level security;
revoke all on public.historico_comercial_imutavel from anon, authenticated;
grant select on public.historico_comercial_imutavel to authenticated;
grant select, insert on public.historico_comercial_imutavel to service_role;

drop policy if exists historico_comercial_master_read on public.historico_comercial_imutavel;
create policy historico_comercial_master_read
on public.historico_comercial_imutavel
for select to authenticated
using (public.is_master());

create or replace function public.record_commercial_history()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_empresa_id uuid;
  v_entity_id uuid;
begin
  if tg_table_name = 'planos' then
    v_empresa_id := null;
  elsif tg_op = 'DELETE' then
    v_empresa_id := old.empresa_id;
  else
    v_empresa_id := new.empresa_id;
  end if;
  if tg_op = 'DELETE' then v_entity_id := old.id; else v_entity_id := new.id; end if;
  insert into public.historico_comercial_imutavel(
    empresa_id, entidade, entidade_id, evento, valor_anterior, valor_novo,
    origem, actor_user_id, actor_role
  ) values (
    v_empresa_id,
    case tg_table_name when 'planos' then 'plano' when 'assinaturas_empresas' then 'assinatura' else 'fatura' end,
    v_entity_id,
    lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    case when auth.role() = 'service_role' then 'backend_service' else 'authenticated_user' end,
    auth.uid(),
    auth.role()
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.record_commercial_history() from public, anon, authenticated;

drop trigger if exists trg_assinaturas_commercial_history on public.assinaturas_empresas;
create trigger trg_assinaturas_commercial_history
after insert or update or delete on public.assinaturas_empresas
for each row execute function public.record_commercial_history();

drop trigger if exists trg_faturas_commercial_history on public.faturas;
create trigger trg_faturas_commercial_history
after insert or update or delete on public.faturas
for each row execute function public.record_commercial_history();

drop trigger if exists trg_planos_commercial_history on public.planos;
create trigger trg_planos_commercial_history
after insert or update or delete on public.planos
for each row execute function public.record_commercial_history();

create trigger trg_historico_comercial_immutable
before update or delete on public.historico_comercial_imutavel
for each row execute function public.prevent_immutable_commercial_event_changes();

-- 3. Central de saúde, alertas operacionais e ensaios de restauração.
create table if not exists public.verificacoes_saude_sistema (
  id uuid primary key default gen_random_uuid(),
  componente text not null,
  status text not null check (status in ('healthy', 'degraded', 'down', 'unknown')),
  latencia_ms integer check (latencia_ms is null or latencia_ms >= 0),
  detalhes_json jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists idx_saude_componente_data
  on public.verificacoes_saude_sistema(componente, checked_at desc);

create table if not exists public.alertas_operacionais_sistema (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  severidade text not null check (severidade in ('info', 'warning', 'critical')),
  componente text not null,
  titulo text not null,
  mensagem text not null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  primeira_ocorrencia_at timestamptz not null default now(),
  ultima_ocorrencia_at timestamptz not null default now(),
  reconhecido_por uuid references public.usuarios(id) on delete set null,
  reconhecido_at timestamptz,
  resolvido_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb
);

create unique index if not exists uq_alertas_operacionais_abertos
  on public.alertas_operacionais_sistema(fingerprint)
  where status = 'open';

create table if not exists public.ensaios_restauracao_backup (
  id uuid primary key default gen_random_uuid(),
  ambiente text not null,
  backup_reference text not null,
  status text not null check (status in ('scheduled', 'running', 'passed', 'failed')),
  rpo_minutes integer,
  rto_minutes integer,
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  evidence_reference text,
  notes text,
  recorded_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.verificacoes_saude_sistema enable row level security;
alter table public.alertas_operacionais_sistema enable row level security;
alter table public.ensaios_restauracao_backup enable row level security;

revoke all on public.verificacoes_saude_sistema from anon, authenticated;
revoke all on public.alertas_operacionais_sistema from anon, authenticated;
revoke all on public.ensaios_restauracao_backup from anon, authenticated;
grant select on public.verificacoes_saude_sistema, public.alertas_operacionais_sistema, public.ensaios_restauracao_backup to authenticated;
grant select, insert, update on public.verificacoes_saude_sistema, public.alertas_operacionais_sistema, public.ensaios_restauracao_backup to service_role;

create policy saude_master_read on public.verificacoes_saude_sistema for select to authenticated using (public.is_master());
create policy alertas_sistema_master_read on public.alertas_operacionais_sistema for select to authenticated using (public.is_master());
create policy backups_master_read on public.ensaios_restauracao_backup for select to authenticated using (public.is_master());

-- 4. Retenção, descarte e portabilidade LGPD por tenant.
create table if not exists public.politicas_retencao_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  modulo text not null check (modulo in ('documentos', 'equipamentos', 'manutencoes', 'auditoria', 'anexos', 'usuarios')),
  retention_months integer not null check (retention_months between 1 and 360),
  legal_hold boolean not null default false,
  descarte_automatico boolean not null default false,
  justificativa text,
  created_by uuid references public.usuarios(id),
  updated_by uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, modulo)
);

create table if not exists public.solicitacoes_exportacao_lgpd (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  solicitante_id uuid not null references public.usuarios(id),
  escopo_json jsonb not null default '["all"]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed', 'expired')),
  storage_path text,
  arquivo_hash text,
  expira_em timestamptz,
  erro_codigo text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('lgpd-exports', 'lgpd-exports', false, 104857600, array['application/json', 'application/zip'])
on conflict (id) do update set public = false, file_size_limit = 104857600;

alter table public.politicas_retencao_empresa enable row level security;
alter table public.solicitacoes_exportacao_lgpd enable row level security;
revoke all on public.politicas_retencao_empresa from anon, authenticated;
revoke all on public.solicitacoes_exportacao_lgpd from anon, authenticated;
grant select, insert, update, delete on public.politicas_retencao_empresa to authenticated;
grant select on public.solicitacoes_exportacao_lgpd to authenticated;

create policy retencao_company_read on public.politicas_retencao_empresa
for select to authenticated using (public.has_company_access(empresa_id));
create policy retencao_company_admin_write on public.politicas_retencao_empresa
for all to authenticated using (public.can_admin_company(empresa_id)) with check (public.can_admin_company(empresa_id));
create policy exportacao_company_read on public.solicitacoes_exportacao_lgpd
for select to authenticated using (public.can_admin_company(empresa_id));

create trigger trg_retencao_privileged_mfa
before insert or update or delete on public.politicas_retencao_empresa
for each row execute function public.enforce_privileged_mfa();

create or replace function public.api_solicitar_exportacao_lgpd(p_empresa_id uuid, p_escopo jsonb default '["all"]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_saved public.solicitacoes_exportacao_lgpd;
begin
  if not public.can_admin_company(p_empresa_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  if exists (
    select 1 from public.solicitacoes_exportacao_lgpd
    where empresa_id = p_empresa_id and status in ('pending', 'processing')
  ) then raise exception 'EXPORT_ALREADY_IN_PROGRESS'; end if;

  insert into public.solicitacoes_exportacao_lgpd(empresa_id, solicitante_id, escopo_json)
  values (p_empresa_id, auth.uid(), coalesce(p_escopo, '["all"]'::jsonb))
  returning * into v_saved;
  return to_jsonb(v_saved) - 'storage_path' - 'arquivo_hash';
end;
$$;

revoke all on function public.api_solicitar_exportacao_lgpd(uuid,jsonb) from public, anon;
grant execute on function public.api_solicitar_exportacao_lgpd(uuid,jsonb) to authenticated;

-- 5. Aprovação em duas etapas para operações irreversíveis ou sensíveis.
create table if not exists public.solicitacoes_acao_critica (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  action_type text not null check (action_type in ('delete_evidence', 'replace_evidence', 'mass_delete', 'export_sensitive', 'change_billing', 'block_company')),
  target_type text not null,
  target_id uuid,
  payload_json jsonb not null default '{}'::jsonb,
  justification text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'executed', 'expired', 'canceled')),
  requested_by uuid not null references public.usuarios(id),
  approved_by uuid references public.usuarios(id),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  executed_at timestamptz,
  decision_notes text,
  check (approved_by is null or approved_by <> requested_by)
);

alter table public.solicitacoes_acao_critica enable row level security;
revoke all on public.solicitacoes_acao_critica from anon, authenticated;
grant select on public.solicitacoes_acao_critica to authenticated;
create policy critical_action_company_read on public.solicitacoes_acao_critica
for select to authenticated using (public.is_master() or (empresa_id is not null and public.can_admin_company(empresa_id)));

create or replace function public.api_solicitar_acao_critica(
  p_empresa_id uuid,
  p_action_type text,
  p_target_type text,
  p_target_id uuid,
  p_payload jsonb,
  p_justification text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_saved public.solicitacoes_acao_critica;
begin
  if not public.can_admin_company(p_empresa_id) or not public.session_has_aal2() then
    raise exception 'MFA_AAL2_REQUIRED_OR_FORBIDDEN' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_justification, ''))) < 10 then raise exception 'JUSTIFICATION_REQUIRED'; end if;
  insert into public.solicitacoes_acao_critica(
    empresa_id, action_type, target_type, target_id, payload_json, justification, requested_by
  ) values (
    p_empresa_id, p_action_type, p_target_type, p_target_id, coalesce(p_payload, '{}'::jsonb), trim(p_justification), auth.uid()
  ) returning * into v_saved;
  return to_jsonb(v_saved);
end;
$$;

create or replace function public.api_decidir_acao_critica(p_solicitacao_id uuid, p_approve boolean, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_request public.solicitacoes_acao_critica;
begin
  select * into v_request from public.solicitacoes_acao_critica where id = p_solicitacao_id for update;
  if not found or v_request.status <> 'pending' or v_request.expires_at <= now() then raise exception 'REQUEST_NOT_AVAILABLE'; end if;
  if v_request.requested_by = auth.uid() then raise exception 'SECOND_APPROVER_REQUIRED' using errcode = '42501'; end if;
  if not public.can_admin_company(v_request.empresa_id) or not public.session_has_aal2() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.solicitacoes_acao_critica
  set status = case when p_approve then 'approved' else 'rejected' end,
      approved_by = auth.uid(), decided_at = now(), decision_notes = nullif(trim(p_notes), '')
  where id = v_request.id returning * into v_request;
  return to_jsonb(v_request);
end;
$$;

revoke all on function public.api_solicitar_acao_critica(uuid,text,text,uuid,jsonb,text) from public, anon;
revoke all on function public.api_decidir_acao_critica(uuid,boolean,text) from public, anon;
grant execute on function public.api_solicitar_acao_critica(uuid,text,text,uuid,jsonb,text) to authenticated;
grant execute on function public.api_decidir_acao_critica(uuid,boolean,text) to authenticated;

-- 6. Onboarding orientado por dados estruturados, seguro para a IA consumir.
create or replace function public.api_onboarding_inteligente(p_empresa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_company public.empresas;
  v_users integer;
  v_documents integer;
  v_equipment integer;
  v_responsibles integer;
  v_steps jsonb;
  v_completed integer;
begin
  if not public.has_company_access(p_empresa_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into v_company from public.empresas where id = p_empresa_id and deleted_at is null;
  select count(*) into v_users from public.usuarios_empresas where empresa_id = p_empresa_id and ativo and deleted_at is null;
  select count(*) into v_documents from public.documentos where empresa_id = p_empresa_id and deleted_at is null;
  select count(*) into v_equipment from public.equipamentos where empresa_id = p_empresa_id and deleted_at is null;
  select count(*) into v_responsibles from public.documentos where empresa_id = p_empresa_id and responsavel_id is not null and deleted_at is null;

  v_steps := jsonb_build_array(
    jsonb_build_object('key', 'company_profile', 'label', 'Completar perfil da empresa', 'complete', v_company.segmento is not null and v_company.tipo_estabelecimento is not null),
    jsonb_build_object('key', 'team', 'label', 'Cadastrar equipe', 'complete', v_users >= 2),
    jsonb_build_object('key', 'documents', 'label', 'Cadastrar documentos prioritários', 'complete', v_documents >= 3),
    jsonb_build_object('key', 'responsibles', 'label', 'Definir responsáveis', 'complete', v_documents > 0 and v_responsibles = v_documents),
    jsonb_build_object('key', 'equipment', 'label', 'Cadastrar equipamentos aplicáveis', 'complete', v_equipment > 0)
  );
  select count(*) into v_completed from jsonb_array_elements(v_steps) step where (step ->> 'complete')::boolean;

  return jsonb_build_object(
    'empresa_id', p_empresa_id,
    'percentual', v_completed * 20,
    'etapas', v_steps,
    'recomendacao_ia', case
      when v_company.segmento is null then 'Comece completando o segmento e o tipo de estabelecimento para personalizar a matriz documental.'
      when v_documents < 3 then 'Cadastre os documentos regulatórios mais críticos e seus vencimentos.'
      when v_users < 2 then 'Convide pelo menos mais uma pessoa para garantir continuidade operacional.'
      when v_documents > 0 and v_responsibles < v_documents then 'Há documentos sem responsável; distribua a rotina antes de avançar.'
      when v_equipment = 0 then 'Avalie se a operação possui equipamentos sujeitos a calibração, qualificação ou manutenção.'
      else 'A implantação básica está concluída. Revise alertas e pendências para manter a conformidade.'
    end,
    'fonte', 'dados_estruturados_sem_leitura_de_anexos'
  );
end;
$$;

revoke all on function public.api_onboarding_inteligente(uuid) from public, anon;
grant execute on function public.api_onboarding_inteligente(uuid) to authenticated;

-- Resumo da central de saúde para o Admin Master.
create or replace function public.api_master_saude_sistema()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return jsonb_build_object(
    'components', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.componente)
      from (
        select distinct on (componente) componente, status, latencia_ms, detalhes_json, checked_at
        from public.verificacoes_saude_sistema
        order by componente, checked_at desc
      ) x
    ), '[]'::jsonb),
    'open_alerts', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.ultima_ocorrencia_at desc)
      from public.alertas_operacionais_sistema a where a.status = 'open'
    ), '[]'::jsonb),
    'webhook_failures_24h', (
      select count(*) from public.eventos_webhook_pagamento
      where not processado and recebido_at >= now() - interval '24 hours'
    ),
    'last_restore_test', (
      select to_jsonb(r) from public.ensaios_restauracao_backup r order by initiated_at desc limit 1
    )
  );
end
$$;

revoke all on function public.api_master_saude_sistema() from public, anon;
grant execute on function public.api_master_saude_sistema() to authenticated;

-- Edição comercial completa, sem preços ou limites paralelos no frontend.
create or replace function public.api_master_salvar_plano(p_plano_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_saved public.planos;
  v_name text := nullif(trim(p_payload ->> 'nome'), '');
  v_code text := nullif(lower(regexp_replace(coalesce(p_payload ->> 'codigo', p_payload ->> 'nome'), '[^a-zA-Z0-9]+', '-', 'g')), '');
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  if nullif(trim(p_payload ->> 'stripe_monthly_price_id'), '') is not null
    and trim(p_payload ->> 'stripe_monthly_price_id') !~ '^price_[A-Za-z0-9]+$'
  then raise exception 'INVALID_STRIPE_MONTHLY_PRICE_ID'; end if;
  if nullif(trim(p_payload ->> 'stripe_yearly_price_id'), '') is not null
    and trim(p_payload ->> 'stripe_yearly_price_id') !~ '^price_[A-Za-z0-9]+$'
  then raise exception 'INVALID_STRIPE_YEARLY_PRICE_ID'; end if;
  if nullif(trim(p_payload ->> 'stripe_product_id'), '') is not null
    and trim(p_payload ->> 'stripe_product_id') !~ '^prod_[A-Za-z0-9]+$'
  then raise exception 'INVALID_STRIPE_PRODUCT_ID'; end if;

  if p_plano_id is null then
    if v_name is null or v_code is null then raise exception 'PLAN_NAME_AND_CODE_REQUIRED'; end if;
    insert into public.planos(
      nome, codigo, descricao, publico_recomendado, limite_usuarios, limite_unidades,
      limite_documentos, limite_equipamentos, limite_storage_mb,
      valor_mensal_centavos, valor_anual_centavos, moeda, trial_dias,
      disponivel_venda, recursos, nivel_suporte,
      stripe_product_id, stripe_monthly_price_id, stripe_yearly_price_id,
      ativo, ordem
    ) values (
      v_name,
      v_code,
      nullif(trim(p_payload ->> 'descricao'), ''),
      nullif(trim(p_payload ->> 'publico_recomendado'), ''),
      coalesce(nullif(p_payload ->> 'limite_usuarios', '')::integer, 5),
      nullif(p_payload ->> 'limite_unidades', '')::integer,
      nullif(p_payload ->> 'limite_documentos', '')::integer,
      nullif(p_payload ->> 'limite_equipamentos', '')::integer,
      coalesce(nullif(p_payload ->> 'limite_storage_mb', '')::integer, 1024),
      coalesce(nullif(p_payload ->> 'valor_mensal_centavos', '')::integer, 0),
      nullif(p_payload ->> 'valor_anual_centavos', '')::integer,
      upper(coalesce(nullif(p_payload ->> 'moeda', ''), 'BRL')),
      coalesce(nullif(p_payload ->> 'trial_dias', '')::integer, 0),
      coalesce((p_payload ->> 'disponivel_venda')::boolean, true),
      coalesce(p_payload -> 'recursos', '{}'::jsonb),
      coalesce(nullif(p_payload ->> 'nivel_suporte', ''), 'padrao'),
      nullif(trim(p_payload ->> 'stripe_product_id'), ''),
      nullif(trim(p_payload ->> 'stripe_monthly_price_id'), ''),
      nullif(trim(p_payload ->> 'stripe_yearly_price_id'), ''),
      coalesce((p_payload ->> 'ativo')::boolean, true),
      coalesce(nullif(p_payload ->> 'ordem', '')::integer, 0)
    ) returning * into v_saved;
  else
    update public.planos p
    set nome = coalesce(v_name, p.nome),
        codigo = coalesce(v_code, p.codigo),
        descricao = case when p_payload ? 'descricao' then nullif(trim(p_payload ->> 'descricao'), '') else p.descricao end,
        publico_recomendado = case when p_payload ? 'publico_recomendado' then nullif(trim(p_payload ->> 'publico_recomendado'), '') else p.publico_recomendado end,
        limite_usuarios = coalesce(nullif(p_payload ->> 'limite_usuarios', '')::integer, p.limite_usuarios),
        limite_unidades = case when p_payload ? 'limite_unidades' then nullif(p_payload ->> 'limite_unidades', '')::integer else p.limite_unidades end,
        limite_documentos = case when p_payload ? 'limite_documentos' then nullif(p_payload ->> 'limite_documentos', '')::integer else p.limite_documentos end,
        limite_equipamentos = case when p_payload ? 'limite_equipamentos' then nullif(p_payload ->> 'limite_equipamentos', '')::integer else p.limite_equipamentos end,
        limite_storage_mb = coalesce(nullif(p_payload ->> 'limite_storage_mb', '')::integer, p.limite_storage_mb),
        valor_mensal_centavos = coalesce(nullif(p_payload ->> 'valor_mensal_centavos', '')::integer, p.valor_mensal_centavos),
        valor_anual_centavos = case when p_payload ? 'valor_anual_centavos' then nullif(p_payload ->> 'valor_anual_centavos', '')::integer else p.valor_anual_centavos end,
        moeda = upper(coalesce(nullif(p_payload ->> 'moeda', ''), p.moeda)),
        trial_dias = coalesce(nullif(p_payload ->> 'trial_dias', '')::integer, p.trial_dias),
        disponivel_venda = coalesce((p_payload ->> 'disponivel_venda')::boolean, p.disponivel_venda),
        recursos = coalesce(p_payload -> 'recursos', p.recursos),
        nivel_suporte = coalesce(nullif(p_payload ->> 'nivel_suporte', ''), p.nivel_suporte),
        stripe_product_id = case when p_payload ? 'stripe_product_id' then nullif(trim(p_payload ->> 'stripe_product_id'), '') else p.stripe_product_id end,
        stripe_monthly_price_id = case when p_payload ? 'stripe_monthly_price_id' then nullif(trim(p_payload ->> 'stripe_monthly_price_id'), '') else p.stripe_monthly_price_id end,
        stripe_yearly_price_id = case when p_payload ? 'stripe_yearly_price_id' then nullif(trim(p_payload ->> 'stripe_yearly_price_id'), '') else p.stripe_yearly_price_id end,
        ativo = coalesce((p_payload ->> 'ativo')::boolean, p.ativo),
        ordem = coalesce(nullif(p_payload ->> 'ordem', '')::integer, p.ordem),
        updated_at = now()
    where p.id = p_plano_id
    returning * into v_saved;
    if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  end if;

  return to_jsonb(v_saved);
end;
$$;

revoke all on function public.api_master_salvar_plano(uuid,jsonb) from public, anon;
grant execute on function public.api_master_salvar_plano(uuid,jsonb) to authenticated;

create or replace function public.api_master_configurar_gateway_plano(
  p_plano_id uuid,
  p_stripe_product_id text,
  p_stripe_monthly_price_id text,
  p_stripe_yearly_price_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_plan public.planos;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not public.session_has_aal2() then raise exception 'MFA_AAL2_REQUIRED' using errcode = '42501'; end if;
  if nullif(trim(p_stripe_monthly_price_id), '') is not null and trim(p_stripe_monthly_price_id) !~ '^price_[A-Za-z0-9]+$' then
    raise exception 'INVALID_STRIPE_MONTHLY_PRICE_ID';
  end if;
  if nullif(trim(p_stripe_yearly_price_id), '') is not null and trim(p_stripe_yearly_price_id) !~ '^price_[A-Za-z0-9]+$' then
    raise exception 'INVALID_STRIPE_YEARLY_PRICE_ID';
  end if;
  if nullif(trim(p_stripe_product_id), '') is not null and trim(p_stripe_product_id) !~ '^prod_[A-Za-z0-9]+$' then
    raise exception 'INVALID_STRIPE_PRODUCT_ID';
  end if;
  update public.planos
  set stripe_product_id = nullif(trim(p_stripe_product_id), ''),
      stripe_monthly_price_id = nullif(trim(p_stripe_monthly_price_id), ''),
      stripe_yearly_price_id = nullif(trim(p_stripe_yearly_price_id), ''),
      updated_at = now()
  where id = p_plano_id
  returning * into v_plan;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  return to_jsonb(v_plan) - 'stripe_product_id' - 'stripe_monthly_price_id' - 'stripe_yearly_price_id';
end;
$$;

revoke all on function public.api_master_configurar_gateway_plano(uuid,text,text,text) from public, anon;
grant execute on function public.api_master_configurar_gateway_plano(uuid,text,text,text) to authenticated;
