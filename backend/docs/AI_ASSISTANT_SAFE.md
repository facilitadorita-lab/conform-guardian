# Conform Flow — Assistente IA seguro

## Objetivo

Permitir que o cliente pergunte sobre manutenção, vencimentos, equipamentos e setores sem expor documentos anexados.

Exemplos de perguntas aceitas:

- "Quais manutenções estão vencidas?"
- "O que tenho para fazer na Geladeira 01?"
- "Quais equipamentos da sala de vacina precisam de atenção?"
- "Quais vencimentos críticos existem este mês?"

## Regra de confidencialidade

A IA não deve ler anexos.

Ela pode consultar somente dados estruturados do banco:

- nome do equipamento;
- setor;
- criticidade;
- status de calibração;
- status de qualificação;
- status de manutenção;
- datas de vencimento;
- pendências abertas;
- responsáveis e prazos quando existirem.

Ela não pode consultar:

- PDF;
- imagem;
- DOCX;
- conteúdo de laudos;
- `storage_path`;
- arquivo anexado no bucket.

## Implementação inicial

A migration `20260701001300_ai_assistant_and_blocked_access.sql` cria:

- tabela `interacoes_assistente`;
- função `api_assistente_contexto`.
- Edge Function `assistant-query`.

A função retorna contexto seguro em JSON e informa explicitamente:

```json
{
  "politica_privacidade": {
    "le_anexos": false,
    "usa_storage_path": false,
    "fontes": "somente metadados estruturados do banco"
  }
}
```

## Caminho gratuito

Na primeira versão, o modo mais seguro e barato é usar IA estruturada:

1. backend busca o contexto permitido;
2. backend monta uma resposta objetiva com regras fixas;
3. se no futuro for conectado um modelo gratuito/local, ele receberá apenas esse JSON seguro;
4. nenhum anexo será enviado ao modelo.

A função `assistant-query` já executa esse fluxo sem depender de API paga externa.

Variável preparada:

```env
AI_PROVIDER=structured
```

## Regra de plano

O assistente deve ser controlado por plano.

Sugestão:

- plano Starter: sem IA;
- plano Professional: IA para vencimentos e manutenções;
- plano Enterprise: IA com filtros avançados por setor, equipamento e relatórios.

## Segurança

- respeitar RLS e `has_company_access`;
- bloquear empresa inadimplente;
- registrar pergunta, resposta e fontes;
- salvar `leu_anexos=false` em todas as interações;
- nunca usar service role para responder pergunta de usuário comum sem validar empresa e permissão.
