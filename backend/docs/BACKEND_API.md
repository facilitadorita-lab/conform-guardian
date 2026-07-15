# Contrato do backend para o Lovable

O Lovable não deve escrever diretamente nas tabelas. Toda operação de negócio usa RPC ou Edge Function.

## Segurança multiempresa

O frontend nunca deve usar CNPJ como filtro de segurança. O CNPJ é apenas dado cadastral.

A segurança real usa:

- usuário autenticado (`auth.uid()`);
- vínculo em `usuarios_empresas`;
- `empresa_id` UUID;
- RLS no Supabase;
- RPCs/Edge Functions.

Se o usuário tentar trocar `empresa_id`, `registro_id` ou caminho de arquivo manualmente, o backend deve retornar erro de permissão. Veja também `docs/SECURITY_MULTI_TENANT.md`.

## Sessão

```ts
const { data } = await supabase.rpc('api_contexto_usuario')
```

Retorna perfil, papel Master e empresas permitidas.

## Dashboard

```ts
await supabase.rpc('api_dashboard', { p_empresa_id: empresaId })
```

O backend retorna contagens, conformidade e pendências críticas já calculadas.

## Listagens paginadas

- `api_listar_documentos`
- `api_listar_equipamentos`
- `api_listar_manutencoes`
- `api_listar_pendencias`
- `api_listar_alertas`

Exemplo:

```ts
await supabase.rpc('api_listar_equipamentos', {
  p_empresa_id: empresaId,
  p_busca: busca || null,
  p_status: status || null,
  p_limite: 25,
  p_offset: pagina * 25,
})
```

Busca, filtros, paginação e contagem são processados no backend.

`api_listar_manutencoes` aceita também `p_natureza` e `p_equipamento_id`. A tela global envia `p_equipamento_id: null`; a aba interna do equipamento envia o ID selecionado. Assim, ambas exibem a mesma tabela sem duplicar registros.

## Ficha do equipamento

```ts
await supabase.rpc('api_equipamento_detalhe', {
  p_empresa_id: empresaId,
  p_equipamento_id: equipamentoId,
})
```

Retorna em uma resposta: dados consolidados, calibrações, qualificações, manutenções, anexos e auditoria.

## Cadastros

```ts
await supabase.rpc('api_criar_documento', { p_empresa_id: empresaId, p_payload: form })
await supabase.rpc('api_criar_equipamento', { p_empresa_id: empresaId, p_payload: form })
await supabase.rpc('api_criar_calibracao', { p_empresa_id: empresaId, p_equipamento_id: equipamentoId, p_payload: form })
await supabase.rpc('api_criar_qualificacao', { p_empresa_id: empresaId, p_equipamento_id: equipamentoId, p_payload: form })
await supabase.rpc('api_criar_manutencao', { p_empresa_id: empresaId, p_payload: form })
```

O frontend nunca deve permitir que o usuário informe manualmente `empresa_id` ou `equipamento_id` nos formulários filhos; esses valores vêm do contexto da rota.

## Atualizações

- `api_atualizar_documento`
- `api_atualizar_equipamento`
- `api_atualizar_calibracao`
- `api_atualizar_qualificacao`
- `api_atualizar_manutencao`

Todas recebem `p_empresa_id`, `p_id` e `p_payload`. Envie apenas os campos alterados. Não use `.update()` diretamente no Lovable.

## Pendências

```ts
await supabase.rpc('api_registrar_tratativa', {
  p_empresa_id: empresaId,
  p_pendencia_id: pendenciaId,
  p_payload: form,
})
```

A RPC cria a tratativa e atualiza a pendência na mesma transação.

## Exclusão lógica

```ts
await supabase.rpc('api_excluir_logicamente', {
  p_empresa_id: empresaId,
  p_modulo: 'documentos',
  p_registro_id: id,
})
```

Não chamar `delete()` ou atualizar `deleted_at` pelo frontend.

## Alertas e configurações

```ts
await supabase.rpc('api_marcar_alerta_lido', { p_alerta_id: id, p_lido: true })
await supabase.rpc('api_salvar_configuracoes', { p_empresa_id: empresaId, p_payload: form })
```

## Convite de usuário

```ts
await supabase.functions.invoke('invite-company-user', {
  body: { empresa_id: empresaId, nome, email, telefone, cargo, perfil },
})
```

A Edge Function valida a permissão e usa a API administrativa somente no servidor.

## Upload privado

O upload possui duas etapas para impedir caminhos arbitrários e metadados falsos.

### Preparar

```ts
const { data } = await supabase.functions.invoke('create-evidence-upload', {
  body: {
    action: 'prepare', empresa_id: empresaId, modulo, registro_id: registroId,
    nome_original: file.name, mime_type: file.type, tamanho_bytes: file.size,
  },
})
```

Enviar o arquivo usando `data.path` e `data.token` na operação de upload assinado.

### Confirmar

```ts
await supabase.functions.invoke('create-evidence-upload', {
  body: {
    action: 'complete', empresa_id: empresaId, modulo, registro_id: registroId,
    path: data.path, nome_original: file.name, mime_type: file.type,
    tamanho_bytes: file.size, finalidade: 'certificado', substitui_anexo_id: null,
  },
})
```

Somente a confirmação cria o registro em `anexos`.

## Tratamento de erros

- `42501`: sem permissão;
- `28000`: sessão inválida;
- demais mensagens: validação de negócio ou indisponibilidade.

O frontend deve apresentar a mensagem de forma amigável, sem tentar reinterpretar a regra.

## Admin Master — financeiro e planos

Essas chamadas são exclusivas do Admin Master. Clientes comuns não devem ver essas telas nem chamar essas RPCs.

### Resumo financeiro

```ts
await supabase.rpc('api_master_financeiro_resumo')
```

Retorna empresas ativas/bloqueadas, assinaturas ativas/inadimplentes, usuários ativos, receita mensal prevista, receita recebida no mês, próximos pagamentos e pagamentos atrasados.

### Assinaturas

```ts
await supabase.rpc('api_master_listar_assinaturas')
```

Lista empresas com plano atual, status financeiro, valor mensal, desconto, próximo vencimento e quantidade de usuários ativos.

### Planos

```ts
await supabase.rpc('api_master_listar_planos')
await supabase.rpc('api_master_salvar_plano', {
  p_plano_id: planoIdOuNull,
  p_payload: {
    nome,
    codigo,
    valor_mensal_centavos,
    valor_anual_centavos,
    limite_usuarios,
    limite_documentos,
    limite_equipamentos,
    limite_storage_mb,
    recursos,
    ativo,
    disponivel_venda,
  },
})
```

`recursos` controla quais módulos uma empresa pode usar:

- `documentos`
- `equipamentos`
- `calibracoes`
- `qualificacoes`
- `manutencoes`
- `pendencias`
- `alertas`
- `relatorios`
- `auditoria`
- `usuarios`
- `anexos`
- `multi_unidades`
- `suporte_prioritario`

O frontend pode esconder módulos não inclusos no plano, mas o bloqueio real é no backend.

### Alterar assinatura da empresa

```ts
await supabase.rpc('api_master_atualizar_assinatura', {
  p_empresa_id: empresaId,
  p_payload: {
    plano_id,
    status,
    ciclo,
    valor_mensal_centavos,
    valor_anual_centavos,
    desconto_centavos,
    desconto_percentual,
    proximo_vencimento,
    motivo,
  },
})
```

Toda troca de plano grava histórico em `historico_planos_empresas`.
