# Conform Flow — procedimento de backup e restauração

O backup lógico diário é criado pelo workflow `Encrypted backup and restore test`. O arquivo é criptografado antes de sair do runner e o dump sem criptografia é removido ao final.

## Segredos obrigatórios do ambiente `production-backup`

- `SUPABASE_DB_URL`: conexão direta do banco de produção, armazenada somente no GitHub Environment.
- `RESTORE_TEST_DB_URL`: banco PostgreSQL descartável e isolado. Nunca apontar para produção.
- `BACKUP_ENCRYPTION_PASSWORD`: segredo longo e exclusivo, guardado também fora do GitHub em cofre corporativo.

## Objetivos iniciais

- RPO: até 24 horas.
- RTO operacional: até 4 horas.
- Retenção no GitHub: 30 dias para artefatos já criptografados.
- Teste de restauração: diário, no banco descartável.

## Recuperação autorizada

1. Baixar o artefato criptografado e validar o SHA-256.
2. Descriptografar em estação controlada com `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000`.
3. Restaurar primeiro em banco vazio e isolado.
4. Validar contagens, RLS, autenticação, anexos e histórico de auditoria.
5. Registrar aprovação de duas pessoas antes de apontar a aplicação para o banco restaurado.
6. Eliminar de forma segura qualquer dump em texto claro.

O Storage de evidências requer política de backup própria no provedor; o dump PostgreSQL preserva metadados e caminhos, mas não copia os binários do bucket.
