-- Conform Flow - tabela comercial aprovada em 03/08/2026.
-- Nao existe taxa de implantacao. O valor anual equivale a dez mensalidades.

update public.planos
set
  valor_mensal_centavos = case codigo
    when 'essencial' then 15990
    when 'profissional' then 24990
    when 'rede' then 39990
    else valor_mensal_centavos
  end,
  valor_anual_centavos = case codigo
    when 'essencial' then 159900
    when 'profissional' then 249900
    when 'rede' then 399900
    else valor_anual_centavos
  end,
  updated_at = now()
where codigo in ('essencial', 'profissional', 'rede')
  and tipo_plano = 'direto';

update public.planos
set
  valor_mensal_centavos = case codigo
    when 'parceiro_start' then 59900
    when 'parceiro_pro' then 129900
    when 'parceiro_enterprise' then 279900
    else valor_mensal_centavos
  end,
  valor_anual_centavos = case codigo
    when 'parceiro_start' then 599000
    when 'parceiro_pro' then 1299000
    when 'parceiro_enterprise' then 2799000
    else valor_anual_centavos
  end,
  preco_cliente_extra_centavos = case codigo
    when 'parceiro_start' then 9990
    when 'parceiro_pro' then 7990
    when 'parceiro_enterprise' then 5990
    else preco_cliente_extra_centavos
  end,
  updated_at = now()
where codigo in ('parceiro_start', 'parceiro_pro', 'parceiro_enterprise')
  and tipo_plano = 'parceiro';

update public.configuracoes_comerciais
set
  preco_usuario_extra_centavos = 2990,
  preco_unidade_extra_centavos = 6990,
  updated_at = now()
where id = true;

do $$
declare
  v_direct_count integer;
  v_partner_count integer;
begin
  select count(*) into v_direct_count
  from public.planos
  where codigo in ('essencial', 'profissional', 'rede')
    and tipo_plano = 'direto';

  select count(*) into v_partner_count
  from public.planos
  where codigo in ('parceiro_start', 'parceiro_pro', 'parceiro_enterprise')
    and tipo_plano = 'parceiro';

  if v_direct_count <> 3 then
    raise exception 'DIRECT_COMMERCIAL_CATALOG_INCOMPLETE';
  end if;
  if v_partner_count <> 3 then
    raise exception 'PARTNER_COMMERCIAL_CATALOG_INCOMPLETE';
  end if;
  if not exists (select 1 from public.configuracoes_comerciais where id = true) then
    raise exception 'COMMERCIAL_CONFIGURATION_NOT_FOUND';
  end if;
end;
$$;
