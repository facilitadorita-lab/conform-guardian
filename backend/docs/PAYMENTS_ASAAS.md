# Conform Flow — Pagamentos recorrentes com Asaas

## Decisão

O gateway recomendado para o primeiro ciclo comercial do Conform Flow é o Asaas.

Motivos principais:

- suporta assinatura recorrente mensal;
- aceita Pix, boleto e cartão de crédito;
- permite criar cliente e assinatura por API;
- envia eventos por webhook para automatizar liberação, inadimplência e cancelamento;
- reduz operação manual para cobrança mensal.

## Fluxo profissional

1. Admin Master cadastra a empresa e escolhe o plano.
2. Admin Master cria a assinatura recorrente pela função `create-asaas-subscription`.
3. A assinatura fica como `pagamento_pendente`.
4. O Asaas gera as cobranças mensais automaticamente.
5. O webhook `asaas-webhook` recebe eventos de pagamento.
6. Quando o pagamento é confirmado:
   - assinatura fica `ativa`;
   - empresa fica `ativa`;
   - acesso ao sistema é liberado.
7. Quando a cobrança vence sem pagamento:
   - assinatura fica `inadimplente`;
   - empresa fica `bloqueada`;
   - o frontend mostra somente a tela de regularização.

## Regra de bloqueio

Cliente inadimplente não acessa dados operacionais.

O bloqueio acontece em duas camadas:

- banco: `has_company_access` nega acesso quando a empresa não está ativa;
- frontend: `AppShell` não renderiza menu, dashboard nem páginas internas quando a empresa está bloqueada.

## Variáveis necessárias

```env
ASAAS_API_KEY=
ASAAS_ENV=sandbox
ASAAS_WEBHOOK_TOKEN=
```

Em produção, usar:

```env
ASAAS_ENV=production
```

## Funções criadas

- `supabase/functions/create-asaas-subscription/index.ts`
  - cria cliente no Asaas;
  - cria assinatura mensal;
  - grava IDs do gateway na assinatura da empresa.

- `supabase/functions/asaas-webhook/index.ts`
  - recebe eventos do Asaas;
  - registra fatura;
  - libera empresa quando paga;
  - bloqueia empresa quando inadimplente.

## Boas práticas

- nunca salvar cartão diretamente no Conform Flow;
- sempre usar `empresa.id` como `externalReference`;
- nunca liberar acesso somente pelo frontend;
- manter webhook com token secreto;
- testar primeiro em sandbox.
