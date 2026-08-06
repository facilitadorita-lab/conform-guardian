-- Venda direta mensal: sete dias gratuitos com cartão obrigatório no Checkout.
-- A criação do trial é executada exclusivamente pela Edge Function; este
-- registro mantém o catálogo administrativo alinhado à política comercial.

update public.planos
set trial_dias = 7,
    updated_at = now()
where tipo_plano = 'direto'
  and ativo = true;

do $$
begin
  if exists (
    select 1
    from public.planos
    where tipo_plano = 'direto'
      and ativo = true
      and trial_dias <> 7
  ) then
    raise exception 'DIRECT_MONTHLY_TRIAL_POLICY_NOT_APPLIED';
  end if;
end;
$$;
