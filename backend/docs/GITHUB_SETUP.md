# Configuração GitHub

## Repositórios

Use dois repositórios:

1. `conform-flow-backend`: este workspace, contendo Supabase, regras e documentação.
2. Repositório criado automaticamente pelo Lovable: frontend React.

O Lovable não importa um repositório existente. Por isso, o frontend deve ser criado no Lovable e depois conectado ao GitHub em `Settings → Connectors → GitHub`.

## Criar o backend remoto

1. Crie no GitHub um repositório privado vazio chamado `conform-flow-backend`.
2. Não adicione README, `.gitignore` ou licença pelo GitHub; eles já existem localmente.
3. Configure o remoto:

```bash
git remote add origin https://github.com/SUA-CONTA/conform-flow-backend.git
git branch -M main
git push -u origin main
```

## Proteção recomendada

- repositório privado;
- autenticação em dois fatores;
- branch `main` protegida;
- pull request obrigatório;
- workflow Backend CI obrigatório;
- ambiente `production` com aprovação manual;
- impedir force push e exclusão da `main`.

## GitHub Secrets

Cadastre em `Settings → Secrets and variables → Actions`:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`

Os secrets de runtime das Edge Functions devem ser cadastrados diretamente no Supabase, não no frontend.

## Lovable

Depois que o Lovable criar o repositório do frontend:

- mantenha apenas URL e chave publicável do Supabase no frontend;
- não copie `service_role` para o Lovable;
- implemente chamadas conforme `BACKEND_API.md`;
- use a sequência de `LOVABLE_PROMPTS.md`;
- não replique regras de negócio em React.

