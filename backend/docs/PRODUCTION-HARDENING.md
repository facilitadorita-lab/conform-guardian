# Checklist de produção — Conform Flow

As melhorias abaixo estão cobertas pelo frontend e pelas migrations/Edge Functions do projeto.

## Segurança e isolamento

- `has_company_access`, `can_write_company` e `can_admin_company` continuam sendo a fonte de verdade no backend.
- A troca de empresa exige confirmação visual e recarrega o contexto antes de navegar.
- `api_diagnostico_isolamento` permite executar um diagnóstico agregado por empresa no painel administrativo.
- O assistente usa o `empresa_id` validado pelo JWT e nunca recebe anexos, PDFs ou conteúdo confidencial.
- Ações privilegiadas exigem AAL2/MFA; a tela de segurança também permite encerrar outras sessões.
- O upload valida tamanho, MIME e assinatura binária (magic bytes) antes de registrar o anexo.

## Resiliência e custos

- Perguntas ao assistente são limitadas por usuário/empresa com janela de 60 segundos.
- Checkout e webhooks Stripe permanecem idempotentes; a conciliação continua no backend.
- Limites de plano e medição de uso aparecem no frontend, mas o bloqueio é sempre server-side.
- Backups, ensaios de restauração, retenção LGPD e relatórios agendados continuam auditáveis.

## Operação

- Erros globais e métricas de performance (LCP/tarefas longas) são enviados sem dados de negócio.
- A área Admin Master concentra saúde, alertas, falhas de entrega, cobranças e publicação.
- Rode `backend/supabase/tests/tenant-isolation.sql` com dois JWTs de teste antes de cada release.
- Depois de aplicar uma migration, publique a branch conectada ao Lovable e valide login, troca de empresa, upload, IA e bloqueio financeiro.
