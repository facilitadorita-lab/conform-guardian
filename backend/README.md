# Conform Flow Backend

Backend multiempresa da plataforma Conform Flow, preparado para Supabase e consumido por um frontend criado no Lovable.

## Princípios

- toda regra de negócio permanece no backend;
- o Lovable atua como cliente fino;
- isolamento obrigatório por `empresa_id`;
- escrita somente por RPCs e Edge Functions;
- anexos privados com URLs assinadas;
- auditoria e exclusão lógica;
- calibrações e qualificações pertencem ao histórico do equipamento;
- manutenções possuem visão global e histórico por equipamento sem duplicação.

## Estrutura

```text
supabase/
├── migrations/                 Banco, RLS, RPCs, views e regras
├── functions/                  Edge Functions
└── config.toml                 Ambiente local Supabase
docs/
├── BACKEND_API.md              Contratos consumidos pelo Lovable
├── LOVABLE_BUILD_SPEC.md       Especificação funcional e visual
├── LOVABLE_PROMPTS.md          Sequência segura de construção
├── SUPABASE_DEPLOY.md          Implantação do backend
└── GITHUB_SETUP.md             Repositório e CI/CD
prototype/                      Referência visual; não é produção
assets/                         Identidade visual para handoff
```

## Desenvolvimento local

Pré-requisitos: Docker e Supabase CLI.

```bash
supabase start
supabase db reset
supabase functions serve
```

## Implantação

As migrations são aplicadas em ordem pela Supabase CLI. Produção é implantada manualmente pelo workflow `Deploy Backend`, protegido pelo ambiente `production` do GitHub.

Nunca adicione chaves reais ao repositório. Use GitHub Secrets e Supabase Secrets.

## Frontend

O frontend deve ser criado no Lovable a partir de `docs/LOVABLE_PROMPTS.md` e chamar somente as APIs documentadas em `docs/BACKEND_API.md`.

Este projeto é proprietário. Todos os direitos reservados.

