# Rollout multiunidade

## Fases

### 1. Validação isolada

- Supabase local descartável;
- ensaio de migração legada;
- reset de banco vazio;
- SQL/RLS/Storage/Edge Functions;
- concorrência do limite;
- Playwright desktop e mobile;
- carga controlada;
- artifacts por 14 dias.

Nenhuma URL, chave ou dado de produção é usado.

### 2. Homologação

- restaurar cópia anonimizada;
- aplicar migrations;
- comparar contagens;
- validar usuários existentes;
- executar smoke tests com matriz e filial;
- verificar e-mails, Stripe Test Mode, alertas e relatórios;
- observar erros e latência por pelo menos um ciclo operacional.

### 3. Liberação controlada

- habilitar primeiro para empresas internas/sandbox;
- liberar Plano Rede em pequenos lotes;
- acompanhar limite, erros 403, uploads, FlowIA e QR;
- disponibilizar procedimento de suporte e retorno à matriz;
- não apagar campos legados nesta fase.

## Critérios de avanço

Avançar somente se TypeScript, build, lint alterado, migrations vazia/legada, SQL, RLS, E2E, concorrência e carga estiverem verdes, com artifacts acessíveis.

## Observabilidade

Monitorar:

- falhas `UNIT_ACCESS_DENIED`, `UNIT_COMPANY_MISMATCH` e `UNIT_LIMIT_REACHED`;
- duração de dashboard/listagens por unidade;
- volume de URLs assinadas;
- destinatários de alertas;
- transferências;
- empresas próximas/acima do limite;
- divergência entre add-on confirmado e limite efetivo;
- respostas FlowIA por escopo.

## Resposta a incidente

1. Suspender criação/reativação de unidade.
2. Manter leitura e históricos.
3. Fixar o frontend na matriz se a seleção estiver instável.
4. Preservar logs e artifacts.
5. Corrigir em migration aditiva.
6. Nunca excluir unidades ou reescrever históricos como correção rápida.

## Decisão atual

A validação isolada da Fase 1 está **APROVADA** no commit `b4373b6`, pelo workflow `Conform Flow full isolated validation` [run 30778232447](https://github.com/facilitadorita-lab/conform-guardian/actions/runs/30778232447). O artifact `conform-flow-validation-30778232447` preserva as evidências por 14 dias.

Esta aprovação autoriza o avanço para homologação. Ela não autoriza merge, aplicação no Supabase remoto nem publicação em produção sem backup, ensaio anonimizado e liberação controlada.
