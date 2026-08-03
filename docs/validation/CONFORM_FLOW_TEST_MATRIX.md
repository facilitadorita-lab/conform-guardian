# Matriz de validação — Conform Flow

## Legenda

| Estado | Significado |
| --- | --- |
| PASS | Evidência executada e aprovada. |
| FAIL | Evidência executada e reprovada. |
| PREPARED | Implementado e coberto por teste, mas o teste isolado ainda não foi executado. |
| PARTIAL | Há evidência positiva, mas falta uma parte obrigatória do fluxo. |
| BLOCKED | Não pode ser executado com segurança no ambiente atual. |

Testes somente preparados nunca são classificados como PASS.

## Resultado atual

| Domínio | Estado | Evidência atual |
| --- | --- | --- |
| TypeScript | PASS local | `tsc --noEmit` sem erros. |
| Build de produção | PASS local | Build concluído; maior chunk JavaScript do cliente com aproximadamente 295 kB. |
| Lint dos arquivos alterados | PASS local | Regras funcionais passaram; a regra de formatação foi deliberadamente excluída para evitar alteração massiva de finais de linha. |
| Schema multiunidade | PASS | Migrations divididas por estrutura, backfills, contratos e segurança; instalação limpa aprovada. |
| Migração de dados legados | PASS | Fixture anterior à multiunidade preservada e validada após as migrations. |
| Banco vazio | PASS | Reset completo do Supabase local aprovado. |
| Matriz automática | PASS | Teste confirma exatamente uma matriz por empresa. |
| Documentos corporativos e por unidade | PASS | Escopo, backfill, RPCs, RLS e cenários SQL/E2E aprovados. |
| Equipamentos e históricos | PASS | Unidade obrigatória, herança, transferência e preservação histórica aprovadas. |
| Usuários por unidade | PASS | Acesso global/específico, unidade principal e FK composta aprovados. |
| RLS empresa + unidade | PASS | SELECT, escrita, UUID cruzado, RPC, Storage, QR e FlowIA aprovados. |
| Limite base + add-on | PASS | Limite efetivo e regressão com unidades reais aprovados. |
| Concorrência da última vaga | PASS | Duas criações simultâneas resultam em uma única vaga consumida. |
| CRUD e seletor de unidades | PASS | Página, contexto, cache e cenários desktop/mobile aprovados. |
| Dashboard e vencimentos | PASS | RPCs e telas por unidade/consolidado aprovados. |
| Relatórios | PASS | Escopo por unidade, consolidado, agendamento e relatório executivo aprovados. |
| FlowIA | PASS | Contexto recalculado no backend e ausência de leitura de anexos validados. |
| QR Code | PASS | Resolução por equipamento/empresa/unidade e negação cruzada aprovadas. |
| Parceiros | PASS | Carteira própria aprovada; parceiro vizinho permanece negado. |
| Admin Master | PASS | Login, visão global, capacidade, parceiros e empresas aprovados. |
| Auditoria | PASS | Imutabilidade e contexto de unidade aprovados. |
| E2E | PASS | 22 cenários funcionais, totalizando 44 execuções em desktop e mobile. |
| Carga controlada | PASS | 20 empresas, 60 unidades, 100 usuários e registros distribuídos. |
| Stripe, SMTP e entrega externa | PARTIAL | Fora do escopo funcional da multiunidade e ainda dependente de sandbox/SMTP de homologação. |

## Decisão

**MULTIUNIDADE APROVADA PARA HOMOLOGAÇÃO.** Workflow 30778232447 integralmente verde; artifact `conform-flow-validation-30778232447` disponível por 14 dias. Produção não foi alterada e depende do rollout controlado.
