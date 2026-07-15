# Segurança multiempresa — Conform Flow

Este projeto é multiempresa. A regra principal é:

> CNPJ identifica a empresa no cadastro, mas não é a chave de segurança.

O isolamento real acontece com:

- `auth.uid()` do usuário autenticado;
- vínculo em `usuarios_empresas`;
- `empresa_id` interno, do tipo UUID;
- RLS no Supabase;
- RPCs e Edge Functions para operações de negócio;
- bucket privado de evidências.

## Por que não usar CNPJ como segurança?

O CNPJ é previsível e público. Ele pode aparecer em nota fiscal, contrato, site ou relatório.

Se o sistema filtrasse dados apenas por CNPJ vindo do frontend, um usuário poderia tentar trocar esse valor manualmente. Por isso:

- o CNPJ é armazenado e validado para cadastro;
- o backend normaliza o CNPJ em `cnpj_normalizado`;
- existe índice único para impedir duplicidade;
- o acesso aos dados usa `empresa_id`, nunca CNPJ digitado pelo usuário.

## Fluxo correto de acesso

```text
Login Supabase
  ↓
auth.uid()
  ↓
usuarios_empresas
  ↓
empresa_id permitido
  ↓
RLS libera somente registros daquela empresa
```

## Regra para o Lovable

O Lovable é apenas frontend.

Ele não deve:

- escrever direto em tabelas;
- montar filtros de segurança por CNPJ;
- permitir `empresa_id` editável em formulário;
- chamar `.insert()`, `.update()` ou `.delete()` nas tabelas de negócio;
- criar caminho de arquivo manualmente.

Ele deve:

- obter empresas permitidas via `api_contexto_usuario`;
- usar o `empresa_id` selecionado pelo contexto autenticado;
- chamar RPCs `api_*`;
- usar Edge Function para upload;
- tratar erro `42501` como “sem permissão”.

## Proteções aplicadas no banco

- RLS habilitado nas tabelas principais.
- `has_company_access(empresa_id)` valida vínculo usuário/empresa.
- `can_write_company(empresa_id)` separa leitura de escrita.
- `can_admin_company(empresa_id)` separa administração.
- `validate_tenant_integrity()` impede relacionamento cruzado entre empresas.
- `anexos.storage_path` precisa começar com:

```text
{empresa_id}/{modulo}/{registro_id}/
```

- O bucket `evidencias` é privado.
- Escrita direta nas tabelas foi revogada para `authenticated` e `anon`.
- Exclusão é lógica, via backend.
- Logs de auditoria registram alterações.

## Checklist antes de produção

- Configurar `ALLOWED_ORIGIN` nas Edge Functions com o domínio real do frontend.
- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Manter `VITE_SUPABASE_ANON_KEY` somente como chave pública do cliente.
- Validar RLS com dois usuários de empresas diferentes.
- Testar tentativa de trocar `empresa_id` manualmente em chamadas RPC.
- Testar tentativa de abrir arquivo de outra empresa no Storage.
- Ativar backups automáticos do Supabase.
- Configurar MFA para administradores internos.
