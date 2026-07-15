# Sequência de prompts para construir no Lovable

Use estes prompts em ordem. Não peça o sistema inteiro em uma única geração.

## 1 — Base, autenticação e shell

```text
Conecte este projeto ao Supabase e construa a base autenticada do Conform Flow conforme LOVABLE_BUILD_SPEC.md. O Lovable deve ser um cliente fino: não implemente regras de negócio, cálculos, permissões ou escritas diretas em tabelas; use somente as RPCs e Edge Functions documentadas em BACKEND_API.md. Crie login, recuperação de senha, proteção visual de rotas e seletor de empresa ativa. Crie o shell responsivo com o logo oficial e a sidebar: Dashboard, Documentos, Equipamentos, Manutenções, Pendências, Alertas, Relatórios, Usuários e Configurações. Não crie itens de sidebar para Calibrações ou Qualificações. Implemente loading, erro e sessão expirada. Não use service_role no frontend.
```

## 2 — Dashboard e documentos

```text
Implemente o Dashboard e o módulo Documentos consumindo exclusivamente as RPCs e Edge Functions de BACKEND_API.md. O dashboard deve renderizar o retorno de api_dashboard. Documentos deve usar api_listar_documentos, api_criar_documento, api_excluir_logicamente e create-evidence-upload. Não calcule status, métricas, paginação ou caminhos de arquivo no frontend.
```

## 3 — Equipamentos e históricos filhos

```text
Implemente o fluxo obrigatório Equipamentos → equipamento selecionado usando api_listar_equipamentos e api_equipamento_detalhe. A ficha deve ter abas Dados gerais, Calibrações, Qualificações, Manutenções, Anexos e Histórico. Calibrações e qualificações não podem existir como módulos globais nem na sidebar. Seus formulários chamam api_criar_calibracao e api_criar_qualificacao com IDs vindos do contexto da rota. Apenas renderize a vigência e o histórico determinados pelo backend.
```

## 4 — Manutenções, pendências e alertas

```text
Implemente Manutenções em dois pontos usando a mesma RPC api_listar_manutencoes: visão global na sidebar com todos os equipamentos e serviços; e histórico na aba do equipamento filtrando por p_equipamento_id. Não duplique dados. Separe natureza preventiva/corretiva de tipo de serviço. Na corretiva, exiba falha, prioridade, diagnóstico, causa raiz, ação realizada, tempo parado e retorno à operação. Crie também Pendências e Alertas consumindo somente as APIs do backend.
```

## 5 — Usuários, configurações e relatórios

```text
Implemente gestão de usuários por empresa com perfis administrador, responsável técnico, colaborador e somente leitura. Convites devem chamar uma Edge Function, nunca Admin API no navegador. Implemente configurações da empresa e alertas. Crie relatórios de conformidade, documentos, equipamentos e pendências, com filtros e exportação. O frontend deve esconder ações não autorizadas, mas a segurança deve permanecer na RLS.
```

## 6 — Admin Master e endurecimento

```text
Crie a área separada do Admin Master com empresas, usuários, planos, catálogos e logs. Antes de abrir dados de uma empresa, chame registrar_acesso_master. Exiba aviso persistente de acesso Master. Depois faça uma revisão completa: nenhum acesso cruzado por CNPJ, nenhuma exclusão física, anexos privados com URLs assinadas, formulários com validação, foco acessível, responsividade em tablet e tratamento consistente de erros.
```
