# Implantação do backend Supabase

## Migrations

Os arquivos versionados estão em `supabase/migrations/` e são executados automaticamente em ordem pela Supabase CLI.

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push --dry-run --include-all
supabase db push --include-all
```

Use primeiro um projeto de homologação. Produção deve ser implantada pelo workflow manual `Deploy Backend`, após revisão e aprovação do ambiente protegido no GitHub.

## Autenticação

No primeiro cadastro de usuário, uma função server-side deve:

1. criar o usuário em `auth.users`;
2. inserir o perfil correspondente em `public.usuarios` usando o mesmo UUID;
3. criar o vínculo em `public.usuarios_empresas`;
4. enviar convite ou recuperação de senha;
5. nunca expor `service_role` ao Lovable.

Criação de empresas e convites devem acontecer via Edge Function protegida, pois exigem operações administrativas.

## Variáveis do Lovable

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Somente a chave anônima pode ficar no frontend. `SUPABASE_SERVICE_ROLE_KEY` e credenciais de e-mail pertencem exclusivamente aos secrets das Edge Functions.

## Edge Functions necessárias

### `invite-company-user`

- valida se o solicitante é Admin Master ou administrador da empresa;
- cria/convida o usuário;
- grava `usuarios` e `usuarios_empresas`;
- retorna resposta sem dados sensíveis.

### `dispatch-expiration-alerts`

- executada diariamente no timezone da empresa;
- consulta views de status;
- cria alertas para 60, 30, 15, 7 e 0 dias e itens vencidos;
- usa a chave única de `alertas` para impedir duplicidade;
- envia e-mail apenas quando `configuracoes_empresa.enviar_email = true`;
- atualiza `email_status` e `email_enviado_at`.

### `export-report-pdf`

- valida acesso à empresa;
- busca dados no backend;
- gera PDF com empresa, CNPJ, filtros e data;
- devolve URL assinada temporária.

### `create-evidence-upload`

- valida usuário, empresa, módulo, registro, tipo e tamanho;
- cria URL assinada com caminho definido pelo backend;
- confirma a existência do objeto antes de registrar metadados;
- controla substituição e versão do anexo.

## Storage

O bucket `evidencias` é privado. O frontend deve gerar caminhos no formato:

```text
{empresa_id}/{modulo}/{registro_id}/{uuid}-{nome-sanitizado}
```

Após upload bem-sucedido, inserir a linha em `anexos`. Se a inserção falhar, remover o objeto recém-enviado para não deixar arquivo órfão.

Para substituição:

1. enviar um novo objeto com UUID próprio;
2. inserir novo anexo com `versao + 1` e `substitui_anexo_id`;
3. atualizar o anterior para `status = 'substituido'`;
4. manter o arquivo anterior no histórico.

## Auditoria

Os triggers registram criação, edição e exclusão lógica. Downloads e visualizações não são operações de banco na tabela principal, portanto o Lovable deve chamar uma RPC específica de auditoria antes de gerar a URL assinada.

O Admin Master deve chamar `registrar_acesso_master` antes de carregar qualquer módulo de uma empresa.

## Checklist antes da publicação

- testar isolamento com dois usuários de empresas diferentes;
- tentar consultar IDs cruzados manualmente;
- validar que URLs assinadas expiram;
- confirmar que usuário somente leitura não grava;
- testar bloqueio de empresa e usuário;
- testar troca de empresa limpando cache;
- conferir timezone dos alertas;
- testar anexos acima do limite e formatos inválidos;
- confirmar que exclusões são lógicas;
- revisar logs de auditoria e acesso Master.
