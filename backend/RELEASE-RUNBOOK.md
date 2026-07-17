# Processo profissional de publicação do Conform Flow

## Ambientes

| Ambiente | Finalidade | Dados | Publicação |
|---|---|---|---|
| Desenvolvimento | Implementação local | Sintéticos | Manual |
| Homologação | Validação funcional e regressão | Sintéticos, nunca cópia irrestrita de produção | Automática na branch `staging` |
| Produção | Clientes pagantes | Reais e isolados por empresa | Manual, protegida e auditada |

Cada ambiente deve usar um projeto Supabase diferente. Chaves de produção nunca podem ser usadas em desenvolvimento ou homologação.

## Critérios de entrada em produção

1. TypeScript e build de produção aprovados.
2. Banco reconstruído integralmente a partir das migrations.
3. Testes de isolamento entre tenants aprovados.
4. Lint do banco sem erro bloqueante.
5. Fluxos críticos validados em homologação: login, troca de empresa, documentos, anexos, aprovação, equipamentos, manutenção, relatórios, cobrança e bloqueio.
6. Backup recente e último ensaio de restauração aprovado.
7. Aprovação humana no GitHub Environment `production`.

## Publicação

1. Merge na `main` somente após o workflow `Quality and tenant security` ficar verde.
2. Executar `Deploy Supabase production`.
3. O workflow repete build e teste de isolamento antes de aplicar qualquer migration.
4. As migrations são apresentadas em modo de prévia, aplicadas e as Edge Functions são publicadas.
5. A versão e o commit são registrados em `implantacoes_sistema` e aparecem na Central de Saúde.
6. O commit na `main` sincroniza o frontend com o Lovable.

## Rollback

- Código: criar um novo commit revertendo o commit defeituoso. Nunca reescrever o histórico da `main`.
- Banco: migrations publicadas são tratadas como imutáveis. Criar uma migration corretiva aditiva.
- Dados: restaurar primeiro em ambiente isolado, validar integridade, RLS, contagens e anexos; somente depois executar o plano aprovado de recuperação.
- Feature incompleta: desligar por `feature_flags` enquanto a correção passa pelo pipeline.

## Rotinas automáticas

As chamadas usam `Authorization: Bearer <SYSTEM_CRON_SECRET>` e devem ser configuradas no agendador protegido:

- `system-health-check`: a cada 5 minutos;
- `process-lgpd-exports`: a cada 5 minutos;
- `dispatch-expiration-alerts`: a cada hora;
- `dispatch-scheduled-reports`: a cada 15 minutos;
- `process-dunning`: a cada hora.

Nunca inserir `SYSTEM_CRON_SECRET`, chave de serviço, senha do banco ou segredo de gateway em código, commit, chat ou variável `VITE_*`.
