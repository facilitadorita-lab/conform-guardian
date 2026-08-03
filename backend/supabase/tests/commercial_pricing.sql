do $$
begin
  if not exists (
    select 1 from public.planos
    where codigo = 'essencial' and tipo_plano = 'direto'
      and valor_mensal_centavos = 15990 and valor_anual_centavos = 159900
  ) then raise exception 'ESSENCIAL_PRICE_INVALID'; end if;

  if not exists (
    select 1 from public.planos
    where codigo = 'profissional' and tipo_plano = 'direto'
      and valor_mensal_centavos = 24990 and valor_anual_centavos = 249900
  ) then raise exception 'PROFISSIONAL_PRICE_INVALID'; end if;

  if not exists (
    select 1 from public.planos
    where codigo = 'rede' and tipo_plano = 'direto'
      and valor_mensal_centavos = 39990 and valor_anual_centavos = 399900
  ) then raise exception 'REDE_PRICE_INVALID'; end if;

  if not exists (
    select 1 from public.planos
    where codigo = 'parceiro_start' and tipo_plano = 'parceiro'
      and valor_mensal_centavos = 59900 and valor_anual_centavos = 599000
      and limite_clientes = 5 and preco_cliente_extra_centavos = 9990
  ) then raise exception 'PARTNER_START_PRICE_INVALID'; end if;

  if not exists (
    select 1 from public.planos
    where codigo = 'parceiro_pro' and tipo_plano = 'parceiro'
      and valor_mensal_centavos = 129900 and valor_anual_centavos = 1299000
      and limite_clientes = 15 and preco_cliente_extra_centavos = 7990
  ) then raise exception 'PARTNER_PRO_PRICE_INVALID'; end if;

  if not exists (
    select 1 from public.planos
    where codigo = 'parceiro_enterprise' and tipo_plano = 'parceiro'
      and valor_mensal_centavos = 279900 and valor_anual_centavos = 2799000
      and limite_clientes = 40 and preco_cliente_extra_centavos = 5990
  ) then raise exception 'PARTNER_ENTERPRISE_PRICE_INVALID'; end if;

  if not exists (
    select 1 from public.configuracoes_comerciais
    where id = true
      and preco_usuario_extra_centavos = 2990
      and preco_unidade_extra_centavos = 6990
  ) then raise exception 'COMMERCIAL_ADDONS_PRICE_INVALID'; end if;
end;
$$;
