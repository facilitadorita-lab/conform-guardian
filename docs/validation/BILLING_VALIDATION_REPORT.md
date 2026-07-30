# Relatório de cobrança, planos e unidades

## Regra implementada

O limite efetivo de unidades é calculado no backend:

```text
limite-base do plano + unidades extras da assinatura
```

Limites customizados e provisórios continuam soberanos. A interface apenas apresenta o valor devolvido pelo backend.

Consomem limite:

- ativa;
- inativa;
- em implantação.

Não consomem:

- arquivada;
- excluída logicamente.

A regra evita que uma unidade inativa seja usada como mecanismo de evasão de cobrança. Downgrade não apaga dados: bloqueia criação e reativação acima do limite, preservando leitura e arquivamento.

## Proteção contra excesso

A criação e a reativação usam lock transacional por empresa. O cenário da última vaga dispara duas criações simultâneas e exige exatamente um sucesso e um erro `UNIT_LIMIT_REACHED`.

O teste de add-ons usa entidades reais:

- plano com limite-base;
- assinatura com `unidades_extras`;
- limite efetivo esperado;
- criação até o limite;
- bloqueio da unidade excedente.

## Parceiros e Admin Master

- o parceiro visualiza utilização e limite de cada cliente próprio;
- clientes de outro parceiro não aparecem;
- Admin Master recebe plano, add-ons, utilização, excesso, parceiro e receita mensal estimada de unidades extras;
- alterações futuras de preço não reescrevem a fotografia de uma contratação já iniciada.

## Evidência atual

As migrations e regressões estão preparadas. O teste real do limite, concorrência e isolamento será executado no Supabase local do workflow. Stripe Test Mode, webhooks, proporcionalidade e inadimplência continuam em validação comercial separada.

## Decisão

Limites de unidade: **PREPARED**. Cobrança Stripe ponta a ponta: **PARTIAL**. Nenhum dos dois deve ser classificado como PASS antes da execução das respectivas evidências.
