# Frontend de homologação

O frontend de testes é publicado separadamente da produção em:

`https://facilitadorita-lab.github.io/conform-guardian/`

## Publicação

1. Confirme que o workflow `Deploy Supabase staging` terminou com sucesso.
2. Abra **Actions > Deploy frontend staging** na mesma branch validada.
3. Execute o workflow e informe `PUBLICAR-HOMOLOGACAO`.
4. Aguarde os jobs de build e deploy ficarem verdes.

O workflow usa somente o Environment GitHub `staging`, bloqueia explicitamente
o Supabase de produção e inclui `noindex` para impedir indexação por buscadores.
Os arquivos publicados recebem apenas a chave pública do Supabase de homologação;
credenciais administrativas nunca são incluídas no frontend.
