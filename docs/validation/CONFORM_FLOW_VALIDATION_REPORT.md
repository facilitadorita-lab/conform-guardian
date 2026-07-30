# Relatório de validação — Conform Flow

## Resumo executivo

A implementação multiunidade foi construída na branch `feat/multiunidade-completa` sem alterar o Supabase remoto. O código local passa em TypeScript, build de produção e lint funcional dos arquivos alterados. A validação de banco e navegador foi preparada para um Supabase local descartável no GitHub Actions e ainda precisa ser executada antes da aprovação.

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

## Evidência já executada

| Verificação | Resultado |
| --- | --- |
| TypeScript | PASS local |
| Build de produção | PASS local |
| Lint funcional dos arquivos alterados | PASS local |
| Scripts de bootstrap, carga e concorrência | PASS de sintaxe |
| Diferenças inválidas/whitespace | PASS local |
| Bundle acima de 500 kB | Não ocorre; maior chunk cliente aproximado de 295 kB |

Não foi aplicada formatação automática global. A base usa finais de linha mistos e uma correção integral criaria um commit massivo sem relação funcional.

## Evidência pendente

O workflow `Conform Flow full isolated validation` deve:

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

**MULTIUNIDADE NÃO APROVADA.** A implementação está funcionalmente completa no código, porém a aprovação depende do workflow isolado integralmente verde e da análise dos artifacts.
