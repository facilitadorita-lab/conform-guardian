-- Conform Flow — catálogo comercial central e preparação dos planos para Stripe.
-- Nenhum Price ID é exposto pela API pública.

alter table public.planos
  add column if not exists publico_recomendado text,
  add column if not exists limite_unidades integer,
  add column if not exists nivel_suporte text not null default 'padrao',
  add column if not exists stripe_product_id text,
  add column if not exists stripe_monthly_price_id text,
  add column if not exists stripe_yearly_price_id text;

alter table public.planos
  drop constraint if exists planos_limite_unidades_check,
  drop constraint if exists planos_nivel_suporte_check;

alter table public.planos
  add constraint planos_limite_unidades_check
    check (limite_unidades is null or limite_unidades >= 0),
  add constraint planos_nivel_suporte_check
    check (nivel_suporte in ('padrao', 'prioritario', 'dedicado'));

do $$
declare
  v_completo_id uuid;
  v_profissional_id uuid;
begin
  select id into v_completo_id
  from public.planos
  where codigo = 'completo'
  limit 1;

  select id into v_profissional_id
  from public.planos
  where codigo = 'profissional'
  limit 1;

  if v_completo_id is not null and v_profissional_id is null then
    update public.planos
    set nome = 'Profissional', codigo = 'profissional', updated_at = now()
    where id = v_completo_id;
  elsif v_completo_id is not null and v_profissional_id is not null
    and v_completo_id <> v_profissional_id
  then
    -- Preserva contratos existentes e mantém o registro legado fora de venda.
    update public.planos
    set codigo = 'completo-legado-' || left(id::text, 8),
        disponivel_venda = false,
        ativo = false,
        updated_at = now()
    where id = v_completo_id;
  end if;
end $$;

insert into public.planos (
  nome,
  codigo,
  descricao,
  publico_recomendado,
  limite_usuarios,
  limite_unidades,
  limite_documentos,
  limite_equipamentos,
  limite_storage_mb,
  valor_mensal_centavos,
  valor_anual_centavos,
  moeda,
  trial_dias,
  disponivel_venda,
  recursos,
  nivel_suporte,
  ativo,
  ordem
)
values
  (
    'Profissional',
    'profissional',
    'Equipamentos, calibrações, qualificações, manutenções e pendências, além dos recursos documentais.',
    'Empresas com rotinas técnicas e equipamentos críticos.',
    4,
    1,
    500,
    150,
    2048,
    15990,
    159900,
    'BRL',
    7,
    true,
    jsonb_build_object(
      'assistente_ia', true,
      'vencimentos', true,
      'documentos', true,
      'anexos', true,
      'alertas', true,
      'usuarios', true,
      'equipamentos', true,
      'calibracoes', true,
      'qualificacoes', true,
      'manutencoes', true,
      'pendencias', true,
      'relatorios', true,
      'auditoria', true,
      'multi_unidades', false,
      'suporte_prioritario', false
    ),
    'padrao',
    true,
    20
  )
on conflict (codigo) do update set
  nome = excluded.nome,
  publico_recomendado = coalesce(public.planos.publico_recomendado, excluded.publico_recomendado),
  limite_unidades = coalesce(public.planos.limite_unidades, excluded.limite_unidades),
  nivel_suporte = coalesce(public.planos.nivel_suporte, excluded.nivel_suporte),
  disponivel_venda = true,
  ativo = true,
  updated_at = now();

update public.planos
set
  publico_recomendado = case codigo
    when 'essencial' then coalesce(publico_recomendado, 'Pequenas operações focadas em documentos e vencimentos.')
    when 'profissional' then coalesce(publico_recomendado, 'Empresas com rotinas técnicas e equipamentos críticos.')
    when 'rede' then coalesce(publico_recomendado, 'Redes e grupos com mais de uma unidade.')
    else publico_recomendado
  end,
  limite_unidades = case codigo
    when 'essencial' then coalesce(limite_unidades, 1)
    when 'profissional' then coalesce(limite_unidades, 1)
    when 'rede' then coalesce(limite_unidades, 3)
    else limite_unidades
  end,
  nivel_suporte = case codigo
    when 'rede' then 'prioritario'
    else nivel_suporte
  end,
  updated_at = now()
where codigo in ('essencial', 'profissional', 'rede');

create unique index if not exists uq_planos_stripe_product_id
  on public.planos(stripe_product_id)
  where stripe_product_id is not null;

create unique index if not exists uq_planos_stripe_monthly_price_id
  on public.planos(stripe_monthly_price_id)
  where stripe_monthly_price_id is not null;

create unique index if not exists uq_planos_stripe_yearly_price_id
  on public.planos(stripe_yearly_price_id)
  where stripe_yearly_price_id is not null;

create table if not exists public.configuracoes_comerciais (
  id boolean primary key default true check (id),
  preco_usuario_extra_centavos integer not null default 2990 check (preco_usuario_extra_centavos >= 0),
  preco_unidade_extra_centavos integer not null default 5990 check (preco_unidade_extra_centavos >= 0),
  moeda char(3) not null default 'BRL' check (moeda ~ '^[A-Z]{3}$'),
  termos_versao text not null default '2026-07-16',
  politica_privacidade_versao text not null default '2026-07-16',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.usuarios(id) on delete set null
);

insert into public.configuracoes_comerciais(id)
values (true)
on conflict (id) do nothing;

alter table public.configuracoes_comerciais enable row level security;
revoke all on public.configuracoes_comerciais from anon, authenticated;

drop policy if exists planos_public_read on public.planos;
revoke all on public.planos from anon;

create or replace function public.api_public_catalogo_planos()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'codigo', p.codigo,
        'nome', p.nome,
        'descricao', p.descricao,
        'publico_recomendado', p.publico_recomendado,
        'valor_mensal_centavos', p.valor_mensal_centavos,
        'valor_anual_centavos', p.valor_anual_centavos,
        'moeda', p.moeda,
        'limites', jsonb_build_object(
          'usuarios', p.limite_usuarios,
          'unidades', p.limite_unidades,
          'documentos', p.limite_documentos,
          'equipamentos', p.limite_equipamentos,
          'storage_mb', p.limite_storage_mb
        ),
        'recursos', p.recursos,
        'nivel_suporte', p.nivel_suporte,
        'mais_escolhido', p.codigo = 'profissional'
      ) order by p.ordem, p.valor_mensal_centavos)
      from public.planos p
      where p.ativo and p.disponivel_venda
        and p.codigo in ('essencial', 'profissional', 'rede')
    ), '[]'::jsonb),
    'add_ons', coalesce((
      select jsonb_build_object(
        'usuario_extra_centavos', c.preco_usuario_extra_centavos,
        'unidade_extra_centavos', c.preco_unidade_extra_centavos,
        'moeda', c.moeda
      )
      from public.configuracoes_comerciais c
      where c.id
    ), jsonb_build_object(
      'usuario_extra_centavos', null,
      'unidade_extra_centavos', null,
      'moeda', 'BRL'
    )),
    'legal', coalesce((
      select jsonb_build_object(
        'terms_version', c.termos_versao,
        'privacy_version', c.politica_privacidade_versao
      )
      from public.configuracoes_comerciais c
      where c.id
    ), jsonb_build_object(
      'terms_version', null,
      'privacy_version', null
    ))
  );
$$;

revoke all on function public.api_public_catalogo_planos() from public;
grant execute on function public.api_public_catalogo_planos() to anon, authenticated;

comment on function public.api_public_catalogo_planos() is
  'Catálogo público sem identificadores Stripe e sem campos administrativos.';
