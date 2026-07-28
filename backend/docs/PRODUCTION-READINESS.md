# Prontidão de produção — Conform Flow

O painel **Saúde do sistema** agora possui a seção **Prontidão para operação comercial**. Ela consolida sinais de segurança e operação sem expor dados de clientes:

- RLS habilitado nas tabelas públicas;
- último teste automatizado de isolamento entre empresas;
- último ensaio de backup e restauração;
- falhas de webhooks Stripe nas últimas 24 horas;
- erros abertos do frontend;
- anexos que ultrapassaram o tempo esperado de validação;
- última publicação registrada em produção.

O status pode ser `Pronto`, `Atenção` ou `Bloqueado`. A alteração dos limites exige Admin Master com MFA (AAL2) e é gravada na auditoria.

## Antes de aceitar clientes pagantes

1. Aplicar as migrations pelo workflow protegido `Deploy Supabase production`.
2. Confirmar que o workflow `Quality and tenant security` está verde.
3. Executar uma contratação em modo de teste e validar o webhook Stripe idempotente.
4. Fazer upload de um PDF e de um arquivo recusado; confirmar validação, URL assinada e auditoria.
5. Executar troca de empresa com duas contas e confirmar que nenhum registro cruza o tenant.
6. Fazer um ensaio de restauração e registrar o RPO/RTO no painel Master.
7. Revisar limites de alerta no painel de prontidão e configurar o orçamento mensal desejado.
8. Conferir os secrets no GitHub/Supabase; nenhuma chave privada deve estar no frontend, no Git ou em mensagens.
9. Publicar primeiro em `staging`, executar smoke tests e só depois aprovar `production`.
10. Iniciar com um piloto de 3–5 empresas antes de ampliar a venda.

## O que o painel não substitui

O painel não mede sozinho a fatura do Supabase, Lovable ou Stripe. Os limites de custo são controles internos de operação; o faturamento real deve ser acompanhado nos painéis oficiais dos provedores e protegido com alertas de orçamento.
