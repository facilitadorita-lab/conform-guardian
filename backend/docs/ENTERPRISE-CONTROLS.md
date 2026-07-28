# Controles enterprise adicionais

Este pacote adiciona controles operacionais e de segurança ao Conform Flow:

- `api_master_testar_isolamento` executa verificações de consistência entre tenants e grava o resultado auditável.
- `api_master_registrar_ensaio_backup` registra RPO/RTO e a evidência de cada ensaio de restauração.
- `api_master_fila_cobranca` e `api_master_enfileirar_cobranca` sustentam a régua de recuperação de pagamentos sem expor dados entre empresas.
- `api_master_consumo_empresas` centraliza o consumo de documentos, equipamentos e armazenamento para o Admin Master.
- `api_avaliar_segmento_ia` usa somente dados estruturados para classificar o segmento e sugerir documentos prioritários.
- A Central de Vencimentos possui visualização em calendário e lista.
- QR Codes podem abrir o último cadastro autorizado em modo offline; nenhuma tentativa offline libera um ambiente novo.
- `api_master_api_security_snapshot` fornece indicadores de RLS, funções protegidas e privilégios públicos para a revisão OWASP.

O PITR continua sendo uma configuração do projeto Supabase, não uma permissão que o frontend possa alterar. Deve ser ativado apenas no projeto de produção, com revisão de retenção e custo.
