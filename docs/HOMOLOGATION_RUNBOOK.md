# Homologação segura do Conform Flow

## Objetivo

Validar migrations, segurança multiempresa, contratos do backend e o frontend em um ambiente remoto separado antes de qualquer publicação em produção.

## Regra obrigatória

Homologação e produção usam projetos Supabase diferentes. O fluxo de homologação bloqueia explicitamente o projeto de produção do Conform Flow e não aceita Stripe em modo real.

Use somente dados sintéticos. Não copie documentos, anexos, CNPJs, e-mails ou informações pessoais de clientes reais para homologação.

## Preparação única no GitHub

Crie o Environment protegido `staging` e cadastre nele:

- `SUPABASE_ACCESS_TOKEN`: token de automação guardado apenas no GitHub;
- `SUPABASE_DB_PASSWORD`: senha do banco exclusivo de homologação;
- `SUPABASE_PROJECT_ID`: referência do projeto exclusivo de homologação;
- `SUPABASE_URL`: URL HTTPS do mesmo projeto de homologação;
- `SUPABASE_SERVICE_ROLE_KEY`: chave de serviço do projeto de homologação.

Não use variáveis `VITE_*` para nenhuma credencial privada. Restrinja o Environment à branch aprovada e mantenha aprovação humana antes da execução.

## Implantação

1. Abra **Actions > Deploy Supabase staging**.
2. Escolha o commit ou a branch que será validado.
3. Execute manualmente o workflow e digite `HOMOLOGAR` no campo de confirmação.
4. Aprove o Environment `staging`, se solicitado.
5. Aguarde todos os testes e a implantação terminarem em verde.

O workflow executa, nesta ordem:

1. TypeScript e build do frontend;
2. reconstrução local completa do banco;
3. testes de isolamento entre empresas, segurança, sandbox e prontidão;
4. bloqueio de URL ou referência de produção;
5. prévia e lint das migrations no projeto de homologação;
6. aplicação das migrations;
7. nova prévia para confirmar que não restou migration pendente;
8. novo lint do banco;
9. publicação das Edge Functions;
10. smoke test somente leitura das tabelas e RPCs essenciais;
11. registro auditável da implantação.

## Validação funcional após a implantação

Use contas e empresas fictícias para validar:

- login de Admin Master, parceiro, administrador, responsável técnico, colaborador e somente leitura;
- isolamento entre duas empresas não relacionadas;
- parceiro acessando somente clientes da própria carteira;
- empresa cliente sem acesso às demais empresas do parceiro;
- troca de unidade limpando filtros e dados anteriores;
- documentos, anexos, equipamentos, calibrações, qualificações e manutenções;
- FlowIA respeitando empresa e unidade selecionadas;
- checkout, webhook, inadimplência e bloqueio com Stripe em modo de teste;
- URLs assinadas de anexos e logs de auditoria.

## Critério de aprovação

A versão só pode seguir para produção quando o workflow estiver verde, a validação funcional não tiver falhas críticas ou altas e a evidência da execução estiver vinculada à versão candidata.

Uma falha de homologação nunca é corrigida diretamente no banco remoto. A correção deve virar código ou migration versionada, passar novamente pelo pipeline e ser revalidada.
