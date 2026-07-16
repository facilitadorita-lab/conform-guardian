# Ativação comercial do Conform Flow

O código não contém chaves privadas. Todas as configurações abaixo devem ser salvas como secrets no Supabase ou no GitHub e nunca enviadas em chat, commit ou variável `VITE_*`.

## 1. Revogar credenciais expostas

- Revogar qualquer Personal Access Token do Supabase que já tenha sido compartilhado fora do cofre.
- Gerar um novo token apenas para o GitHub Environment `production`.
- Confirmar que `.env`, `.env.local` e arquivos de dump não estão versionados.

## 2. Secrets das Edge Functions

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL=https://conform-guardian.lovable.app`
- `ALLOWED_ORIGINS=https://conform-guardian.lovable.app`
- `SYSTEM_CRON_SECRET` com no mínimo 32 bytes aleatórios
- `SIGNUP_RATE_LIMIT_SALT` com no mínimo 32 bytes aleatórios
- `TURNSTILE_SECRET_KEY`
- `SIGNUP_REQUIRE_TURNSTILE=true` depois que o widget público estiver configurado
- `OPERATIONS_ALERT_WEBHOOK_URL` opcional para o canal interno de incidentes

## 3. Stripe

1. Criar produtos e preços mensais/anuais imutáveis.
2. No Admin Master, informar `prod_...` e `price_...` para cada plano.
3. Criar webhook apontando para `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`.
4. Assinar pelo menos `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed` e `customer.subscription.deleted`.
5. Copiar o signing secret para `STRIPE_WEBHOOK_SECRET`.
6. Executar checkout em modo de teste e confirmar idempotência antes de ativar o modo live.

## 4. Supabase Auth

- Manter cadastro público direto desativado; o usuário é criado pelo webhook somente após pagamento.
- Configurar o template de e-mail para código OTP de 6 dígitos.
- Definir URLs permitidas para produção.
- Testar MFA TOTP no Admin Master e em um administrador de empresa.

## 5. Agendamentos

Configurar chamadas protegidas com `Authorization: Bearer <SYSTEM_CRON_SECRET>`:

- `system-health-check`: a cada 5 minutos.
- `process-lgpd-exports`: a cada 5 minutos.
- `dispatch-expiration-alerts`: conforme a rotina de vencimentos já existente.

## 6. GitHub Environments

Environment `production`:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`
- aprovação manual obrigatória para deploy

Environment `production-backup`:

- `SUPABASE_DB_URL`
- `RESTORE_TEST_DB_URL` apontando somente para banco descartável
- `BACKUP_ENCRYPTION_PASSWORD`

## 7. Ordem segura de publicação

1. Fazer merge na `main` e aguardar o workflow de qualidade.
2. Executar `Deploy Supabase production` com aprovação do ambiente.
3. Preencher os Stripe Price IDs no Admin Master.
4. Publicar/sincronizar o frontend no Lovable.
5. Rodar uma contratação de teste, falha de pagamento, OTP, MFA, exportação LGPD e troca de empresa.
6. Confirmar na Central de Saúde que não existem alertas críticos.
