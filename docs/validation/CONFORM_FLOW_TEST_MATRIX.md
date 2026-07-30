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
| Schema multiunidade | PREPARED | Migrations `20260730000600` a `20260730000900` criam modelo, APIs, segurança, auditoria e contratos. |
| Migração de dados legados | PREPARED | Fixture anterior à multiunidade e ensaio pós-migration estão no workflow descartável. |
| Banco vazio | PREPARED | Reset completo do Supabase local está configurado no workflow. |
| Matriz automática | PREPARED | Migration e teste verificam exatamente uma matriz por empresa. |
| Documentos corporativos e por unidade | PREPARED | Escopo, backfill, RPCs, RLS e cenários SQL/E2E adicionados. |
| Equipamentos e históricos | PREPARED | Unidade obrigatória, herança, transferência e preservação histórica cobertas. |
| Usuários por unidade | PREPARED | Acesso global/específico, unidade principal e FK composta cobertos. |
| RLS empresa + unidade | PREPARED | SQL testa SELECT, escrita, UUID cruzado, RPC, Storage, QR e FlowIA. |
| Limite base + add-on | PREPARED | Limite efetivo usa assinatura e teste de regressão usa unidades reais. |
| Concorrência da última vaga | PREPARED | Duas criações simultâneas e resultado único são exercitados por script. |
| CRUD e seletor de unidades | PREPARED | Página, contexto, cache por empresa/unidade e cenários desktop/mobile adicionados. |
| Dashboard e vencimentos | PREPARED | RPCs e telas suportam unidade ou consolidado. |
| Relatórios | PREPARED | Escopo por unidade, consolidado, agendamento e relatório executivo com IA. |
| FlowIA | PREPARED | Contexto recalculado no backend, sem leitura de anexos. |
| QR Code | PREPARED | Resolução por equipamento, empresa e unidade; UUID não autorizado é negado. |
| Parceiros | PREPARED | Carteira preserva cliente e unidade; parceiro vizinho é negado. |
| Admin Master | PREPARED | Uso, limite, add-on, excesso, parceiro e receita de unidade extra. |
| Auditoria | PREPARED | Unidade, trocas, transferências, acesso e ações semânticas são registradas. |
| E2E | PREPARED | 22 cenários explícitos, executados em desktop/mobile quando aplicável. |
| Carga controlada | PREPARED | 20 empresas, 1–5 unidades, 100 usuários e registros distribuídos. |
| Stripe, SMTP e entrega externa | PARTIAL | Fora do escopo funcional da multiunidade e ainda dependente de sandbox/SMTP de homologação. |

## Decisão

**MULTIUNIDADE NÃO APROVADA.** A implementação está pronta para validação isolada, mas somente poderá mudar para PASS depois de o workflow completo executar migrations, SQL/RLS, Edge Functions, E2E, concorrência, carga e geração de artifacts.
