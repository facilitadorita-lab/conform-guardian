-- Conform Flow — infraestrutura privada para consulta de CNPJ.
-- A consulta externa ocorre exclusivamente pela Edge Function autenticada.

create table if not exists public.cache_consultas_cnpj (
  cnpj_normalizado text primary key,
  provedor text not null,
  dados_normalizados jsonb not null,
  response_fingerprint text not null,
  consultado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cache_consultas_cnpj_document_check
    check (cnpj_normalizado ~ '^[0-9]{14}$'),
  constraint cache_consultas_cnpj_expiration_check
    check (expira_em > consultado_em),
  constraint cache_consultas_cnpj_payload_check
    check (jsonb_typeof(dados_normalizados) = 'object')
);

create index if not exists idx_cache_consultas_cnpj_expira_em
  on public.cache_consultas_cnpj(expira_em);

create table if not exists public.limites_consultas_cnpj (
  escopo text not null,
  janela_iniciada_em timestamptz not null,
  quantidade integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (escopo, janela_iniciada_em),
  constraint limites_consultas_cnpj_escopo_check
    check (char_length(escopo) between 3 and 180),
  constraint limites_consultas_cnpj_quantidade_check
    check (quantidade >= 0)
);

create index if not exists idx_limites_consultas_cnpj_janela
  on public.limites_consultas_cnpj(janela_iniciada_em);

alter table public.cache_consultas_cnpj enable row level security;
alter table public.limites_consultas_cnpj enable row level security;

-- Não existem políticas para clientes. Somente a service role da Edge Function
-- pode ler ou alterar cache e contadores.
revoke all on public.cache_consultas_cnpj from anon, authenticated;
revoke all on public.limites_consultas_cnpj from anon, authenticated;
grant select, insert, update, delete on public.cache_consultas_cnpj to service_role;
grant select, insert, update, delete on public.limites_consultas_cnpj to service_role;

create or replace function public.consume_company_registration_lookup_limit(
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_scope is null or char_length(p_scope) not between 3 and 180 then
    raise exception using errcode = '22023', message = 'INVALID_RATE_LIMIT_SCOPE';
  end if;

  if p_limit not between 1 and 500 then
    raise exception using errcode = '22023', message = 'INVALID_RATE_LIMIT_VALUE';
  end if;

  if p_window_seconds not between 60 and 3600 then
    raise exception using errcode = '22023', message = 'INVALID_RATE_LIMIT_WINDOW';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.limites_consultas_cnpj (
    escopo,
    janela_iniciada_em,
    quantidade,
    updated_at
  )
  values (p_scope, v_window_start, 1, v_now)
  on conflict (escopo, janela_iniciada_em) do update
  set quantidade = least(
        public.limites_consultas_cnpj.quantidade + 1,
        p_limit + 1
      ),
      updated_at = excluded.updated_at
  returning quantidade into v_count;

  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'count', v_count,
    'limit', p_limit,
    'remaining', greatest(p_limit - v_count, 0),
    'reset_at', v_window_start + make_interval(secs => p_window_seconds)
  );
end;
$$;

revoke all on function public.consume_company_registration_lookup_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_company_registration_lookup_limit(text, integer, integer)
  to service_role;

create or replace function public.cleanup_company_registration_lookup_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cache_deleted integer;
  v_limits_deleted integer;
begin
  delete from public.cache_consultas_cnpj
  where expira_em < now() - interval '30 days';
  get diagnostics v_cache_deleted = row_count;

  delete from public.limites_consultas_cnpj
  where janela_iniciada_em < now() - interval '24 hours';
  get diagnostics v_limits_deleted = row_count;

  return jsonb_build_object(
    'cache_deleted', v_cache_deleted,
    'rate_limits_deleted', v_limits_deleted
  );
end;
$$;

revoke all on function public.cleanup_company_registration_lookup_data()
  from public, anon, authenticated;
grant execute on function public.cleanup_company_registration_lookup_data()
  to service_role;

comment on table public.cache_consultas_cnpj is
  'Cache privado de dados cadastrais normalizados; indisponível para clientes via API.';
comment on table public.limites_consultas_cnpj is
  'Contadores privados e atômicos para limitar consultas de CNPJ por usuário e origem.';

