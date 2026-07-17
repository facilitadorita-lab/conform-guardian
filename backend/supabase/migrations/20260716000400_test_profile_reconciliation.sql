-- Reconcile the deterministic audit profiles created by create-test-profiles.
-- This migration is intentionally scoped to the Conform Flow local test accounts.

update public.usuarios_empresas as membership
set
  perfil = case account.email
    when 'teste.admin@conformflow.local' then 'administrador'
    when 'teste.rt@conformflow.local' then 'responsavel_tecnico'
    when 'teste.colaborador@conformflow.local' then 'colaborador'
    when 'teste.leitura@conformflow.local' then 'somente_leitura'
    else membership.perfil
  end,
  ativo = true,
  deleted_at = null,
  updated_at = now()
from public.usuarios as account
where membership.usuario_id = account.id
  and account.email in (
    'teste.admin@conformflow.local',
    'teste.rt@conformflow.local',
    'teste.colaborador@conformflow.local',
    'teste.leitura@conformflow.local'
  );

update public.usuarios
set
  cargo = case email
    when 'teste.admin@conformflow.local' then 'administrador'
    when 'teste.rt@conformflow.local' then 'responsavel_tecnico'
    when 'teste.colaborador@conformflow.local' then 'colaborador'
    when 'teste.leitura@conformflow.local' then 'somente_leitura'
    else cargo
  end,
  status = 'ativo',
  deleted_at = null,
  updated_at = now()
where email in (
  'teste.admin@conformflow.local',
  'teste.rt@conformflow.local',
  'teste.colaborador@conformflow.local',
  'teste.leitura@conformflow.local'
);
