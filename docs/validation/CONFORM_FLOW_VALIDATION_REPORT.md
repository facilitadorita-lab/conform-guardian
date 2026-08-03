# Relatório de validação — Conform Flow

## Resumo executivo

A implementação multiunidade foi construída na branch `feat/multiunidade-completa` sem alterar o Supabase remoto. A validação integral foi executada em Supabase local descartável no commit `b4373b6` e terminou sem falhas no [workflow 30778232447](https://github.com/facilitadorita-lab/conform-guardian/actions/runs/30778232447).

## Escopo implementado

- entidade real de unidades, matriz automática e exclusão lógica;
- migração segura dos registros existentes;
- documentos corporativos e documentos por unidade;
- equipamento obrigatório por unidade e histórico de transferências;
- herança imutável de unidade em calibração, qualificação e manutenção;
- pendências, alertas, anexos, auditoria, relatórios e FlowIA com contexto;
- usuários globais ou restritos, unidade principal e edição atômica;
- RLS em duas camadas: empresa e unidade;
- limite-base mais add-on, com proteção concorrente;
- CRUD, seletor, cache, Dashboard, vencimentos e relatórios;
- QR Code e Storage privados com validação no backend;
- carteira de parceiros e visão financeira do Admin Master;
- interface desktop, tablet e mobile;
- ensaio de migração legada, 22 cenários E2E e carga controlada.

## Evidência executada

| Verificação | Resultado |
| --- | --- |
| TypeScript | PASS local |
| Build de produção | PASS local |
| Lint funcional dos arquivos alterados | PASS local |
| Scripts de bootstrap, carga e concorrência | PASS de sintaxe |
| Diferenças inválidas/whitespace | PASS local |
| Bundle acima de 500 kB | Não ocorre; maior chunk cliente aproximado de 295 kB |
| Migração a partir do schema legado | PASS no workflow 30778232447 |
| Instalação completa em banco vazio | PASS no workflow 30778232447 |
| SQL, RLS, contratos e lint bloqueante do banco | PASS no workflow 30778232447 |
| Playwright desktop e mobile | PASS, 44 execuções |
| Carga controlada | PASS, 20 empresas, 60 unidades, 100 usuários e dados operacionais distribuídos |
| Evidências | Artifact `conform-flow-validation-30778232447`, ID `8842855944`, retenção de 14 dias |

Não foi aplicada formatação automática global. A base usa finais de linha mistos e uma correção integral criaria um commit massivo sem relação funcional.

## Fluxo validado

O workflow `Conform Flow full isolated validation` executou:

1. subir Supabase local;
2. restaurar o schema anterior à multiunidade;
3. carregar registros legados e aplicar somente as migrations novas;
4. validar preservação e backfill;
5. resetar um banco vazio;
6. executar SQL/RLS, Storage e lint do banco;
7. criar identidades e dados fictícios;
8. testar concorrência;
9. subir Edge Functions e frontend;
10. executar Playwright desktop/mobile;
11. executar carga controlada;
12. publicar artifacts sem segredos.

## Riscos de regressão observados

- duas árvores Supabase continuam existindo no repositório; `backend/supabase` é a fonte usada pelo CI;
- a sintaxe exata dos comandos de reset por versão precisa ser confirmada pelo runner;
- e-mail e Stripe Test Mode dependem de validações próprias fora deste escopo;
- migrations extensas exigem backup, ensaio anonimizado e rollout gradual;
- nenhuma evidência pendente deve ser convertida em PASS por inspeção estática.

## Decisão atual

**MULTIUNIDADE APROVADA PARA HOMOLOGAÇÃO.** A aprovação cobre a implementação e a validação isolada. O Supabase remoto e a produção permanecem inalterados; rollout produtivo continua condicionado a backup, homologação anonimizada e liberação gradual.
