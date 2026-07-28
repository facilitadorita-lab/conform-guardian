-- Checks executed against a staging database after migrations are applied.
-- They intentionally do not seed or alter tenant data.

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'api_master_testar_isolamento',
    'api_master_registrar_ensaio_backup',
    'api_master_fila_cobranca',
    'api_master_consumo_empresas',
    'api_avaliar_segmento_ia',
    'api_calendario_vencimentos',
    'api_master_api_security_snapshot'
  )
order by routine_name;

select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'execucoes_teste_isolamento';

select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('api_master_testar_isolamento', 'api_master_registrar_ensaio_backup', 'api_master_enfileirar_cobranca');
