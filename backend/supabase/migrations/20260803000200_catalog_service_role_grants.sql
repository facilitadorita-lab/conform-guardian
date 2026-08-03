-- The Stripe catalog synchronizer runs only as service_role.
-- Keep the commercial configuration unavailable to anon/authenticated clients.
grant select, update on table public.planos to service_role;
grant select, update on table public.configuracoes_comerciais to service_role;

revoke all on table public.configuracoes_comerciais from anon, authenticated;

