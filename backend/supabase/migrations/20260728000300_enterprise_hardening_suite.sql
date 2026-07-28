-- Conform Flow — hardening complementar para operação enterprise.
-- Esta migration não altera o modelo de negócio: adiciona limites, diagnóstico
-- de isolamento e telemetria operacional sem abrir acesso cross-tenant.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

revoke all on public.rate_limit_buckets from anon, authenticated;
grant all on public.rate_limit_buckets to service_role;

create or replace function public.api_check_rate_limit(
  p_scope text,
  p_limit integer default 30,
  p_window_seconds integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_key text;
  v_now timestamptz := now();
  v_window timestamptz;
  v_count integer;
  v_limit integer := greatest(coalesce(p_limit, 30), 1);
  v_seconds integer := greatest(coalesce(p_window_seconds, 60), 1);
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  v_key := concat('user:', auth.uid()::text, ':', left(coalesce(nullif(trim(p_scope), ''), 'general'), 80));
  insert into public.rate_limit_buckets(bucket_key, window_started_at, request_count, updated_at)
  values (v_key, v_now, 1, v_now)
  on conflict (bucket_key) do update
    set window_started_at = case
          when public.rate_limit_buckets.window_started_at <= v_now - make_interval(secs => v_seconds)
            then v_now
          else public.rate_limit_buckets.window_started_at
        end,
        request_count = case
          when public.rate_limit_buckets.window_started_at <= v_now - make_interval(secs => v_seconds)
            then 1
          else public.rate_limit_buckets.request_count + 1
        end,
        updated_at = v_now
  returning window_started_at, request_count into v_window, v_count;

  return jsonb_build_object(
    'allowed', v_count <= v_limit,
    'count', v_count,
    'limit', v_limit,
    'window_seconds', v_seconds,
    'retry_after_seconds', greatest(1, ceil(extract(epoch from ((v_window + make_interval(secs => v_seconds)) - v_now)))::integer)
  );
end;
$$;

revoke all on function public.api_check_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.api_check_rate_limit(text, integer, integer) to authenticated;

-- Diagnóstico executável pelo Admin Master. O resultado é agregado e não
-- devolve dados operacionais de nenhuma empresa.
create or replace function public.api_diagnostico_isolamento(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_tables text[] := array['documentos','equipamentos','calibracoes','qualificacoes','manutencoes','anexos','pendencias','alertas'];
  v_table text;
  v_orphans integer := 0;
  v_cross_links integer := 0;
  v_checks jsonb := '[]'::jsonb;
  v_total integer;
begin
  if not public.is_master() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_empresa_id is null then raise exception 'COMPANY_REQUIRED' using errcode = '22023'; end if;

  foreach v_table in array v_tables loop
    execute format('select count(*) from public.%I where empresa_id = $1 and deleted_at is null', v_table)
      into v_total using p_empresa_id;
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('tabela', v_table, 'registros_empresa', coalesce(v_total, 0)));
  end loop;

  -- Todos os módulos operacionais precisam manter empresa_id preenchido.
  foreach v_table in array v_tables loop
    execute format('select count(*) from public.%I where empresa_id is null and deleted_at is null', v_table)
      into v_total;
    v_orphans := v_orphans + coalesce(v_total, 0);
  end loop;

  select count(*) into v_cross_links
  from public.anexos a
  join public.documentos d on d.id = a.registro_id and a.modulo = 'documentos'
  where a.empresa_id <> d.empresa_id and a.deleted_at is null;

  return jsonb_build_object(
    'empresa_id', p_empresa_id,
    'isolamento_ok', v_orphans = 0 and v_cross_links = 0,
    'registros_sem_empresa', v_orphans,
    'anexos_com_empresa_inconsistente', v_cross_links,
    'checks', v_checks,
    'executado_em', now()
  );
end;
$$;

revoke all on function public.api_diagnostico_isolamento(uuid) from public, anon;
grant execute on function public.api_diagnostico_isolamento(uuid) to authenticated;

-- Limpeza conservadora dos buckets de rate limit. O cron/Edge Function pode
-- chamar esta função com service_role sem expor a tabela ao frontend.
create or replace function public.api_limpar_rate_limits(p_older_than_hours integer default 24)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_deleted integer;
begin
  delete from public.rate_limit_buckets
  where updated_at < now() - make_interval(hours => greatest(coalesce(p_older_than_hours, 24), 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.api_limpar_rate_limits(integer) from public, anon, authenticated;
grant execute on function public.api_limpar_rate_limits(integer) to service_role;

