# Lacunas conhecidas e plano de fechamento

| Prioridade | Lacuna | Impacto | Fechamento |
| --- | --- | --- | --- |
| P0 | Workflow multiunidade ainda não executado neste branch. | Não há evidência real de migrations, RLS, E2E, concorrência e carga. | Abrir PR draft, executar o workflow, corrigir falhas e repetir até verde. |
| P0 | Ensaio usa comandos de reset/migration dependentes da versão atual da Supabase CLI. | Uma diferença de sintaxe pode interromper o CI antes dos testes. | Confirmar no primeiro run e fixar a versão da CLI após aprovação. |
| P0 | Migração remota não foi executada, por segurança. | Produção ainda não possui multiunidade. | Validar em homologação anonimizada, fazer backup e rollout controlado. |
| P0 | SMTP/recuperação de senha não fazem parte da evidência multiunidade. | Convites e recuperação podem continuar com falhas externas. | Validar Mailpit/Inbucket e depois SMTP transacional em homologação. |
| P0 | Stripe ponta a ponta não foi exercitado nesta mudança. | Add-on faturado e webhook ainda precisam de comprovação comercial. | Executar Stripe Test Mode com webhook assinado e fixtures próprias. |
| P1 | Duas árvores Supabase existem no repositório. | Risco de migration/function entrar na árvore não implantada. | Manter `backend/supabase` como fonte oficial e arquivar a árvore duplicada em mudança separada. |
| P1 | Migrações multiunidade são extensas. | Maior custo de revisão e risco operacional. | Revisão SQL, ensaio legado, banco vazio, backup e implantação gradual. |
| P1 | Formatação global continua divergente. | O lint completo ainda pode acusar estilo legado. | Corrigir em PR dedicado; nesta mudança, validar apenas regras funcionais dos arquivos alterados. |
| P1 | Monitoramento remoto de negações por unidade ainda não existe. | Incidentes de permissão podem demorar a ser percebidos. | Criar alertas para `UNIT_ACCESS_DENIED`, `UNIT_COMPANY_MISMATCH` e `UNIT_LIMIT_REACHED`. |
| P2 | Teste de carga preparado ainda não foi executado. | Capacidade multiunidade não está comprovada. | Executar após E2E verde e registrar p50, p95, p99 e erros nos artifacts. |
| P2 | Screenshots do fluxo ainda dependem do runner. | Revisão visual do PR fica incompleta. | Capturar desktop/mobile no workflow ou durante homologação. |

O antigo bloqueio “multiunidade não implementada” foi removido porque o código agora existe. Ele foi substituído corretamente por “implementada, aguardando evidência executada”.
