# Migração multiunidade

## Migrations

1. `20260730000500_apply_subscription_addons_to_limits.sql` — aplica add-ons aos limites efetivos.
2. `20260730000600_multiunit_core.sql` — tabelas, colunas, backfill, constraints, índices, triggers e RLS.
3. `20260730000700_multiunit_api.sql` — APIs operacionais, dashboard, FlowIA, QR e transferência.
4. `20260730000800_multiunit_contracts.sql` — edição, usuários, relatórios e contratos de consumo.
5. `20260730000900_multiunit_audit.sql` — auditoria por unidade, parceiros e visão Admin Master.

## Estratégia de transição

- A migration é aditiva e não remove campos textuais legados.
- Cada empresa não excluída recebe uma única matriz.
- Novas empresas recebem matriz por trigger na mesma transação.
- Documento com `setor_unidade` preenchido migra para escopo de unidade na matriz.
- Documento sem `setor_unidade` migra como corporativo.
- Equipamentos migram para a matriz.
- Calibrações e qualificações herdam o equipamento.
- Manutenções com equipamento herdam o equipamento; as avulsas usam a matriz.
- Pendências, tratativas, alertas e anexos resolvem o registro de origem.
- Interações da FlowIA vinculadas a equipamento herdam a unidade.
- Relatórios antigos permanecem corporativos; execuções herdam o agendamento.
- Usuários existentes mantêm `acesso_todas_unidades = true`.

Depois do backfill, equipamento, calibração, qualificação e manutenção têm `unidade_id` obrigatório. Foreign keys compostas impedem misturar empresa e unidade.

## Ensaio automatizado

O workflow primeiro restaura o schema até `20260730000500`, injeta dados no formato antigo por `multiunit_legacy_fixture.sql`, aplica as migrations novas e executa `multiunit_migration_rehearsal.sql`.

O ensaio comprova matriz, preservação dos UUIDs, setor textual, vínculos, ausência de órfãos e manutenção de acesso. Depois o banco descartável é resetado do zero para a suíte completa.

## Pré-deploy

1. Backup validado e ponto de restauração.
2. Workflow isolado integralmente verde.
3. Contagem prévia por tabela operacional.
4. Lista de empresas, usuários e registros sem vínculo esperado.
5. Janela sem criação concorrente de equipamentos/unidades durante a migration.
6. Monitoramento de erros RPC, RLS e latência após liberação.

## Rollback

O rollback operacional preferido é desabilitar a exposição da multiunidade e manter apenas a matriz, sem apagar colunas nem históricos.

Não remover `unidade_id`, unidades ou transferências depois que novos dados forem gravados. Se houver falha durante a migration, a transação do Supabase interrompe a versão. Se houver falha após o deploy, reverter frontend/APIs e restaurar o snapshot somente mediante incidente formal.

## Política de downgrade

Redução de plano não exclui dados. A empresa continua lendo unidades existentes, pode arquivar, não pode criar novas nem reativar acima do limite e recebe indicação de excesso até adequar plano/add-on.
